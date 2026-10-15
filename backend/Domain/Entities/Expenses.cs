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

    /// <summary>Eşzamanlılık: aynı fatura aynı anda iki kez ödenemez</summary>
    public byte[] RowVersion { get; set; } = [];
}

public static class ExpenseCategoryKeys
{
    /// <summary>Fatura ödemelerinin düştüğü sistem kategorisi</summary>
    public const string Bills = "bills";
}
