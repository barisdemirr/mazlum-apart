using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Messaging;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Messaging;

/*
 * SMS (Netgsm) — MALİYETLİ İŞLEM. Koruma katmanları:
 *  1. Yalnızca yönetici (fallback policy) · yönetici başına 10 dakikada 5 gönderim isteği (RatePolicies.Sms)
 *  2. Tek uç: tekli ve toplu SMS aynı istekle gider (Netgsm'e de TEK istek). İstek başına en fazla Sms:MaxRecipientsPerSend alıcı.
 *  3. Alıcılar yalnızca veritabanındaki öğrenci/başvurulardır; numara istemciden alınmaz. Aynı numaraya iki kez gönderilmez.
 *  4. Mesaj başına en fazla Sms:MaxPartsPerMessage boy; günlük toplam boy tavanı Sms:DailyPartLimit (tüm yöneticiler).
 *  5. Idempotency-Key zorunlu: çift tıklama iki kez göndermez. Gönderimler tek sırayla işlenir (SmsGate) → tavan aşılamaz.
 *  6. Kayıt ÖNCE yazılır, sonra sağlayıcı çağrılır. Bağlantı koparsa durum "belirsiz" kalır ve OTOMATİK TEKRAR YAPILMAZ.
 *  7. Şifre gibi gizli değişkenler kayıtlara "******" olarak yazılır.
 *  8. Önizleme ucu hiçbir şey göndermez; arayüz göndermeden önce kişi sayısını ve boy toplamını gösterir.
 */

/// <summary>Gönderimleri sıraya koyar: aynı anda iki gönderim günlük tavanı birlikte aşamaz</summary>
public sealed class SmsGate
{
    public SemaphoreSlim Lock { get; } = new(1, 1);
}

/// <summary>lang: şablonun dili (tr | en) — {kalem} gibi değişkenler bu dilde dolar</summary>
public record SmsCommand(string? Purpose, string? Text, string? Lang, List<RecipientInput>? Recipients);

public record SmsPreviewRow(Guid? EnrollmentId, Guid? ApplicationId, string Name, string Phone, string Text, int Parts);

public record SmsPreview(List<SmsPreviewRow> Messages, List<SkippedRecipient> Skipped, int TotalParts, int UsedToday, int DailyLimit, bool Enabled);

/// <summary>Önizleme ve gönderimin ortak hazırlığı: alıcıları çöz, metni doldur, boy hesapla, sorunluları ayıkla</summary>
public class SmsComposeHandler(AppDbContext db, MessageAudienceHandler audience, IOptions<SmsOptions> options)
{
    public sealed record Prepared(ResolvedRecipient Recipient, string Text, string MaskedText, int Parts);

    public sealed record Composition(string Purpose, string Template, List<Prepared> Messages, List<SkippedRecipient> Skipped)
    {
        public int TotalParts => Messages.Sum(m => m.Parts);
    }

    public async Task<Result<Composition>> ComposeAsync(SmsCommand cmd, CancellationToken ct)
    {
        var o = options.Value;
        var purpose = cmd.Purpose?.Trim() ?? "";
        var template = cmd.Text?.Trim() ?? "";
        var recipients = cmd.Recipients ?? [];

        var v = new Validator()
            .Must("purpose", MessagePurposes.All.Contains(purpose), "Mesaj amacını seçin.")
            .Required("text", template, "Mesaj metnini yazın.")
            .MaxLength("text", template, 1000)
            .Must("recipients", recipients.Count > 0, "En az bir alıcı seçin.")
            .Must("recipients", recipients.Count <= o.MaxRecipientsPerSend, $"Bir seferde en fazla {o.MaxRecipientsPerSend} kişiye SMS gönderilebilir.");
        if (!v.IsValid) return v.ToFailure<Composition>();

        var (found, skipped) = await audience.ResolveAsync(recipients, allowApplications: true, ct);
        var messages = new List<Prepared>();
        var phones = new HashSet<string>();

        var english = string.Equals(cmd.Lang, "en", StringComparison.OrdinalIgnoreCase);
        foreach (var r in found)
        {
            if (!TurkishFormats.IsMobile(r.Phone)) { skipped.Add(Skip(r, "Telefon numarası geçersiz")); continue; }

            var vars = english ? r.VarsEn : r.VarsTr;
            var filled = MessageAudienceHandler.Fill(template, vars);
            if (MessageAudienceHandler.HasUnfilled(filled)) { skipped.Add(Skip(r, "Doldurulmamış değişken var")); continue; }

            var analysis = SmsText.Analyze(filled);
            if (analysis.Error is not null) { skipped.Add(Skip(r, analysis.Error)); continue; }
            if (analysis.Parts > o.MaxPartsPerMessage) { skipped.Add(Skip(r, $"Mesaj {analysis.Parts} SMS boyu; en fazla {o.MaxPartsPerMessage} olabilir")); continue; }

            if (!phones.Add(r.Phone)) { skipped.Add(Skip(r, "Aynı numaraya bu gönderimde zaten mesaj var")); continue; }

            var masked = SmsText.Analyze(MessageAudienceHandler.Fill(template, vars, r.SecretKeys)).Text;
            messages.Add(new Prepared(r, analysis.Text, masked, analysis.Parts));
        }

        return new Composition(purpose, template, messages, skipped);
    }

    private static SkippedRecipient Skip(ResolvedRecipient r, string reason) => new(r.EnrollmentId, r.ApplicationId, r.Name, reason);

    /// <summary>Bugün (Türkiye günü) gerçekten gönderilmiş/gönderilmiş olabilecek SMS boyu. Simülasyon ve reddedilenler sayılmaz.</summary>
    public async Task<int> UsedTodayAsync(CancellationToken ct)
    {
        var start = TurkeyClock.StartOfDayUtc(TurkeyClock.Today);
        return await db.SmsMessages.Where(x => x.CreatedAt >= start && x.Status != SmsMessageStatus.Failed && x.Status != SmsMessageStatus.Simulated)
            .SumAsync(x => (int?)x.Parts, ct) ?? 0;
    }

    public SmsPreview ToPreview(Composition c, int usedToday) =>
        new(c.Messages.Select(m => new SmsPreviewRow(m.Recipient.EnrollmentId, m.Recipient.ApplicationId, m.Recipient.Name, m.Recipient.Phone, m.MaskedText, m.Parts)).ToList(),
            c.Skipped, c.TotalParts, usedToday, options.Value.DailyPartLimit, options.Value.Enabled);
}

/// <summary>Önizleme: hiçbir şey göndermez, kayıt açmaz</summary>
public static class PreviewSms
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/sms/preview", async (SmsCommand cmd, SmsComposeHandler composer, CancellationToken ct) =>
            {
                var composed = await composer.ComposeAsync(cmd, ct);
                if (!composed.IsSuccess) return composed.Error!.ToProblem();
                return Results.Ok(composer.ToPreview(composed.Value!, await composer.UsedTodayAsync(ct)));
            });
    }
}

/// <summary>SMS gönderimi — tekli ve toplu için TEK uç</summary>
public static class SendSms
{
    public record SentRow(Guid MessageId, Guid? EnrollmentId, Guid? ApplicationId, string Name, int Parts, SmsMessageStatus Status);

    public record Response(Guid BatchId, SmsBatchStatus Status, string? Error, List<SentRow> Sent, List<SkippedRecipient> Skipped, int TotalParts);

    public class Handler(
        AppDbContext db, SmsComposeHandler composer, NetgsmClient netgsm, SmsGate gate, IdempotencyGuard idempotency,
        AuditWriter audit, IOptions<SmsOptions> options, ILogger<Handler> logger)
    {
        public async Task<Result<Response>> Handle(SmsCommand cmd, ClaimsPrincipal user, Guid? key, CancellationToken ct)
        {
            var o = options.Value;
            if (o.Enabled && !o.HasCredentials)
                return Error.Conflict("SMS servisi yapılandırılmamış (Sms:UserCode / Password / MsgHeader).");

            var composed = await composer.ComposeAsync(cmd, ct);
            if (!composed.IsSuccess) return composed.Error!;
            var c = composed.Value!;
            if (c.Messages.Count == 0)
                return Error.Field("recipients", $"Gönderilebilecek alıcı yok: {c.Skipped.FirstOrDefault()?.Reason ?? "geçersiz mesaj"}.");

            if (!await gate.Lock.WaitAsync(TimeSpan.FromSeconds(30), ct))
                return Error.TooManyRequests("Başka bir SMS gönderimi sürüyor. Biraz sonra tekrar deneyin.");
            try
            {
                if (await idempotency.BeginAsync(key, "sms.send", user.GetUserId(), ct) is { } dup) return dup;

                var used = await composer.UsedTodayAsync(ct);
                if (o.Enabled && used + c.TotalParts > o.DailyPartLimit)
                    return Error.Conflict($"Günlük SMS sınırı aşılıyor: bugün {used} / {o.DailyPartLimit} boy kullanıldı, bu gönderim {c.TotalParts} boy.");

                // 1) Önce kayıt: sağlayıcı çağrısı sırasında bir şey olursa bile ne gönderilmeye çalışıldığı bilinir
                var batch = new SmsBatch
                {
                    Purpose = c.Purpose,
                    Text = c.Template,
                    RecipientCount = c.Messages.Count,
                    SkippedCount = c.Skipped.Count,
                    TotalParts = c.TotalParts,
                    CreatedById = user.GetUserId(),
                    CreatedByName = user.GetDisplayName()
                };
                db.SmsBatches.Add(batch);
                var rows = c.Messages.Select(m => new SmsMessage
                {
                    BatchId = batch.Id,
                    PeriodId = m.Recipient.PeriodId,
                    EnrollmentId = m.Recipient.EnrollmentId,
                    ApplicationId = m.Recipient.ApplicationId,
                    StudentId = m.Recipient.StudentId,
                    RecipientName = m.Recipient.Name,
                    Phone = TurkishFormats.ToInternational(m.Recipient.Phone),
                    Body = m.MaskedText,
                    Parts = m.Parts
                }).ToList();
                db.SmsMessages.AddRange(rows);
                await db.SaveChangesAsync(ct);

                // 2) Gönderim — istemci bağlantıyı kesse bile yarıda bırakılmaz (CancellationToken.None)
                if (!o.Enabled)
                {
                    batch.Status = SmsBatchStatus.Simulated;
                    foreach (var row in rows) row.Status = SmsMessageStatus.Simulated;
                }
                else
                {
                    // Netgsm numarayı 10 haneli (5XXXXXXXXX) bekler; kayıtlı numara 905... biçimindedir
                    var outgoing = rows.Select((row, i) => new NetgsmClient.OutgoingMessage(c.Messages[i].Text, TurkishFormats.NormalizeMobile(row.Phone) ?? row.Phone)).ToList();
                    var result = await netgsm.SendAsync(outgoing, CancellationToken.None);

                    (batch.Status, var messageStatus) = result.Outcome switch
                    {
                        NetgsmClient.SendOutcome.Accepted => (SmsBatchStatus.Sent, SmsMessageStatus.Waiting),
                        NetgsmClient.SendOutcome.Rejected => (SmsBatchStatus.Failed, SmsMessageStatus.Failed),
                        _ => (SmsBatchStatus.Unknown, SmsMessageStatus.Unknown)
                    };
                    batch.ProviderCampaignId = result.JobId; // Netgsm görev no (jobid): rapor sorgusunun anahtarı
                    batch.ProviderError = result.Error;
                    foreach (var row in rows)
                    {
                        row.Status = messageStatus;
                        row.ProviderStatus = result.Outcome == NetgsmClient.SendOutcome.Rejected ? Cut(result.Error, 40) : null;
                    }
                }
                batch.CompletedAt = DateTime.UtcNow;

                // 3) İletişim geçmişi: kayıtlı öğrencilere giden (ya da gitmiş olabilecek) her SMS
                if (batch.Status is SmsBatchStatus.Sent or SmsBatchStatus.Simulated or SmsBatchStatus.Unknown)
                {
                    foreach (var row in rows.Where(r => r.EnrollmentId is not null && r.PeriodId is not null))
                    {
                        db.ContactLogs.Add(new ContactLog
                        {
                            PeriodId = row.PeriodId!.Value,
                            EnrollmentId = row.EnrollmentId!.Value,
                            Channel = ContactChannel.Sms,
                            Purpose = c.Purpose,
                            Note = row.Body,
                            SmsMessageId = row.Id,
                            CreatedById = batch.CreatedById,
                            CreatedByName = batch.CreatedByName
                        });
                    }
                }

                // 4) Ön başvurular: SMS giden (ya da gitmiş olabilecek) kişiler "bilgilendirildi" olur
                var preIds = c.Messages.Where(m => m.Recipient.PreRegistrationId is not null).Select(m => m.Recipient.PreRegistrationId!.Value).ToList();
                if (preIds.Count > 0 && batch.Status is SmsBatchStatus.Sent or SmsBatchStatus.Simulated or SmsBatchStatus.Unknown)
                {
                    var contacted = await db.PreRegistrations.Where(x => preIds.Contains(x.Id)).ToListAsync(CancellationToken.None);
                    foreach (var pre in contacted)
                    {
                        pre.ContactedAt = DateTime.UtcNow;
                        if (pre.Status == PreRegistrationStatus.New) pre.Status = PreRegistrationStatus.Contacted;
                    }
                }

                audit.Add("sms.send", "sms", batch.Id, rows.FirstOrDefault()?.PeriodId,
                    after: new { purpose = c.Purpose, recipients = rows.Count, skipped = c.Skipped.Count, parts = c.TotalParts, status = batch.Status, error = batch.ProviderError });
                await db.SaveChangesAsync(CancellationToken.None);

                if (batch.Status == SmsBatchStatus.Unknown)
                    logger.LogWarning("SMS gönderim sonucu belirsiz: {BatchId}", batch.Id);

                return new Response(batch.Id, batch.Status, batch.ProviderError,
                    rows.Select(r => new SentRow(r.Id, r.EnrollmentId, r.ApplicationId, r.RecipientName, r.Parts, r.Status)).ToList(),
                    c.Skipped, c.TotalParts);
            }
            finally
            {
                gate.Lock.Release();
            }
        }

        private static string? Cut(string? value, int max) => value is null ? null : value.Length > max ? value[..max] : value;
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/sms/send", async (SmsCommand cmd, [FromHeader(Name = IdempotencyGuard.Header)] Guid? key,
                    ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                {
                    var result = await h.Handle(cmd, user, key, ct);
                    if (!result.IsSuccess) return result.Error!.ToProblem();
                    // Sağlayıcı reddettiyse istemci bunu hata olarak görmeli (kayıt yine de tutuldu)
                    return result.Value!.Status == SmsBatchStatus.Failed
                        ? Results.Json(result.Value, statusCode: StatusCodes.Status502BadGateway)
                        : Results.Ok(result.Value);
                })
                .RequireRateLimiting(RatePolicies.Sms);
    }
}

/// <summary>SMS servis durumu: açık mı, sınırlar, bugün kullanılan, kalan kredi (2 dk önbellek)</summary>
public static class GetSmsStatus
{
    public record Response(bool Enabled, bool Configured, string? MsgHeader, int MaxRecipientsPerSend, int MaxPartsPerMessage,
        int DailyPartLimit, int UsedToday, decimal? Balance);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/sms/status", async (SmsComposeHandler composer, NetgsmClient netgsm, IMemoryCache cache,
                IOptions<SmsOptions> options, CancellationToken ct) =>
            {
                var o = options.Value;
                var configured = o.HasCredentials;
                decimal? balance = null;
                if (o.Enabled && configured)
                {
                    balance = await cache.GetOrCreateAsync("netgsm:balance", async entry =>
                    {
                        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2);
                        return await netgsm.BalanceAsync(ct);
                    });
                }

                return Results.Ok(new Response(o.Enabled, configured, string.IsNullOrWhiteSpace(o.MsgHeader) ? null : o.MsgHeader,
                    o.MaxRecipientsPerSend, o.MaxPartsPerMessage, o.DailyPartLimit, await composer.UsedTodayAsync(ct), balance));
            });
    }
}

/// <summary>Gönderim geçmişi (kampanyalar) ve bir kampanyanın mesajları</summary>
public static class SmsHistory
{
    public record BatchRow(Guid Id, DateTime CreatedAt, string Purpose, string Text, int RecipientCount, int SkippedCount, int TotalParts,
        SmsBatchStatus Status, string? ProviderError, string? CreatedBy, int Delivered, int Failed);

    public record MessageRow(Guid Id, Guid? EnrollmentId, Guid? ApplicationId, string Name, string Phone, string Body, int Parts,
        SmsMessageStatus Status, string? ProviderStatus, string? GsmError, int? Credits, DateTime? DoneAt);

    public record Detail(BatchRow Batch, List<MessageRow> Messages);

    public class Handler(AppDbContext db)
    {
        private static readonly SmsMessageStatus[] FailedStates =
            [SmsMessageStatus.Failed, SmsMessageStatus.NotDelivered, SmsMessageStatus.Expired, SmsMessageStatus.Rejected];

        public async Task<PagedResult<BatchRow>> List(int page, int size, CancellationToken ct)
        {
            var total = await db.SmsBatches.CountAsync(ct);
            var batches = await db.SmsBatches.AsNoTracking().OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * size).Take(size).ToListAsync(ct);
            var ids = batches.Select(b => b.Id).ToList();
            var counts = await db.SmsMessages.AsNoTracking().Where(x => ids.Contains(x.BatchId))
                .GroupBy(x => new { x.BatchId, x.Status })
                .Select(g => new { g.Key.BatchId, g.Key.Status, Count = g.Count() })
                .ToListAsync(ct);

            var rows = batches.Select(b => ToRow(b,
                counts.Where(x => x.BatchId == b.Id && x.Status == SmsMessageStatus.Delivered).Sum(x => x.Count),
                counts.Where(x => x.BatchId == b.Id && FailedStates.Contains(x.Status)).Sum(x => x.Count))).ToList();
            return new PagedResult<BatchRow>(rows, total, page, size);
        }

        public async Task<Result<Detail>> Get(Guid id, CancellationToken ct)
        {
            var batch = await db.SmsBatches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (batch is null) return Error.NotFound("SMS gönderimi bulunamadı.");
            var messages = await db.SmsMessages.AsNoTracking().Where(x => x.BatchId == id).OrderBy(x => x.RecipientName).ToListAsync(ct);
            return new Detail(
                ToRow(batch, messages.Count(m => m.Status == SmsMessageStatus.Delivered), messages.Count(m => FailedStates.Contains(m.Status))),
                messages.Select(m => new MessageRow(m.Id, m.EnrollmentId, m.ApplicationId, m.RecipientName, m.Phone, m.Body, m.Parts,
                    m.Status, m.ProviderStatus, m.GsmError, m.Credits, m.DoneAt)).ToList());
        }

        private static BatchRow ToRow(SmsBatch b, int delivered, int failed) =>
            new(b.Id, b.CreatedAt, b.Purpose, b.Text, b.RecipientCount, b.SkippedCount, b.TotalParts, b.Status, b.ProviderError,
                b.CreatedByName, delivered, failed);
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/admin/sms/batches", async (int? page, int? pageSize, Handler h, CancellationToken ct) =>
            {
                var (p, s) = Paging.Normalize(page, pageSize, 20, 100);
                return Results.Ok(await h.List(p, s, ct));
            });
            app.MapGet("/api/admin/sms/batches/{id:guid}", async (Guid id, Handler h, CancellationToken ct) => (await h.Get(id, ct)).ToOk());
        }
    }
}

/// <summary>
/// Teslim raporlarını işler ("raporu yenile"). Netgsm teslim raporunu kendisi göndermez; görev (jobid) ile sorgulanır.
/// Rapor satırları alıcı telefonuyla eşleşir (bir gönderimde aynı numara yalnızca bir kez bulunur). Simüle mesajlara dokunulmaz.
/// </summary>
public class SmsReportHandler(AppDbContext db)
{
    /// <summary>Netgsm teslim durum kodları: 0 bekliyor · 1 iletildi · 2 zaman aşımı · 3 hatalı/kısıtlı numara · 4 operatöre gönderilemedi · 11 operatör reddetti · 12 gönderim hatası · 13 mükerrer · 103 görev tamamen başarısız</summary>
    public static SmsMessageStatus Map(string? code) => code?.Trim().ToLowerInvariant() switch
    {
        "0" or "bekliyor" => SmsMessageStatus.Waiting,
        "1" or "iletildi" => SmsMessageStatus.Delivered,
        "2" or "zaman aşımı" => SmsMessageStatus.Expired,
        "3" or "11" or "13" => SmsMessageStatus.Rejected,
        "4" or "12" or "103" => SmsMessageStatus.Failed,
        _ => SmsMessageStatus.Unknown
    };

    public async Task<int> ApplyAsync(Guid batchId, IReadOnlyCollection<NetgsmClient.Report> reports, CancellationToken ct)
    {
        if (reports.Count == 0) return 0;

        var messages = await db.SmsMessages.Where(x => x.BatchId == batchId).ToListAsync(ct);
        var byPhone = messages.GroupBy(m => PhoneKey(m.Phone)).ToDictionary(g => g.Key, g => g.First());

        var updated = 0;
        foreach (var report in reports)
        {
            if (!byPhone.TryGetValue(PhoneKey(report.Phone), out var message) || message.Status == SmsMessageStatus.Simulated) continue;

            var status = Map(report.StatusCode ?? report.Status);
            message.Status = status;
            message.ProviderStatus = Cut(report.StatusCode ?? report.Status, 40);
            message.GsmError = Cut(report.ErrorCode, 20);
            message.Credits = report.Credits ?? message.Credits;
            if (status != SmsMessageStatus.Waiting) message.DoneAt = ParseLocal(report.Date) ?? message.DoneAt;
            message.UpdatedAt = DateTime.UtcNow;
            updated++;
        }

        // "Belirsiz" kalan bir gönderim için rapor geldiyse, gönderim aslında yapılmıştır
        if (updated > 0)
        {
            var batch = await db.SmsBatches.FirstOrDefaultAsync(b => b.Id == batchId && b.Status == SmsBatchStatus.Unknown, ct);
            if (batch is not null) batch.Status = SmsBatchStatus.Sent;
        }

        await db.SaveChangesAsync(ct);
        return updated;
    }

    /// <summary>Numaraları karşılaştırmak için son 10 hane (905551234567 / 05551234567 / 5551234567 aynı sayılır)</summary>
    private static string PhoneKey(string? phone)
    {
        var digits = new string((phone ?? "").Where(char.IsAsciiDigit).ToArray());
        return digits.Length > 10 ? digits[^10..] : digits;
    }

    private static readonly string[] DateFormats =
        ["dd.MM.yyyy HH:mm:ss", "dd.MM.yyyy HH:mm", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd'T'HH:mm:ss", "dd/MM/yyyy HH:mm:ss"];

    /// <summary>Netgsm tarihleri Türkiye saatiyle gelir</summary>
    private static DateTime? ParseLocal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return DateTime.TryParseExact(value.Trim(), DateFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var local)
            ? TurkeyClock.LocalToUtc(local)
            : null;
    }

    private static string? Cut(string? value, int max) => value is null ? null : value.Length > max ? value[..max] : value;
}

/// <summary>Elle "raporu yenile": gönderimin teslim durumunu Netgsm'den çeker (görev no ile)</summary>
public static class SyncSmsBatch
{
    public record Response(int Updated);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/sms/batches/{id:guid}/sync", async (Guid id, AppDbContext db, NetgsmClient netgsm,
                    SmsReportHandler handler, IOptions<SmsOptions> options, CancellationToken ct) =>
                {
                    var batch = await db.SmsBatches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
                    if (batch is null) return Error.NotFound("SMS gönderimi bulunamadı.").ToProblem();
                    if (batch.Status is SmsBatchStatus.Simulated or SmsBatchStatus.Failed or SmsBatchStatus.Pending)
                        return Error.Conflict("Bu gönderim için sağlayıcı raporu yok.").ToProblem();
                    if (!options.Value.Enabled) return Error.Conflict("SMS servisi kapalı.").ToProblem();
                    if (string.IsNullOrWhiteSpace(batch.ProviderCampaignId))
                        return Error.Conflict("Sağlayıcı görev numarası alınamadığı için rapor sorgulanamaz. Netgsm panelinden kontrol edin.").ToProblem();

                    var reports = await netgsm.ReportAsync(batch.ProviderCampaignId, ct);
                    if (reports is null) return Error.Unexpected("Sağlayıcıdan rapor alınamadı. Biraz sonra tekrar deneyin.").ToProblem();
                    return Results.Ok(new Response(await handler.ApplyAsync(batch.Id, reports, ct)));
                })
                .RequireRateLimiting(RatePolicies.Sms);
    }
}
