namespace MazlumApart.Domain.Entities;

/// <summary>
/// Tekrar gönderim koruması. Para yaratan her işlem (tahsilat, iade, kalem, gider, transfer, fatura...) istemcinin
/// ürettiği "Idempotency-Key" başlığıyla gelir; anahtar işin kendisiyle AYNI SaveChanges içinde yazılır.
/// Aynı anahtar ikinci kez gelirse (çift tıklama, ağ tekrarı) iş yapılmaz, 409 döner. Aynı anda iki istek gelirse
/// birincil anahtar ihlali ikinciyi durdurur.
/// </summary>
public class IdempotencyKey
{
    public Guid Key { get; set; }
    public string Scope { get; set; } = "";
    public Guid? ActorId { get; set; }
    public DateTime CreatedAt { get; set; }
}
