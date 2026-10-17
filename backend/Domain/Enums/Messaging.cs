namespace MazlumApart.Domain.Enums;

/// <summary>İletişim kanalı (frontend CONTACT_CHANNEL)</summary>
public enum ContactChannel { Whatsapp, Sms, Push }

/// <summary>
/// SMS gönderim isteğinin (kampanya) sonucu:
///   Simulated = SMS servisi kapalı (Sms:Enabled=false), gerçek gönderim yapılmadı, yalnızca kayıt tutuldu
///   Sent      = Netgsm isteği kabul etti (görev no / jobid döndü); her mesajın teslim durumu rapordan gelir
///   Failed    = Netgsm isteği reddetti (ör. hata kodu 30/40/80); hiçbir SMS gönderilmedi, kredi düşmedi
///   Unknown   = bağlantı koptu / zaman aşımı: gönderilmiş OLABİLİR. Otomatik tekrar YOK (çift SMS ve çift ücret riski);
///               durum "Raporu yenile" ile netleşir.
/// </summary>
public enum SmsBatchStatus { Pending, Simulated, Sent, Failed, Unknown }

/// <summary>Tek SMS'in durumu (Netgsm durum kodlarından eşlenir; ham kod ayrıca ProviderStatus'ta saklanır)</summary>
public enum SmsMessageStatus { Pending, Simulated, Waiting, Delivered, NotDelivered, Expired, Rejected, Failed, Unknown }

/// <summary>Bildirim aboneliğinin sahibi</summary>
public enum PushOwner { Admin, Student }

public enum MaintenanceArea { Room, Kitchen, Bathroom, Common, Other }

public enum MaintenanceStatus { Received, InProgress, Done }
