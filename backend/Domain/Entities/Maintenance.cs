using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// Arıza talebi (öğrenci açar, yönetici durumunu günceller). No: TK-0001. RoomLabel açılış anındaki oda (sonradan oda değişse de kalır).
/// Fotoğraflar özel alanda (App_Data/private) saklanır; yalnızca yetkili uçtan okunur.
/// </summary>
public class MaintenanceRequest : BaseEntity
{
    public string No { get; set; } = "";
    public Guid PeriodId { get; set; }
    public Guid EnrollmentId { get; set; }
    public Guid StudentId { get; set; }
    public string RoomLabel { get; set; } = "";
    public MaintenanceArea Area { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public MaintenanceStatus Status { get; set; } = MaintenanceStatus.Received;
    public string? AdminNote { get; set; }
    public DateTime? ClosedAt { get; set; }

    public List<MaintenanceEvent> Events { get; set; } = [];
    public List<MaintenancePhoto> Photos { get; set; } = [];
}

/// <summary>Durum geçmişi (öğrenci zaman çizelgesinde görür). Note: yöneticinin öğrenciye görünen notu.</summary>
public class MaintenanceEvent : EntryEntity
{
    public Guid RequestId { get; set; }
    public MaintenanceStatus Status { get; set; }
    public string? Note { get; set; }
    public ActorType ActorType { get; set; }
    public string ActorName { get; set; } = "";
}

/// <summary>Arıza fotoğrafı: WebP varyantları (thumb/md/lg) özel alanda. FilePath lg yoludur.</summary>
public class MaintenancePhoto : EntryEntity
{
    public Guid RequestId { get; set; }
    public string FilePath { get; set; } = "";
    public long FileSize { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
}
