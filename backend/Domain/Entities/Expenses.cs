using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// Gider kategorisi. SystemKey dolu olanlar sistem kategorisidir (ör. "bills": fatura ödemeleri buraya düşer);
/// silinemez ve elle gider girişinde seçilemez.
/// </summary>
public class ExpenseCategory : BaseEntity
{
    public string Name { get; set; } = "";
    public string? SystemKey { get; set; }
}

/// <summary>
/// Gider (apartın harcaması). Silinmez; iptal edilirse CancelledAt dolar ve ters hesap hareketi (giriş) yazılır.
/// Faturadan geldiyse BillId doludur.
/// </summary>
public class Expense : EntryEntity
{
    public Guid PeriodId { get; set; }
    public Guid CategoryId { get; set; }
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public Guid AccountId { get; set; }
    public string Description { get; set; } = "";
    public Guid? BillId { get; set; }
    public Guid? CreatedById { get; set; }

    public DateTime? CancelledAt { get; set; }
    public string? CancelReason { get; set; }
    public Guid? CancelledById { get; set; }

    /// <summary>Eşzamanlılık: iki yönetici aynı gideri aynı anda iptal ederse ikincisi 409 alır (çift ters hareket olmaz)</summary>
    public byte[] RowVersion { get; set; } = [];
}

/// <summary>
/// Fatura. Kaydetmek bakiyeyi DEĞİŞTİRMEZ; ödemesi işlenince gider + hesap hareketi oluşur (ExpenseId).
/// Ödenmemiş fatura (yanlış girildiyse) silinebilir; ödenmiş fatura silinemez, önce gideri iptal edilir.
/// </summary>
public class Bill : BaseEntity
{
    public Guid PeriodId { get; set; }
    public BillKind Kind { get; set; }
    public string Month { get; set; } = "";
    public decimal Amount { get; set; }
    public DateOnly DueDate { get; set; }
    public string? Note { get; set; }
    public BillStatus Status { get; set; } = BillStatus.Unpaid;
    public DateOnly? PaidAt { get; set; }
    public Guid? ExpenseId { get; set; }

    /// <summary>Abonelikten otomatik üretildiyse aboneliğin Id'si (elle girilen faturada null)</summary>
    public Guid? SubscriptionId { get; set; }

    /// <summary>Üretildiği andaki abone numarası (abonelik sonradan değişse de geçmiş fatura aynı kalır)</summary>
    public string? SubscriberNo { get; set; }

    /// <summary>
    /// true: abonelikten otomatik üretildi, gerçek fatura henüz girilmedi. Tutar tahminidir, vade aboneliğin ayın günüdür.
    /// Yönetici gelen faturanın tutarını ve son ödeme tarihini girince false olur. Bu durumdaki fatura ödenemez ve "gecikmiş" sayılmaz.
    /// </summary>
    public bool AwaitingInvoice { get; set; }

    /// <summary>Eşzamanlılık: aynı fatura aynı anda iki kez ödenemez</summary>
    public byte[] RowVersion { get; set; } = [];
}

/// <summary>
/// Fatura aboneliği: abone numarası + fatura türü. Her ay için otomatik bir "fatura bekleniyor" kaydı (Bill) üretilir;
/// yönetici gelen faturanın tutarını ve son ödeme tarihini girince kayıt gerçek faturaya dönüşür.
/// IsActive false ise yeni kayıt üretilmez (eski faturalar durur).
/// </summary>
public class BillSubscription : BaseEntity
{
    public BillKind Kind { get; set; }
    public string SubscriberNo { get; set; } = "";

    /// <summary>Kurum adı (ör. TEDAŞ, Aksa, Türk Telekom); isteğe bağlı</summary>
    public string? Provider { get; set; }

    /// <summary>Faturanın ayın kaçıncı günü vadeli olacağı (1–31; kısa aylarda ayın son gününe iner)</summary>
    public int DueDay { get; set; }

    /// <summary>Tahmini tutar: daha önce gerçek fatura girilmediyse yeni aylık kaydın tutarı bu olur</summary>
    public decimal EstimatedAmount { get; set; }

    /// <summary>İlk kaydın üretileceği ay ("2026-10")</summary>
    public string StartMonth { get; set; } = "";

    public string? Note { get; set; }
}

public static class ExpenseCategoryKeys
{
    /// <summary>Fatura ödemelerinin düştüğü sistem kategorisi</summary>
    public const string Bills = "bills";
}
