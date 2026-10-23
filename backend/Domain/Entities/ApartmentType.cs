using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// Daire türü (örn. "2+1 Salonlu", "1+1 Tek Kişilik"): sitenin ana sayfasında listelenen kategori.
/// Türün altında "oda seçenekleri" (RoomType: balkonlu/balkonsuz, zemin kat/üst kat...) ve aynı türden fiziksel daireler bulunur.
/// Kontenjan ayrıca girilmez: türdeki daire ve oda sayısından hesaplanır. Fiyat, oda seçeneği (RoomType) başına dönem fiyatıdır.
/// </summary>
public class ApartmentType : BaseEntity
{
    public string Slug { get; set; } = "";
    public LocalizedText Name { get; set; } = new();
    public LocalizedText? Description { get; set; }

    public Guid? CoverMediaId { get; set; }
    public MediaAsset? CoverMedia { get; set; }
}
