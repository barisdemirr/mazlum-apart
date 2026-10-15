using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Domain.Entities;

/// <summary>Anasayfa slaytı (görsel + başlık). Sıra OrderIndex ile.</summary>
public class Slide : BaseEntity
{
    public Guid MediaId { get; set; }
    public MediaAsset? Media { get; set; }
    public LocalizedText Title { get; set; } = new();
    public LocalizedText? Subtitle { get; set; }
}
