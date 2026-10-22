namespace MazlumApart.Infrastructure.Messaging;

/// <summary>
/// appsettings "Sms" bölümü (Netgsm). Kimlik bilgileri YALNIZCA sunucuda durur; frontend'e hiçbir zaman gönderilmez.
/// Enabled=false iken gerçek gönderim yapılmaz: mesajlar "simüle edildi" olarak kaydedilir (geliştirme ve test için).
/// </summary>
public class SmsOptions
{
    public bool Enabled { get; set; }
    public string BaseUrl { get; set; } = "https://api.netgsm.com.tr";

    /// <summary>Gönderim / rapor / bakiye yolları (BaseUrl'ün devamı). Netgsm yolu değiştirirse yalnızca burası güncellenir.</summary>
    public string SendPath { get; set; } = "/sms/rest/v2/send";
    public string ReportPath { get; set; } = "/sms/rest/v2/report";
    public string BalancePath { get; set; } = "/balance";

    /// <summary>Netgsm kullanıcı kodu = abone numarası (örn. 850xxxxxxx)</summary>
    public string UserCode { get; set; } = "";

    /// <summary>Netgsm API ALT KULLANICI şifresi (ana panel şifresi API'de çalışmaz)</summary>
    public string Password { get; set; } = "";

    /// <summary>Onaylı gönderici başlığı; Netgsm panelindekiyle birebir aynı olmalı (büyük/küçük harf duyarlı)</summary>
    public string MsgHeader { get; set; } = "";

    /// <summary>"TR" = Türkçe karakterler desteklenir (önerilir)</summary>
    public string Encoding { get; set; } = "TR";

    /// <summary>İYS filtresi: "0" = bilgilendirme (ticari olmayan) mesajlar. Ticari ileti için 11 (bireysel) / 12 (tacir) ve İYS kurulumu gerekir.</summary>
    public string IysFilter { get; set; } = "0";

    /// <summary>Netgsm panelinde API'yi kullanan uygulama adı (isteğe bağlı)</summary>
    public string AppName { get; set; } = "";

    /// <summary>Tek istekte en fazla alıcı</summary>
    public int MaxRecipientsPerSend { get; set; } = 300;

    /// <summary>Tek mesaj en fazla kaç SMS boyu olabilir (uzun metin = çok kredi)</summary>
    public int MaxPartsPerMessage { get; set; } = 3;

    /// <summary>Günlük toplam SMS boyu tavanı (tüm yöneticiler). Aşılırsa gönderim reddedilir.</summary>
    public int DailyPartLimit { get; set; } = 1000;

    public int TimeoutSeconds { get; set; } = 20;

    public bool HasCredentials => !string.IsNullOrWhiteSpace(UserCode) && !string.IsNullOrWhiteSpace(Password) && !string.IsNullOrWhiteSpace(MsgHeader);
}

/// <summary>
/// appsettings "PaymentReminders" bölümü: geciken ödemeler için günlük otomatik SMS.
/// Çalışma saati uygulamada DEĞİL, hosting panelindeki zamanlanmış görevde belirlenir (GET /api/jobs/payment-reminders).
/// Enabled=true olsa bile SMS servisi (Sms:Enabled) kapalıysa hiçbir şey gönderilmez.
/// Şablon değişkenleri: {ad} {tutar} (geciken toplam) {vade} (en eski geciken kalemin vadesi) {kalem}
/// </summary>
public class ReminderOptions
{
    public bool Enabled { get; set; }

    /// <summary>Aynı öğrenciye iki otomatik SMS arasındaki en az gün: 3 = bugün gönderildiyse sonraki 2 gün beklenir, 4. gün tekrar gönderilir</summary>
    public int IntervalDays { get; set; } = 3;

    /// <summary>Bir çalışmada en fazla kaç öğrenciye SMS gider (en çok geciken önce)</summary>
    public int MaxPerRun { get; set; } = 300;

    public string TemplateTr { get; set; } =
        "Sevgili {ad}, {tutar} tutarındaki {kalem} ödemenizin vadesi {vade} tarihinde geçmiştir. Ödemenizi yapmanızı rica ederiz. Ödemeyi zaten yaptıysanız bu mesajı göz ardı ediniz. Daha fazla bilgi için ofisimizle iletişime geçebilirsiniz.";

    public string TemplateEn { get; set; } =
        "Dear {ad}, your {kalem} payment of {tutar} was due on {vade}. Please make your payment. If you have already paid, please disregard this message. You can contact our office for more information.";
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
