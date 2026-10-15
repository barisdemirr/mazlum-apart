using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// Daire galerisindeki bir öğe (fotoğraf ya da video). Müşteri kuralı: her daireye en fazla 1 video.
/// Etiket: oda (RoomId) / ortak alan (AreaKey: kitchen, bathroom...) / özel metin (CustomLabel).
/// Oda etiketinin metni her okumada odanın GÜNCEL adından üretilir; oda adı değişince etiket kendiliğinden düzelir.
/// </summary>
public class ApartmentMedia : BaseEntity
{
    public Guid ApartmentId { get; set; }

    public Guid MediaAssetId { get; set; }
    public MediaAsset? MediaAsset { get; set; }

    /// <summary>Medyanın türünün kopyası: "daire başına tek video" kuralı veritabanında tekil indeksle de korunur</summary>
    public bool IsVideo { get; set; }

    public GalleryTagKind TagKind { get; set; } = GalleryTagKind.None;
    public Guid? RoomId { get; set; }
    public string? AreaKey { get; set; }
    public LocalizedText? CustomLabel { get; set; }
    public LocalizedText? Caption { get; set; }
}
