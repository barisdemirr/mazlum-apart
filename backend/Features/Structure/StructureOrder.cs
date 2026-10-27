using Microsoft.EntityFrameworkCore;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Structure;

/// <summary>
/// Yönetici tarafından belirlenen sıra (daire türleri, her türün altındaki oda tipleri). Sitedeki listeler ve panelde
/// yerleştirme / doluluk ekranları bu sıralamayı AYNI şekilde kullanır: önce daire türü sırası, sonra türün altındaki oda tipi sırası.
/// Sıra yalnızca OrderIndex alanını değiştirir; kayıtlara, yerleşimlere ve doluluğa dokunmaz.
/// </summary>
public sealed class StructureOrder
{
    private readonly Dictionary<Guid, int> apartmentTypeRank;
    private readonly Dictionary<Guid, int> roomTypeRank;

    private StructureOrder(Dictionary<Guid, int> apartmentTypeRank, Dictionary<Guid, int> roomTypeRank)
    {
        this.apartmentTypeRank = apartmentTypeRank;
        this.roomTypeRank = roomTypeRank;
    }

    public static async Task<StructureOrder> LoadAsync(AppDbContext db, CancellationToken ct)
    {
        var aptTypes = await db.ApartmentTypes.AsNoTracking().OrderBy(x => x.OrderIndex).ThenBy(x => x.CreatedAt).Select(x => x.Id).ToListAsync(ct);
        var aptRank = aptTypes.Select((id, i) => (id, i)).ToDictionary(x => x.id, x => x.i);

        var roomTypes = await db.RoomTypes.AsNoTracking().Select(x => new { x.Id, x.ApartmentTypeId, x.OrderIndex, x.CreatedAt }).ToListAsync(ct);
        var ordered = roomTypes
            .OrderBy(t => t.ApartmentTypeId is { } a && aptRank.TryGetValue(a, out var r) ? r : int.MaxValue)
            .ThenBy(t => t.OrderIndex).ThenBy(t => t.CreatedAt)
            .Select((t, i) => (t.Id, i)).ToDictionary(x => x.Id, x => x.i);
        return new StructureOrder(aptRank, ordered);
    }

    public int ApartmentType(Guid? id) => id is { } k && apartmentTypeRank.TryGetValue(k, out var r) ? r : int.MaxValue;

    /// <summary>Oda tipinin genel sırası (daire türü sırası → türün altındaki sıra)</summary>
    public int RoomType(Guid id) => roomTypeRank.TryGetValue(id, out var r) ? r : int.MaxValue;
}

/// <summary>
/// Sıralamayı kaydeder: PUT /api/admin/structure/order { kind: "apartment-types" | "room-types", ids: [...] }.
/// ids, ekranda görünen yeni sıradır (oda tiplerinde tek bir daire türünün seçenekleri). Yalnızca OrderIndex güncellenir.
/// </summary>
public static class SaveStructureOrder
{
    public record Command(string Kind, List<Guid>? Ids);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result<int>> Handle(Command cmd, CancellationToken ct)
        {
            var ids = cmd.Ids?.Distinct().ToList() ?? [];
            if (ids.Count == 0) return Error.Field("ids", "Sıralanacak kayıt yok.");

            switch (cmd.Kind)
            {
                case "apartment-types":
                {
                    var items = await db.ApartmentTypes.Where(x => ids.Contains(x.Id)).ToListAsync(ct);
                    if (items.Count != ids.Count) return Error.NotFound("Sıralanan daire türlerinden biri bulunamadı.");
                    for (var i = 0; i < ids.Count; i++) items.First(x => x.Id == ids[i]).OrderIndex = i;
                    break;
                }
                case "room-types":
                {
                    var items = await db.RoomTypes.Where(x => ids.Contains(x.Id)).ToListAsync(ct);
                    if (items.Count != ids.Count) return Error.NotFound("Sıralanan oda tiplerinden biri bulunamadı.");
                    for (var i = 0; i < ids.Count; i++) items.First(x => x.Id == ids[i]).OrderIndex = i;
                    break;
                }
                default:
                    return Error.Field("kind", "kind: apartment-types | room-types");
            }

            audit.Add("structure.order", cmd.Kind, null, after: new { ids });
            await db.SaveChangesAsync(ct);
            return ids.Count;
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/structure/order", async (Command cmd, Handler handler, CancellationToken ct) => (await handler.Handle(cmd, ct)).ToOk());
    }
}
