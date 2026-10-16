namespace MazlumApart.Infrastructure.Auth;

/// <summary>appsettings "Jwt" bölümü. Key yalnızca appsettings.Development.json / appsettings.Production.json içinde durur (git'e girmez).</summary>
public class JwtOptions
{
    public string Issuer { get; set; } = "";
    public string Audience { get; set; } = "";
    public string Key { get; set; } = "";

    /// <summary>Erişim token'ı ömrü (kısa tutulur; süre dolunca oturum yenileme anahtarıyla sessizce yenilenir)</summary>
    public int AdminExpiresMinutes { get; set; } = 15;
    public int StudentExpiresMinutes { get; set; } = 15;

    /// <summary>Yenileme anahtarı ömrü (kayan pencere: her yenilemede baştan başlar). Yönetici: gün.</summary>
    public int AdminRefreshDays { get; set; } = 14;

    /// <summary>Öğrenci, "beni hatırla" açıkken: gün. Bu süre boyunca hiç kullanılmazsa oturum biter.</summary>
    public int StudentRefreshDays { get; set; } = 180;

    /// <summary>Öğrenci, "beni hatırla" kapalıyken: saat (tarayıcı kapanınca da biter)</summary>
    public int StudentSessionRefreshHours { get; set; } = 24;
}
