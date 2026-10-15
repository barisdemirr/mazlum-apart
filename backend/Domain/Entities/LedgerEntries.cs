using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// Borç kalemi. Değiştirilemez: iptal = eksi tutarlı yeni kalem (ReversalOfId). Kalan, hareketlerden HESAPLANIR.
/// Month: "2026-10" (kiranın ait olduğu ay).
/// </summary>
public class Charge : EntryEntity
{
    public Guid PeriodId { get; set; }
    public Guid EnrollmentId { get; set; }
    public ChargeKind Kind { get; set; }
    public string Month { get; set; } = "";
    public decimal Amount { get; set; }
    public DateOnly DueDate { get; set; }
    public string? Note { get; set; }
    public Guid? ReversalOfId { get; set; }
    public Guid? CreatedById { get; set; }
}

/// <summary>
/// Tahsilat ya da avans iadesi. Silinmez; iptal edilirse CancelledAt dolar ve ters hareketler yazılır.
/// Ödeme her zaman kaydın dönemine yazılır (eski dönem borcu bugün ödense de).
/// </summary>
public class Payment : EntryEntity
{
    public Guid PeriodId { get; set; }
    public Guid EnrollmentId { get; set; }
    public PaymentKind Kind { get; set; }
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public PaymentMethod Method { get; set; }
    public Guid AccountId { get; set; }
    public string? Note { get; set; }
    public Guid? CreatedById { get; set; }

    public DateTime? CancelledAt { get; set; }
    public string? CancelReason { get; set; }
    public Guid? CancelledById { get; set; }
}

/// <summary>Dağıtım: tahsilatın hangi kaleme ne kadar sayıldığı. İptal = eksi tutarlı dağıtım.</summary>
public class PaymentAllocation : EntryEntity
{
    public Guid PeriodId { get; set; }
    public Guid EnrollmentId { get; set; }
    public Guid PaymentId { get; set; }
    public Guid ChargeId { get; set; }
    public decimal Amount { get; set; }
    public bool IsAuto { get; set; }
    public bool IsReversal { get; set; }
}

/// <summary>Kasa / banka hesabı (dönemlerden bağımsız). Bakiye dönem içindeki hareketlerden hesaplanır.</summary>
public class Account : BaseEntity
{
    public AccountType Type { get; set; }
    public string Name { get; set; } = "";
    public string? Iban { get; set; }
}

/// <summary>Kasa/banka hareketi. Transfer iki bacaklıdır (çıkış + giriş, aynı SourceId) ve gelir/gider sayılmaz.</summary>
public class AccountTransaction : EntryEntity
{
    public Guid PeriodId { get; set; }
    public Guid AccountId { get; set; }
    public DateOnly Date { get; set; }
    public TransactionDirection Direction { get; set; }
    public decimal Amount { get; set; }
    public TransactionSource Source { get; set; }
    public Guid? SourceId { get; set; }
    public string? Note { get; set; }
    public Guid? CreatedById { get; set; }
}
