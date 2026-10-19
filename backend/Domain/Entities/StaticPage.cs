using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// Sabit sayfa: about | kvkk. Anahtarlar başlangıçta oluşturulur. Panelde yalnızca Hakkımızda (about) metni düzenlenir.
/// Body düz yazıdır: satır sonları korunur, boş satır paragraf ayırır.
/// </summary>
public class StaticPage : BaseEntity
{
    public string Key { get; set; } = "";
    public LocalizedText Title { get; set; } = new();
    public LocalizedText? Body { get; set; }
}
