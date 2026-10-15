namespace MazlumApart.Domain.Entities;

/// <summary>
/// WhatsApp / SMS mesaj şablonu. Key, iletişim amacıdır (payment_reminder, payment_overdue, application_received,
/// enrollment_approved, maintenance_update). Metinde {ad}, {tutar}, {vade}, {kalem}, {oda}... değişkenleri olabilir.
/// </summary>
public class MessageTemplate : BaseEntity
{
    public string Key { get; set; } = "";
    public string Name { get; set; } = "";
    public string BodyTr { get; set; } = "";
    public string? BodyEn { get; set; }
}
