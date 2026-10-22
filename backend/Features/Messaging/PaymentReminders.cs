using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Messaging;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Messaging;

/*
 * OTOMATİK ÖDEME HATIRLATMA SMS'i (Hangfire görevi; günde bir kez DIŞARIDAN tetiklenir: Features/Jobs/JobTriggers.cs). Koruma katmanları:
 *  1. Kapalı gelir: PaymentReminders:Enabled=false. Ayrıca Sms:Enabled kapalıysa hiçbir şey yapılmaz (simüle kayıt da yazılmaz).
 *  2. Gecikme kuralı ReminderMath'te: kısmi ödenen kira, ödenen oran kadar süre "karşılanmış" sayılır.
 *  3. Aynı öğrenciye en az PaymentReminders:IntervalDays gün arayla (varsayılan 3: gönder, 2 gün bekle, tekrar gönder).
 *     Bekleme, veritabanındaki otomatik SMS kayıtlarından okunur; yeniden başlatma / aynı gün ikinci çalışma çift SMS atmaz.
 *  4. Kayıt ÖNCE yazılır, sonra sağlayıcı çağrılır. Bağlantı koparsa durum "belirsiz" kalır ve OTOMATİK TEKRAR YAPILMAZ
 *     (belirsiz kayıt da beklemeye sayılır).
 *  5. Manuel gönderimle aynı kapılar: SmsGate (tek sıra), günlük boy tavanı (Sms:DailyPartLimit), mesaj başına boy sınırı.
 *  6. Görev aynı anda iki kez çalışmaz (DisableConcurrentExecution).
 * Kayıtlar SmsBatch / SmsMessage tablolarında Purpose = "auto_payment_overdue" ile tutulur; yönetici panelinde ayrı listelenir.
 */
public static class AutoSms
{
    public const string Purpose = "auto_payment_overdue";
    public const string ActorName = "Otomatik hatırlatma";
}

public sealed class PaymentReminderJob(
    AppDbContext db, LedgerService ledgers, NetgsmClient netgsm, SmsGate gate, SmsComposeHandler composer, SmsReportHandler reports,
    IOptions<SmsOptions> smsOptions, IOptions<ReminderOptions> reminderOptions, ILogger<PaymentReminderJob> logger)
{
    public const string JobId = "payment-reminders";

    private sealed record Candidate(Enrollment Enrollment, string Phone, string Text, int Parts, DateOnly Oldest);

    [DisableConcurrentExecution(600)]
    [AutomaticRetry(Attempts = 1)]
    public async Task RunAsync(CancellationToken ct)
    {
        var r = reminderOptions.Value;
        var sms = smsOptions.Value;
        if (!r.Enabled) return;
        if (!sms.Enabled || !sms.HasCredentials)
        {
            logger.LogWarning("Ödeme hatırlatması atlandı: SMS servisi kapalı ya da yapılandırılmamış.");
            return;
        }

        var today = TurkeyClock.Today;
        var interval = Math.Max(1, r.IntervalDays);

        await RefreshRecentDeliveryAsync(ct);

        var enrollments = await db.Enrollments.AsNoTracking().Include(e => e.Student)
            .Where(e => e.Status == EnrollmentStatus.Approved || e.Status == EnrollmentStatus.Active)
            .ToListAsync(ct);
        if (enrollments.Count == 0) return;

        var ids = enrollments.Select(e => e.Id).ToList();
        var summaries = await ledgers.SummariesAsync(ids, today, ct);

        // Bekleme: aralık içinde (bugün dahil son N gün) otomatik SMS alan kayıtlar. Gönderilemeyen (reddedilen) kayıtlar sayılmaz.
        var since = TurkeyClock.StartOfDayUtc(today.AddDays(-(interval - 1)));
        var recent = (await (from m in db.SmsMessages.AsNoTracking()
                             join b in db.SmsBatches.AsNoTracking() on m.BatchId equals b.Id
                             where b.Purpose == AutoSms.Purpose && m.CreatedAt >= since && m.Status != SmsMessageStatus.Failed && m.EnrollmentId != null
                             select m.EnrollmentId!.Value).Distinct().ToListAsync(ct)).ToHashSet();

        var candidates = new List<Candidate>();
        var phones = new HashSet<string>();
        foreach (var e in enrollments)
        {
            if (recent.Contains(e.Id) || e.Student is null) continue;
            if (!summaries.TryGetValue(e.Id, out var summary)) continue;

            var overdue = summary.Items.Where(i => ReminderMath.IsOverdue(i, today)).OrderBy(i => i.Deadline).ToList();
            if (overdue.Count == 0) continue;

            var phone = e.Student.Phone;
            if (!TurkishFormats.IsMobile(phone) || !phones.Add(phone)) continue;

            var english = string.Equals(e.Student.Language, "en", StringComparison.OrdinalIgnoreCase);
            var first = overdue[0];
            var vars = new Dictionary<string, string>
            {
                ["ad"] = e.Student.FirstName,
                ["tutar"] = MessageAudienceHandler.FormatMoney(overdue.Sum(i => i.Remaining)),
                ["vade"] = MessageAudienceHandler.FormatDate(first.Deadline),
                ["kalem"] = MessageAudienceHandler.ChargeLabel(first, english)
            };
            var filled = MessageAudienceHandler.Fill(english ? r.TemplateEn : r.TemplateTr, vars);
            if (MessageAudienceHandler.HasUnfilled(filled))
            {
                logger.LogWarning("Ödeme hatırlatma şablonunda doldurulamayan değişken var; kayıt atlandı: {EnrollmentId}", e.Id);
                continue;
            }

            var analysis = SmsText.Analyze(filled);
            if (analysis.Error is not null || analysis.Parts > sms.MaxPartsPerMessage)
            {
                logger.LogWarning("Ödeme hatırlatma metni uygun değil ({Reason}); kayıt atlandı: {EnrollmentId}", analysis.Error ?? $"{analysis.Parts} boy", e.Id);
                continue;
            }

            candidates.Add(new Candidate(e, phone, analysis.Text, analysis.Parts, first.Deadline));
        }

        if (candidates.Count == 0) return;
        candidates = candidates.OrderBy(c => c.Oldest).Take(Math.Max(1, r.MaxPerRun)).ToList();

        if (!await gate.Lock.WaitAsync(TimeSpan.FromMinutes(2), ct))
            throw new InvalidOperationException("Başka bir SMS gönderimi sürüyor; hatırlatma görevi yeniden denenecek.");
        try
        {
            // Günlük boy tavanı: sığmayanlar bugün atlanır, yarın (bekleme kaydı olmadığı için) yeniden aday olur
            var budget = sms.DailyPartLimit - await composer.UsedTodayAsync(ct);
            var selected = new List<Candidate>();
            foreach (var c in candidates)
            {
                if (c.Parts > budget) break;
                budget -= c.Parts;
                selected.Add(c);
            }
            if (selected.Count < candidates.Count)
                logger.LogWarning("Günlük SMS tavanı nedeniyle {Skipped} hatırlatma ertelendi.", candidates.Count - selected.Count);

            foreach (var chunk in selected.Chunk(Math.Max(1, sms.MaxRecipientsPerSend)))
                await SendChunkAsync(chunk, ct);
        }
        finally
        {
            gate.Lock.Release();
        }
    }

    /// <summary>Son 3 günün otomatik gönderimlerinin teslim durumunu sağlayıcıdan çeker (yönetici listesi güncel kalsın). Hata görevi durdurmaz.</summary>
    private async Task RefreshRecentDeliveryAsync(CancellationToken ct)
    {
        try
        {
            var since = DateTime.UtcNow.AddDays(-3);
            var batches = await db.SmsBatches.AsNoTracking()
                .Where(b => b.Purpose == AutoSms.Purpose && b.CreatedAt >= since && b.Status == SmsBatchStatus.Sent && b.ProviderCampaignId != null)
                .Select(b => new { b.Id, JobId = b.ProviderCampaignId! })
                .ToListAsync(ct);
            foreach (var batch in batches)
            {
                var rows = await netgsm.ReportAsync(batch.JobId, ct);
                if (rows is { Count: > 0 }) await reports.ApplyAsync(batch.Id, rows, ct);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Otomatik SMS teslim durumları güncellenemedi.");
        }
    }

    private async Task SendChunkAsync(Candidate[] chunk, CancellationToken ct)
    {
        // 1) Önce kayıt
        var batch = new SmsBatch
        {
            Purpose = AutoSms.Purpose,
            Text = reminderOptions.Value.TemplateTr,
            RecipientCount = chunk.Length,
            TotalParts = chunk.Sum(c => c.Parts),
            CreatedByName = AutoSms.ActorName
        };
        db.SmsBatches.Add(batch);
        var rows = chunk.Select(c => new SmsMessage
        {
            BatchId = batch.Id,
            PeriodId = c.Enrollment.PeriodId,
            EnrollmentId = c.Enrollment.Id,
            ApplicationId = c.Enrollment.ApplicationId,
            StudentId = c.Enrollment.StudentId,
            RecipientName = $"{c.Enrollment.Student!.FirstName} {c.Enrollment.Student.LastName}".Trim(),
            Phone = TurkishFormats.ToInternational(c.Phone),
            Body = c.Text,
            Parts = c.Parts
        }).ToList();
        db.SmsMessages.AddRange(rows);
        await db.SaveChangesAsync(ct);

        // 2) Gönderim — iptal gelse bile yarıda bırakılmaz
        var result = await netgsm.SendAsync(chunk.Select(c => new NetgsmClient.OutgoingMessage(c.Text, c.Phone)).ToList(), CancellationToken.None);
        (batch.Status, var messageStatus) = result.Outcome switch
        {
            NetgsmClient.SendOutcome.Accepted => (SmsBatchStatus.Sent, SmsMessageStatus.Waiting),
            NetgsmClient.SendOutcome.Rejected => (SmsBatchStatus.Failed, SmsMessageStatus.Failed),
            _ => (SmsBatchStatus.Unknown, SmsMessageStatus.Unknown)
        };
        batch.ProviderCampaignId = result.JobId;
        batch.ProviderError = result.Error;
        batch.CompletedAt = DateTime.UtcNow;
        foreach (var row in rows)
        {
            row.Status = messageStatus;
            row.ProviderStatus = result.Outcome == NetgsmClient.SendOutcome.Rejected && result.Error is { } error ? (error.Length > 40 ? error[..40] : error) : null;
        }

        // 3) İletişim geçmişi (gönderilen ya da gönderilmiş olabilecek)
        if (batch.Status != SmsBatchStatus.Failed)
        {
            foreach (var row in rows)
            {
                db.ContactLogs.Add(new ContactLog
                {
                    PeriodId = row.PeriodId!.Value,
                    EnrollmentId = row.EnrollmentId!.Value,
                    Channel = ContactChannel.Sms,
                    Purpose = "payment_overdue",
                    Note = row.Body,
                    SmsMessageId = row.Id,
                    CreatedByName = AutoSms.ActorName
                });
            }
        }

        await db.SaveChangesAsync(CancellationToken.None);

        if (batch.Status == SmsBatchStatus.Failed)
            logger.LogError("Ödeme hatırlatma SMS'i sağlayıcı tarafından reddedildi: {Error}", result.Error);
        else if (batch.Status == SmsBatchStatus.Unknown)
            logger.LogWarning("Ödeme hatırlatma SMS'inin sonucu belirsiz: {BatchId}", batch.Id);
        else
            logger.LogInformation("Ödeme hatırlatması gönderildi: {Count} kişi, {Parts} boy.", rows.Count, batch.TotalParts);
    }
}

/// <summary>Yönetici paneli: otomatik gönderilen SMS kayıtları (en yeni önce; sıralama ve arama arayüzde)</summary>
public static class AutoSmsLog
{
    public record Row(Guid Id, DateTime At, Guid? EnrollmentId, string Name, string Phone, string Body, int Parts, SmsMessageStatus Status, string? ProviderStatus);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/sms/auto", async (Guid? enrollmentId, int? take, AppDbContext db, CancellationToken ct) =>
            {
                var query = from m in db.SmsMessages.AsNoTracking()
                            join b in db.SmsBatches.AsNoTracking() on m.BatchId equals b.Id
                            where b.Purpose == AutoSms.Purpose
                            select m;
                if (enrollmentId is { } id) query = query.Where(m => m.EnrollmentId == id);

                var rows = await query.OrderByDescending(m => m.CreatedAt).Take(Math.Clamp(take ?? 500, 1, 1000))
                    .Select(m => new Row(m.Id, m.CreatedAt, m.EnrollmentId, m.RecipientName, m.Phone, m.Body, m.Parts, m.Status, m.ProviderStatus))
                    .ToListAsync(ct);
                return Results.Ok(rows);
            });
    }
}
