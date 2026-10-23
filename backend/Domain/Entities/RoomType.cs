using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// Oda tipi = KATEGORİ (Tek / İki / Üç kişilik): ad, açıklama, kapak ve dönem fiyatları.
/// Fotoğraf/video dairelere, oda özellikleri odalara, ortak alanlar dairelere aittir.
/// Kişi sayıları (dairede / mutfak / banyo) dairelerden hesaplanır, burada tutulmaz.
/// </summary>
public class RoomType : BaseEntity
{
    /// <summary>Bu oda seçeneğinin ait olduğu daire türü. Boşsa eski usül (türsüz) oda tipi.</summary>
    public Guid? ApartmentTypeId { get; set; }

    public string Slug { get; set; } = "";
    public LocalizedText Name { get; set; } = new();
    public LocalizedText? Description { get; set; }

    public Guid? CoverMediaId { get; set; }
    public MediaAsset? CoverMedia { get; set; }
}
