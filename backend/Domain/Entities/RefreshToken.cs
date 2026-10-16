namespace MazlumApart.Domain.Entities;

/// <summary>
/// Oturum yenileme anahtarı (opak, rastgele). Düz hâli yalnızca kullanıcının httpOnly çerezinde durur;
/// veritabanında SHA-256 özeti saklanır. Her yenilemede döndürülür (rotation): eski anahtar iptal edilir, aynı "aile"den yenisi verilir.
/// Süresi her yenilemede LifetimeSeconds kadar uzar (kayan pencere): düzenli kullanan kişi çıkış yapmaz.
/// </summary>
public class RefreshToken
{
    public Guid Id { get; set; } = Guid.CreateVersion7();

    /// <summary>AppRoles.Admin | AppRoles.Student</summary>
    public string Role { get; set; } = "";
    public Guid UserId { get; set; }

    /// <summary>Verildiği andaki SecurityStamp: şifre değişince eşleşmez ve tüm aile geçersiz olur</summary>
    public Guid Stamp { get; set; }

    /// <summary>Aynı girişten türeyen anahtarlar zinciri. Çalınan eski anahtar yeniden kullanılırsa aile topluca kapatılır.</summary>
    public Guid FamilyId { get; set; }

    public string TokenHash { get; set; } = "";

    /// <summary>false: tarayıcı kapanınca biten oturum çerezi ("beni hatırla" kapalı)</summary>
    public bool Persistent { get; set; }
    public int LifetimeSeconds { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}
