namespace MazlumApart.Infrastructure.Messaging;

/// <summary>
/// appsettings "Sms" bölümü (Verimor). Kimlik bilgileri YALNIZCA sunucuda durur; frontend'e hiçbir zaman gönderilmez.
/// Enabled=false iken gerçek gönderim yapılmaz: mesajlar "simüle edildi" olarak kaydedilir (geliştirme ve test için).
/// </summary>
public class SmsOptions
{
    public bool Enabled { get; set; }
    public string BaseUrl { get; set; } = "https://sms.verimor.com.tr/v2";

    /// <summary>Verimor kullanıcı adı: 12 haneli numara (908501234567)</summary>
    public string Username { get; set; } = "";

    /// <summary>OİM > SMS Ayarlarım'da tanımlanan API şifresi (panel şifresi değil)</summary>
    public string Password { get; set; } = "";

    /// <summary>Gönderici başlığı (BTK: API'de alfanumerik başlık zorunlu)</summary>
    public string SourceAddr { get; set; } = "";

    /// <summary>Mesaj geçerlilik süresi SS:DD (Verimor: 00:01 – 48:00)</summary>
    public string ValidFor { get; set; } = "24:00";

    /// <summary>Teslim raporu geri çağrısı için gizli anahtar. OİM'de push URL: https://api.../api/webhooks/verimor/{WebhookSecret}</summary>
    public string WebhookSecret { get; set; } = "";

    /// <summary>Tek istekte en fazla alıcı</summary>
    public int MaxRecipientsPerSend { get; set; } = 300;

    /// <summary>Tek mesaj en fazla kaç SMS boyu olabilir (uzun metin = çok kredi)</summary>
    public int MaxPartsPerMessage { get; set; } = 3;

    /// <summary>Günlük toplam SMS boyu tavanı (tüm yöneticiler). Aşılırsa gönderim reddedilir.</summary>
    public int DailyPartLimit { get; set; } = 1000;

    public int TimeoutSeconds { get; set; } = 20;

    public bool HasCredentials => !string.IsNullOrWhiteSpace(Username) && !string.IsNullOrWhiteSpace(Password);
}

/// <summary>
/// appsettings "Push" bölümü (Web Push / VAPID). Anahtar üretimi: npx web-push generate-vapid-keys
/// PublicKey frontend'de de kullanılır; PrivateKey yalnızca burada.
/// </summary>
public class PushOptions
{
    /// <summary>"mailto:yonetici@mazlumapart.com" ya da site adresi</summary>
    public string Subject { get; set; } = "";
    public string PublicKey { get; set; } = "";
    public string PrivateKey { get; set; } = "";

    public bool Enabled => !string.IsNullOrWhiteSpace(Subject) && !string.IsNullOrWhiteSpace(PublicKey) && !string.IsNullOrWhiteSpace(PrivateKey);
}
