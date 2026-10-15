namespace MazlumApart.Domain.Entities;

/// <summary>Yerleşim: kayıt [StartDate, EndDate] arasında bu odada kalır. Oda değişikliğinde eski yerleşim bir gün önce biter.</summary>
public class Placement : BaseEntity
{
    public Guid PeriodId { get; set; }
    public Guid EnrollmentId { get; set; }
    public Guid RoomId { get; set; }
    public Room? Room { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
}
