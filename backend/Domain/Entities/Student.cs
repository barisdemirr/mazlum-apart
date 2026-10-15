namespace MazlumApart.Domain.Entities;

/// <summary>
/// Öğrenci kimliği (T.C. ile tekil). Başvuru ONAYLANINCA oluşur ya da aynı T.C. ile önceki dönemden bulunur;
/// her dönem için ayrı bir kayıt (Enrollment) açılır. Öğrenci portalına telefon + şifre ile girer.
/// Alanlar müşterinin kayıt formu listesidir (frontend lib/admin/domain/registration.js normalizeStudent).
/// </summary>
public class Student : BaseEntity
{
    public string Tc { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public DateOnly BirthDate { get; set; }

    /// <summary>10 hane, 5 ile başlar (giriş kimliği ve SMS numarası)</summary>
    public string Phone { get; set; } = "";

    public string Address { get; set; } = "";
    public int ProvinceId { get; set; }
    public string Province { get; set; } = "";
    public string District { get; set; } = "";

    public string School { get; set; } = "";
    public string Faculty { get; set; } = "";
    public string Department { get; set; } = "";

    /// <summary>"prep" | "1".."6"</summary>
    public string Grade { get; set; } = "";

    /// <summary>Bildirim / SMS dili: "tr" | "en"</summary>
    public string Language { get; set; } = "tr";

    public List<StudentGuardian> Guardians { get; set; } = [];

    // ---- Portal hesabı ----
    public string? PasswordHash { get; set; }
    public DateTime? PasswordChangedAt { get; set; }
    public Guid SecurityStamp { get; set; } = Guid.NewGuid();
    public DateTime? LastLoginAt { get; set; }
    public int FailedLoginCount { get; set; }
    public DateTime? LockedUntil { get; set; }

    public string FullName => $"{FirstName} {LastName}";
}
