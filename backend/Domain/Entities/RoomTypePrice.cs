namespace MazlumApart.Domain.Entities;

/// <summary>Dönemin fiyatı (oda tipi başına). Değişiklik yalnızca YENİ başvuruları etkiler: kayıtlar fiyatın kopyasını taşır.</summary>
public class RoomTypePrice : BaseEntity
{
    public Guid PeriodId { get; set; }
    public Guid RoomTypeId { get; set; }
    public decimal Monthly { get; set; }
    public decimal Deposit { get; set; }
}
