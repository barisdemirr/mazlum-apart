using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// İletişim geçmişi: öğrenciyle yapılan her temas (WhatsApp mesajı, SMS, bildirim). "Son iletişim" tarihini besler.
/// Silinmez (append-only).
/// </summary>
public class ContactLog : EntryEntity
{
    public Guid PeriodId { get; set; }
    public Guid EnrollmentId { get; set; }
    public ContactChannel Channel { get; set; }
    public string Purpose { get; set; } = "other";
    public string? Note { get; set; }
    public Guid? SmsMessageId { get; set; }
    public Guid? NotificationBatchId { get; set; }
    public Guid? CreatedById { get; set; }
    public string? CreatedByName { get; set; }
}

/// <summary>
/// SMS gönderim isteği (Netgsm görevi; ProviderCampaignId = jobid). Bir istekte bir ya da çok alıcı olabilir (toplu SMS tek istektir).
/// Text: şablon metni; şifre gibi gizli değerler maskelenmiş saklanır.
/// </summary>
public class SmsBatch : EntryEntity
{
    public string Purpose { get; set; } = "other";
    public string Text { get; set; } = "";
    public int RecipientCount { get; set; }
    public int SkippedCount { get; set; }
    public int TotalParts { get; set; }
    public SmsBatchStatus Status { get; set; } = SmsBatchStatus.Pending;
    public string? ProviderCampaignId { get; set; }
    public string? ProviderError { get; set; }
    public Guid? CreatedById { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime? CompletedAt { get; set; }
}

/// <summary>Tek alıcıya giden SMS. Body maskelenmiş metindir (şifre görünmez). Durum teslim raporuyla güncellenir.</summary>
public class SmsMessage : EntryEntity
{
    public Guid BatchId { get; set; }
    public Guid? PeriodId { get; set; }
    public Guid? EnrollmentId { get; set; }
    public Guid? ApplicationId { get; set; }
    public Guid? StudentId { get; set; }
    public string RecipientName { get; set; } = "";
    public string Phone { get; set; } = "";          // 905xxxxxxxxx
    public string Body { get; set; } = "";
    public int Parts { get; set; }
    public SmsMessageStatus Status { get; set; } = SmsMessageStatus.Pending;
    public string? ProviderStatus { get; set; }
    public string? ProviderMessageId { get; set; }
    public string? GsmError { get; set; }
    public int? Credits { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? DoneAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// Web Push aboneliği (bir cihaz/tarayıcı). Gerçek silinir (soft delete yok): süresi dolan (404/410) ya da çıkış yapılan cihaz kaldırılır.
/// Endpoint uzun bir URL'dir; tekillik EndpointHash (SHA-256) üzerinden sağlanır.
/// </summary>
public class PushSubscription
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public PushOwner OwnerType { get; set; }
    public Guid OwnerId { get; set; }
    public string Endpoint { get; set; } = "";
    public string EndpointHash { get; set; } = "";
    public string P256dh { get; set; } = "";
    public string Auth { get; set; } = "";
    public string Lang { get; set; } = "tr";
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastSuccessAt { get; set; }
    public int FailureCount { get; set; }
}

/// <summary>Toplu bildirim gönderimi (şablon TR/EN; her öğrenciye kendi dilinde, kendi bilgileriyle doldurulmuş metin gider)</summary>
public class NotificationBatch : EntryEntity
{
    public string Purpose { get; set; } = "announcement";
    public string Url { get; set; } = "/ogrenci";
    public string TitleTr { get; set; } = "";
    public string? TitleEn { get; set; }
    public string BodyTr { get; set; } = "";
    public string? BodyEn { get; set; }
    public int RecipientCount { get; set; }
    public int SkippedCount { get; set; }
    public int DeliveredCount { get; set; }
    public int FailedCount { get; set; }
    public Guid? CreatedById { get; set; }
    public string? CreatedByName { get; set; }
}

/// <summary>Bir öğrenciye giden bildirim: kaç cihaza denendi, kaçı başarılı</summary>
public class NotificationDelivery : EntryEntity
{
    public Guid BatchId { get; set; }
    public Guid StudentId { get; set; }
    public Guid? EnrollmentId { get; set; }
    public string RecipientName { get; set; } = "";
    public string Lang { get; set; } = "tr";
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public int Devices { get; set; }
    public int Succeeded { get; set; }
    public int Failed { get; set; }
}
