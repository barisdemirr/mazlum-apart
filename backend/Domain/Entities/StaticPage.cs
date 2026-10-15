using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Domain.Entities;

/// <summary>Sabit sayfa: about | contact | kvkk. Anahtarlar başlangıçta oluşturulur, yalnızca içerik düzenlenir.</summary>
public class StaticPage : BaseEntity
{
    public string Key { get; set; } = "";
    public LocalizedText Title { get; set; } = new();
    public LocalizedText? Body { get; set; }
}
