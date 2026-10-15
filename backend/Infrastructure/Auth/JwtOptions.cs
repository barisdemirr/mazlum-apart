namespace MazlumApart.Infrastructure.Auth;

/// <summary>appsettings "Jwt" bölümü. Key yalnızca appsettings.Development.json / appsettings.Production.json içinde durur (git'e girmez).</summary>
public class JwtOptions
{
    public string Issuer { get; set; } = "";
    public string Audience { get; set; } = "";
    public string Key { get; set; } = "";

    /// <summary>Yönetici oturumu (frontend ADMIN_SESSION_HOURS = 8 ile aynı)</summary>
    public int AdminExpiresMinutes { get; set; } = 480;

    /// <summary>Öğrenci oturumu, "beni hatırla" kapalıyken (frontend SESSION_HOURS = 12)</summary>
    public int StudentExpiresMinutes { get; set; } = 720;

    /// <summary>Öğrenci oturumu, "beni hatırla" açıkken (frontend REMEMBER_DAYS = 30)</summary>
    public int StudentRememberDays { get; set; } = 30;
}
