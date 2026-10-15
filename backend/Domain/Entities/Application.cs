using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// Başvuru (web ya da ofis). Onaylanınca öğrenci + kayıt + dönemin tüm ödeme planı oluşur.
/// Fiyat başvuru anında kopyalanır (PriceMonthly/PriceDeposit): sonradan fiyat değişse de bu başvuruyu etkilemez.
/// Bekleyen başvuru ilgili odada yatağı "ayrılmış" gösterir (PreferredRoomId).
/// </summary>
public class Application : BaseEntity
{
    public string No { get; set; } = "";                // MA-2026-0001
    public Guid PeriodId { get; set; }
    public ApplicationSource Source { get; set; }
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Pending;

    public ApplicantInfo Applicant { get; set; } = new();
    // Arama ve tekillik için kopyalar
    public string Tc { get; set; } = "";
    public string Phone { get; set; } = "";
    public string FullName { get; set; } = "";

    public Guid RoomTypeId { get; set; }
    public Guid? PreferredRoomId { get; set; }          // sitede seçilen yatağın odası (tercih; yerleşimi yönetici yapar)
    public StayTerm Term { get; set; } = StayTerm.Full;
    public DateOnly EntryDate { get; set; }
    public PayWindow PayWindow { get; set; } = PayWindow.Early;
    public decimal PriceMonthly { get; set; }
    public decimal PriceDeposit { get; set; }
    public string? Note { get; set; }

    public DateTime? DecidedAt { get; set; }
    public Guid? DecidedById { get; set; }
    public string? RejectReason { get; set; }
    public Guid? EnrollmentId { get; set; }
    public string? Ip { get; set; }
}
