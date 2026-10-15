using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// İşlem geçmişi: kim, ne zaman, ne yaptı, önce/sonra. Değiştirilemez ve silinemez.
/// Action değerleri frontend lib/admin/labels.js AUDIT_ACTION anahtarlarıyla aynıdır (örn. "payment.create").
/// </summary>
public class AuditLog : EntryEntity
{
    public ActorType ActorType { get; set; }
    public Guid? ActorId { get; set; }
    public string ActorName { get; set; } = "";
    public string Action { get; set; } = "";
    public string Entity { get; set; } = "";
    public string? EntityId { get; set; }
    public Guid? PeriodId { get; set; }
    public string? Before { get; set; }   // JSON
    public string? After { get; set; }    // JSON
    public string? Note { get; set; }
    public string? Ip { get; set; }
}
