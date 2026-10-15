namespace MazlumApart.Domain.Entities;

public class AdminUser : BaseEntity
{
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string FullName { get; set; } = "";
    public DateTime? LastLoginAt { get; set; }

    /// <summary>Şifre değişince / hesap kapanınca yenilenir; eski token'lar geçersiz olur (token'daki "stamp" ile karşılaştırılır)</summary>
    public Guid SecurityStamp { get; set; } = Guid.NewGuid();

    // Hesap kilidi: art arda hatalı girişte geçici kilit (IP sınırından bağımsız)
    public int FailedLoginCount { get; set; }
    public DateTime? LockedUntil { get; set; }
}
