using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// Daire: odaların bulunduğu fiziksel birim. Fotoğraf + 1 video (galeri), ortak kullanım alanları ve
/// sitede görünürlük buradadır. Dairede kalan kişi sayısı aktif odaların yataklarından hesaplanır.
/// </summary>
public class Apartment : BaseEntity
{
    public Guid? ApartmentTypeId { get; set; }      // daire türü (ana sayfada listelenen kategori); boşsa sitede türsüz kalır
    public string Name { get; set; } = "";          // "Daire 1"
    public string Slug { get; set; } = "";          // "daire-1" (herkese açık adres: /odalar/{tip}/{daire})
    public int Floor { get; set; }
    public int Kitchens { get; set; } = 1;
    public int Bathrooms { get; set; } = 1;
    public LocalizedText? Description { get; set; } // /odalar sayfasındaki daire kartında görünen kısa tanıtım
    public string? Note { get; set; }               // yalnızca panelde görünür
    public bool IsPublished { get; set; } = true;   // sitede gösterilsin mi (yatak durumu/yerleşim etkilenmez)
    public List<FeatureItem> SharedAreas { get; set; } = [];

    public List<Room> Rooms { get; set; } = [];
    public List<ApartmentMedia> Media { get; set; } = [];
}
