using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Messaging;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Messaging;

/*
 * OTOMATİK "ÖDEMENİZ ALINDI" SMS'i: panelden tahsilat girilince (RecordPayment) Hangfire kuyruğuna atılır, arka planda gönderilir.
 *  - Metin: Mesaj Şablonları > "Ödeme alındı (otomatik SMS)" (anahtar payment_received). Öğrencinin diline göre TR/EN.
 *    Değişkenler: {ad} {tutar} (tahsilat tutarı) {tarih} (tahsilat tarihi) {kalan} (tahsilattan sonra kalan toplam borç)
 *  - Kapatma: appsettings PaymentReceiptSms:Enabled=false. Sms:Enabled kapalıysa hiçbir şey gönderilmez.
 *  - Geriye dönük girilen eski tahsilatlara SMS gitmez: tahsilat tarihi bugünden PaymentReceiptSms:MaxAgeDays günden eskiyse atlanır.
 *  - Kuyruğa girdiği sırada iptal edilmiş tahsilata gönderilmez.
 *  - Ödeme hatırlatmasıyla aynı kapılar: SmsGate (tek sıra), günlük boy tavanı, mesaj başına boy sınırı.
 *    Kayıt ÖNCE yazılır, sonra sağlayıcı çağrılır; görev OTOMATİK TEKRAR EDİLMEZ (aynı tahsilata iki SMS gitmesin).
 * Kayıtlar SmsBatch / SmsMessage tablolarında Purpose = "auto_payment_received" ile tutulur; panelde Otomatik SMS listesinde görünür.
 */
public class PaymentReceiptOptions
{
    public bool Enabled { get; set; }

    /// <summary>Tahsilat tarihi bugünden en çok kaç gün önce olabilir (daha eski kayıtlar için SMS gitmez)</summary>
    public int MaxAgeDays { get; set; } = 7;
}

public static class ReceiptSms
{
    public const string Purpose = "auto_payment_received";
    public const string TemplateKey = "payment_received";
    public const string ContactPurpose = "payment_received";
    public const string ActorName = "Otomatik ödeme bildirimi";
}

public sealed class PaymentReceiptSmsJob(
    AppDbContext db, LedgerService ledgers, NetgsmClient netgsm, SmsGate gate, SmsComposeHandler composer,
    IOptions<SmsOptions> smsOptions, IOptions<PaymentReceiptOptions> receiptOptions, ILogger<PaymentReceiptSmsJob> logger)
{
    [AutomaticRetry(Attempts = 0)]
    public async Task RunAsync(Guid paymentId, CancellationToken ct)
    {
        var o = receiptOptions.Value;
        var sms = smsOptions.Value;
        if (!o.Enabled) return;
        if (!sms.Enabled || !sms.HasCredentials)
        {
            logger.LogWarning("Ödeme alındı SMS'i atlandı: SMS servisi kapalı ya da yapılandırılmamış.");
            return;
        }

        var payment = await db.Payments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == paymentId, ct);
        if (payment is null || payment.Kind != PaymentKind.Collection || payment.CancelledAt is not null) return;

        var today = TurkeyClock.Today;
        if (payment.Date < today.AddDays(-Math.Max(0, o.MaxAgeDays))) return; // geriye dönük girilen eski tahsilat

        var enrollment = await db.Enrollments.AsNoTracking().Include(e => e.Student).FirstOrDefaultAsync(e => e.Id == payment.EnrollmentId, ct);
        var student = enrollment?.Student;
        if (enrollment is null || student is null) return;
        if (!TurkishFormats.IsMobile(student.Phone))
        {
            logger.LogInformation("Ödeme alındı SMS'i atlandı: öğrencinin cep telefonu yok ({EnrollmentId}).", enrollment.Id);
            return;
        }

        var template = await db.MessageTemplates.AsNoTracking().FirstOrDefaultAsync(x => x.Key == ReceiptSms.TemplateKey, ct);
        if (template is null || string.IsNullOrWhiteSpace(template.BodyTr))
        {
            logger.LogWarning("Ödeme alındı SMS'i atlandı: \"{Key}\" mesaj şablonu bulunamadı.", ReceiptSms.TemplateKey);
            return;
        }

        var english = string.Equals(student.Language, "en", StringComparison.OrdinalIgnoreCase);
        var summaries = await ledgers.SummariesAsync([enrollment.Id], today, ct);
        var remaining = summaries.TryGetValue(enrollment.Id, out var summary) ? summary.Remaining : 0m;
        var vars = new Dictionary<string, string>
        {
            ["ad"] = student.FirstName,
            ["tutar"] = MessageAudienceHandler.FormatMoney(payment.Amount),
            ["tarih"] = MessageAudienceHandler.FormatDate(payment.Date),
            ["kalan"] = MessageAudienceHandler.FormatMoney(remaining)
        };
        var body = english && !string.IsNullOrWhiteSpace(template.BodyEn) ? template.BodyEn : template.BodyTr;
        var filled = MessageAudienceHandler.Fill(body, vars);
        if (MessageAudienceHandler.HasUnfilled(filled))
        {
            logger.LogWarning("Ödeme alındı şablonunda doldurulamayan değişken var; SMS gönderilmedi: {EnrollmentId}", enrollment.Id);
            return;
        }

        var analysis = SmsText.Analyze(filled);
        if (analysis.Error is not null || analysis.Parts > sms.MaxPartsPerMessage)
        {
            logger.LogWarning("Ödeme alındı SMS metni uygun değil ({Reason}): {EnrollmentId}", analysis.Error ?? $"{analysis.Parts} boy", enrollment.Id);
            return;
        }

        if (!await gate.Lock.WaitAsync(TimeSpan.FromMinutes(2), ct))
        {
            logger.LogWarning("Ödeme alındı SMS'i gönderilemedi: başka bir SMS gönderimi sürüyor ({PaymentId}).", paymentId);
            return;
        }
        try
        {
            if (analysis.Parts > sms.DailyPartLimit - await composer.UsedTodayAsync(ct))
            {
                logger.LogWarning("Ödeme alındı SMS'i günlük SMS tavanı nedeniyle gönderilmedi: {EnrollmentId}", enrollment.Id);
                return;
            }

            // Aynı tahsilat için gönderilmiş/gönderilmekte olan mesaj varsa (görev yarıda kesilip yeniden çalıştıysa) tekrar gönderilmez
            var since = DateTime.UtcNow.AddHours(-12);
            var duplicate = await (from m in db.SmsMessages.AsNoTracking()
                                   join b in db.SmsBatches.AsNoTracking() on m.BatchId equals b.Id
                                   where b.Purpose == ReceiptSms.Purpose && m.EnrollmentId == enrollment.Id && m.CreatedAt >= since && m.Body == analysis.Text
                                   select m.Id).AnyAsync(ct);
            if (duplicate) return;

            await SendAsync(enrollment, student, analysis.Text, analysis.Parts, template.BodyTr);
        }
        finally
        {
            gate.Lock.Release();
        }
    }

    private async Task SendAsync(Enrollment enrollment, Student student, string text, int parts, string templateText)
    {
        // 1) Önce kayıt
        var batch = new SmsBatch
        {
            Purpose = ReceiptSms.Purpose,
            Text = templateText,
            RecipientCount = 1,
            TotalParts = parts,
            CreatedByName = ReceiptSms.ActorName
        };
        db.SmsBatches.Add(batch);
        var row = new SmsMessage
        {
            BatchId = batch.Id,
            PeriodId = enrollment.PeriodId,
            EnrollmentId = enrollment.Id,
            ApplicationId = enrollment.ApplicationId,
            StudentId = enrollment.StudentId,
            RecipientName = $"{student.FirstName} {student.LastName}".Trim(),
            Phone = TurkishFormats.ToInternational(student.Phone),
            Body = text,
            Parts = parts
        };
        db.SmsMessages.Add(row);
        await db.SaveChangesAsync(CancellationToken.None);

        // 2) Gönderim — iptal gelse bile yarıda bırakılmaz
        var result = await netgsm.SendAsync([new NetgsmClient.OutgoingMessage(text, student.Phone)], CancellationToken.None);
        (batch.Status, row.Status) = result.Outcome switch
        {
            NetgsmClient.SendOutcome.Accepted => (SmsBatchStatus.Sent, SmsMessageStatus.Waiting),
            NetgsmClient.SendOutcome.Rejected => (SmsBatchStatus.Failed, SmsMessageStatus.Failed),
            _ => (SmsBatchStatus.Unknown, SmsMessageStatus.Unknown)
        };
        batch.ProviderCampaignId = result.JobId;
        batch.ProviderError = result.Error;
        batch.CompletedAt = DateTime.UtcNow;
        row.ProviderStatus = result.Outcome == NetgsmClient.SendOutcome.Rejected && result.Error is { } error ? (error.Length > 40 ? error[..40] : error) : null;

        // 3) İletişim geçmişi (gönderilen ya da gönderilmiş olabilecek)
        if (batch.Status != SmsBatchStatus.Failed)
        {
            db.ContactLogs.Add(new ContactLog
            {
                PeriodId = enrollment.PeriodId,
                EnrollmentId = enrollment.Id,
                Channel = ContactChannel.Sms,
                Purpose = ReceiptSms.ContactPurpose,
                Note = text,
                SmsMessageId = row.Id,
                CreatedByName = ReceiptSms.ActorName
            });
        }

        await db.SaveChangesAsync(CancellationToken.None);

        if (batch.Status == SmsBatchStatus.Failed)
            logger.LogError("Ödeme alındı SMS'i sağlayıcı tarafından reddedildi: {Error}", result.Error);
        else if (batch.Status == SmsBatchStatus.Unknown)
            logger.LogWarning("Ödeme alındı SMS'inin sonucu belirsiz: {BatchId}", batch.Id);
    }
}
