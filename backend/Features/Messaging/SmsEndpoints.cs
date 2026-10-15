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
 * SMS (Verimor) — MALİYETLİ İŞLEM. Koruma katmanları:
 *  1. Yalnızca yönetici (fallback policy) · yönetici başına 10 dakikada 5 gönderim isteği (RatePolicies.Sms)
 *  2. Tek uç: tekli ve toplu SMS aynı istekle gider (Verimor'a da TEK istek). İstek başına en fazla Sms:MaxRecipientsPerSend alıcı.
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
        AppDbContext db, SmsComposeHandler composer, VerimorClient verimor, SmsGate gate, IdempotencyGuard idempotency,
        AuditWriter audit, IOptions<SmsOptions> options, ILogger<Handler> logger)
    {
        public async Task<Result<Response>> Handle(SmsCommand cmd, ClaimsPrincipal user, Guid? key, CancellationToken ct)
        {
            var o = options.Value;
            if (o.Enabled && (!o.HasCredentials || string.IsNullOrWhiteSpace(o.SourceAddr)))
                return Error.Conflict("SMS servisi yapılandırılmamış (Sms:Username / Password / SourceAddr).");

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
                    var outgoing = rows.Select((row, i) => new VerimorClient.OutgoingMessage(c.Messages[i].Text, row.Phone, row.Id.ToString("N"))).ToList();
                    var result = await verimor.SendAsync(batch.Id.ToString("N"), outgoing, CancellationToken.None);

                    (batch.Status, var messageStatus) = result.Outcome switch
                    {
                        VerimorClient.SendOutcome.Accepted => (SmsBatchStatus.Sent, SmsMessageStatus.Waiting),
                        VerimorClient.SendOutcome.Rejected => (SmsBatchStatus.Failed, SmsMessageStatus.Failed),
                        _ => (SmsBatchStatus.Unknown, SmsMessageStatus.Unknown)
                    };
                    batch.ProviderCampaignId = result.CampaignId;
                    batch.ProviderError = result.Error;
                    foreach (var row in rows)
                    {
                        row.Status = messageStatus;
                        row.ProviderStatus = result.Outcome == VerimorClient.SendOutcome.Rejected ? Cut(result.Error, 40) : null;
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
    public record Response(bool Enabled, bool Configured, string? SourceAddr, int MaxRecipientsPerSend, int MaxPartsPerMessage,
        int DailyPartLimit, int UsedToday, decimal? Balance, bool WebhookConfigured);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/sms/status", async (SmsComposeHandler composer, VerimorClient verimor, IMemoryCache cache,
                IOptions<SmsOptions> options, CancellationToken ct) =>
            {
                var o = options.Value;
                var configured = o.HasCredentials && !string.IsNullOrWhiteSpace(o.SourceAddr);
                decimal? balance = null;
                if (o.Enabled && configured)
                {
                    balance = await cache.GetOrCreateAsync("verimor:balance", async entry =>
                    {
                        entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2);
                        return await verimor.BalanceAsync(ct);
                    });
                }

                return Results.Ok(new Response(o.Enabled, configured, string.IsNullOrWhiteSpace(o.SourceAddr) ? null : o.SourceAddr,
                    o.MaxRecipientsPerSend, o.MaxPartsPerMessage, o.DailyPartLimit, await composer.UsedTodayAsync(ct), balance,
                    !string.IsNullOrWhiteSpace(o.WebhookSecret)));
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
/// Teslim raporlarını işler (push geri çağrısı ve elle "raporu yenile" ortak). Mesaj, bizim verdiğimiz mesaj kimliğiyle
/// (message_custom_id) bulunur; bulunamazsa sağlayıcı mesaj no ile. Simüle edilmiş mesajlara dokunulmaz.
/// </summary>
public class SmsReportHandler(AppDbContext db)
{
    public static SmsMessageStatus Map(string? status) => status?.ToUpperInvariant() switch
    {
        "SENDING" or "WAITING" => SmsMessageStatus.Waiting,
        "DELIVERED" or "SENT" => SmsMessageStatus.Delivered,
        "NOT_DELIVERED" => SmsMessageStatus.NotDelivered,
        "EXPIRED" => SmsMessageStatus.Expired,
        "REJECTED" or "DOUBLE_SEND_ERROR" or "BLACKLISTED_DESTINATION_ADDRESS" or "NOT_ALLOWED_BY_IYS" => SmsMessageStatus.Rejected,
        null or "" => SmsMessageStatus.Unknown,
        _ => SmsMessageStatus.Failed
    };

    public async Task<int> ApplyAsync(IReadOnlyCollection<VerimorClient.Report> reports, CancellationToken ct)
    {
        var outbound = reports.Where(r => r.Type is null || r.Type == "outbound").Take(5000).ToList();
        if (outbound.Count == 0) return 0;

        var ids = outbound.Select(r => Guid.TryParseExact(r.MessageCustomId, "N", out var g) ? g : Guid.Empty).Where(g => g != Guid.Empty).Distinct().ToList();
        var providerIds = outbound.Where(r => !string.IsNullOrEmpty(r.MessageId)).Select(r => r.MessageId!).Distinct().ToList();

        var messages = await db.SmsMessages
            .Where(x => ids.Contains(x.Id) || (x.ProviderMessageId != null && providerIds.Contains(x.ProviderMessageId)))
            .ToListAsync(ct);

        var updated = 0;
        foreach (var report in outbound)
        {
            var message = Guid.TryParseExact(report.MessageCustomId, "N", out var id)
                ? messages.FirstOrDefault(m => m.Id == id)
                : messages.FirstOrDefault(m => m.ProviderMessageId == report.MessageId);
            if (message is null || message.Status == SmsMessageStatus.Simulated) continue;

            message.Status = Map(report.Status);
            message.ProviderStatus = Cut(report.Status, 40);
            message.ProviderMessageId = Cut(report.MessageId, 40) ?? message.ProviderMessageId;
            message.GsmError = Cut(report.GsmError, 20);
            message.Credits = report.Credits;
            message.SentAt = ParseLocal(report.SentAt) ?? message.SentAt;
            message.DoneAt = ParseLocal(report.DoneAt) ?? message.DoneAt;
            message.UpdatedAt = DateTime.UtcNow;
            updated++;
        }

        // "Belirsiz" kalan bir kampanya için rapor geldiyse, kampanya aslında gönderilmiştir
        var batchIds = messages.Where(m => m.UpdatedAt is not null).Select(m => m.BatchId).Distinct().ToList();
        var unknown = await db.SmsBatches.Where(b => batchIds.Contains(b.Id) && b.Status == SmsBatchStatus.Unknown).ToListAsync(ct);
        foreach (var b in unknown) b.Status = SmsBatchStatus.Sent;

        await db.SaveChangesAsync(ct);
        return updated;
    }

    /// <summary>Verimor tarihleri Türkiye saatiyle gelir ("2026-10-15 16:06:00" ya da ISO 8601)</summary>
    private static DateTime? ParseLocal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var hasZone = value.Contains('+', StringComparison.Ordinal) || value.EndsWith('Z');
        if (hasZone && DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dto))
            return dto.UtcDateTime;
        return DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var local)
            ? TurkeyClock.LocalToUtc(local)
            : null;
    }

    private static string? Cut(string? value, int max) => value is null ? null : value.Length > max ? value[..max] : value;
}

/// <summary>
/// Teslim raporu PUSH geri çağrısı (Verimor OİM > SMS Ayarlarım > rapor URL'si):
///   https://API-ADRESİNİZ/api/webhooks/verimor/{Sms:WebhookSecret}
/// Verimor isteği imzalamaz; bu yüzden adres gizli anahtar taşır (sabit zamanlı karşılaştırma). Anahtar boşsa uç kapalıdır (404).
/// Verimor 200 bekler; alamazsa 5 dakika arayla 3 kez dener.
/// </summary>
public static class VerimorWebhook
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/webhooks/verimor/{secret}", async (string secret, List<VerimorClient.Report>? reports,
                    SmsReportHandler handler, IOptions<SmsOptions> options, CancellationToken ct) =>
                {
                    var expected = options.Value.WebhookSecret;
                    if (string.IsNullOrWhiteSpace(expected) ||
                        !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(expected)))
                        return Results.NotFound();

                    if (reports is { Count: > 0 }) await handler.ApplyAsync(reports, ct);
                    return Results.Text("OK");
                })
                .AllowAnonymous()
                .RequireRateLimiting(RatePolicies.Webhook)
                .WithMetadata(new RequestSizeLimitAttribute(2 * 1024 * 1024));
    }
}

/// <summary>Elle "raporu yenile": kampanyanın teslim durumunu Verimor'dan çeker (Verimor sınırı: dakikada 20 rapor sorgusu)</summary>
public static class SyncSmsBatch
{
    public record Response(int Updated);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/sms/batches/{id:guid}/sync", async (Guid id, AppDbContext db, VerimorClient verimor,
                    SmsReportHandler handler, IOptions<SmsOptions> options, CancellationToken ct) =>
                {
                    var batch = await db.SmsBatches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
                    if (batch is null) return Error.NotFound("SMS gönderimi bulunamadı.").ToProblem();
                    if (batch.Status is SmsBatchStatus.Simulated or SmsBatchStatus.Failed or SmsBatchStatus.Pending)
                        return Error.Conflict("Bu gönderim için sağlayıcı raporu yok.").ToProblem();
                    if (!options.Value.Enabled) return Error.Conflict("SMS servisi kapalı.").ToProblem();

                    var reports = await verimor.StatusAsync(batch.Id.ToString("N"), ct);
                    if (reports is null) return Error.Unexpected("Sağlayıcıdan rapor alınamadı. Biraz sonra tekrar deneyin.").ToProblem();
                    return Results.Ok(new Response(await handler.ApplyAsync(reports, ct)));
                })
                .RequireRateLimiting(RatePolicies.Sms);
    }
}
