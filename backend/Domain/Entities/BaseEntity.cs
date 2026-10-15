namespace MazlumApart.Domain.Entities;

/// <summary>
/// Düzenlenebilir kayıtların temeli (oda tipi, daire, dönem, öğrenci...).
/// Silme isteği soft delete'e çevrilir (DeletedAt dolar) ve kayıt sorgulardan otomatik elenir.
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public int OrderIndex { get; set; }
}

/// <summary>
/// Değiştirilemez (append-only) kayıtların temeli: muhasebe hareketleri, denetim kaydı, gönderilen SMS/bildirim.
/// Bu kayıtlar ASLA silinmez; hata ters kayıtla düzeltilir. AppDbContext silme girişimini reddeder.
/// </summary>
public abstract class EntryEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public DateTime CreatedAt { get; set; }
}
