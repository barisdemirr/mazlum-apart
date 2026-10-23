using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Domain.Entities;

/// <summary>Tek satırlık site ayarları (SingletonId). BOŞ alanlar sitede gösterilmez: uydurma iletişim bilgisi yok.</summary>
public class SiteSetting : BaseEntity
{
    public static readonly Guid SingletonId = new("6d3f1b2a-9c4e-4f7a-8b51-2e0c7d9a4f13");

    public string? Phone { get; set; }        // 10 hane
    public string? Whatsapp { get; set; }     // 10 hane
    public string? Email { get; set; }
    public LocalizedText? Address { get; set; }
    public string? MapUrl { get; set; }
    public string? Instagram { get; set; }
    public string? Iban { get; set; }         // TR + 24 hane, boşluksuz
    public string? IbanHolder { get; set; }

    /// <summary>Anasayfa tanıtım videosu (isteğe bağlı) ve konum görseli</summary>
    public Guid? HeroVideoMediaId { get; set; }
    public Guid? MapMediaId { get; set; }

    /// <summary>
    /// Ön başvuru: açıkken dolu oda ilanlarında "yeni dönem fiyatları {tarih} tarihinde açıklanacak, ön başvuru yap" alanı görünür.
    /// Tarih boşsa ya da geçmişse "yakında açıklanacak" yazar.
    /// </summary>
    public bool PreRegistrationEnabled { get; set; }
    public DateOnly? PriceAnnounceDate { get; set; }
}
