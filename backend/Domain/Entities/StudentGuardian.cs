namespace MazlumApart.Domain.Entities;

/// <summary>Veli / acil durum kişisi (öğrenci başına en az 1)</summary>
public class StudentGuardian : BaseEntity
{
    public Guid StudentId { get; set; }
    public string Name { get; set; } = "";
    public string Phone { get; set; } = "";
}
