namespace MazlumApart.Domain.Entities;

/// <summary>
/// Belge numarası sayacı (ör. başvuru no MA-2026-0001). Anahtar başına tek satır: "application-2026".
/// Raw SQL / sequence kullanılmaz; eşzamanlılık Version alanı (optimistic concurrency) ile korunur.
/// </summary>
public class NumberCounter
{
    public string Key { get; set; } = default!;
    public int Value { get; set; }
    public Guid Version { get; set; } = Guid.NewGuid();
}
