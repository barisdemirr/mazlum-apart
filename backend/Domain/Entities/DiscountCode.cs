using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// İndirim kodu (kayıt yenileyen eski öğrenciler için). Başvuru formunda girilir; AYLIK KİRAYA (12 ayda yaz kirasına da) ve
/// depozitoya (son ay kirası yerine sayıldığı için) uygulanır. İndirim başvuru anında fiyata işlenir (başvuru liste fiyatını ve kodu da saklar).
/// Aktiflik BaseEntity.IsActive ile tutulur. Tc doluysa kod yalnızca o öğrenciye özeldir. MaxUses boşsa sınırsız; UsedCount başvuru açılınca artar, ret edilince geri düşer.
/// </summary>
public class DiscountCode : BaseEntity
{
    public string Code { get; set; } = "";              // BÜYÜK HARF, benzersiz
    public string Label { get; set; } = "";             // panel notu (örn. "2025-26 öğrencileri")
    public DiscountKind Kind { get; set; } = DiscountKind.Percent;
    public decimal Value { get; set; }                  // yüzde (1–90) ya da aylık TL
    public DateOnly? ValidUntil { get; set; }           // dahil; boşsa süresiz
    public int? MaxUses { get; set; }
    public int UsedCount { get; set; }
    public string? Tc { get; set; }                     // doluysa yalnızca bu T.C. kullanabilir
}
