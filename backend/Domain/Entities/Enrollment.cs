using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// Kayıt = öğrencinin BİR DÖNEMDEKİ hesabı. Bütün muhasebe kalemleri bir kayda ve onun dönemine bağlıdır;
/// dönemler birbirine karışmaz. Fiyat onay anındaki başvurudan kopyalanır.
/// LedgerVersion: her muhasebe işleminde artar; aynı anda iki yöneticinin aynı hesaba yazması (yarış) engellenir.
/// </summary>
public class Enrollment : BaseEntity
{
    public Guid PeriodId { get; set; }
    public Guid StudentId { get; set; }
    public Student? Student { get; set; }
    public Guid ApplicationId { get; set; }
    public Guid RoomTypeId { get; set; }
    public RoomType? RoomType { get; set; }

    public EnrollmentStatus Status { get; set; } = EnrollmentStatus.Approved;
    public PayWindow PayWindow { get; set; }
    public StayTerm Term { get; set; }
    public DateOnly EntryDate { get; set; }
    public decimal MonthlyPrice { get; set; }
    public decimal DepositPrice { get; set; }

    public DateOnly? EndedAt { get; set; }
    public string? EndReason { get; set; }

    public int LedgerVersion { get; set; }
}
