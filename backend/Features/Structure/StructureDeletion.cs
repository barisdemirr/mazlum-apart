using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Features.Rooms;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Structure;

/// <summary>
/// Silme öncesi etki özeti (panelde kritik uyarı penceresinde gösterilir).
/// BlockedReason doluysa silme yapılamaz ve neden gösterilir.
/// </summary>
public record DeleteImpact(
    string Kind, string Name,
    int Apartments, int Rooms, int Beds, int Prices, int Photos,
    int PendingApplications, int Enrollments, int Residents, int PastPlacements,
    string? BlockedReason);

/// <summary>
/// Daire / oda tipi / oda silme. Hepsi SOFT DELETE'tir (kayıt DeletedAt ile gizlenir; geçmiş veriler bozulmaz) ve ilişkili yapılar birlikte işlenir:
///  - Daire: odaları + galeri bağlantıları silinir. Oda tipleri (oda seçenekleri) dairelere bağlı değildir, etkilenmez.
///  - Oda tipi: odaları (tüm dairelerdeki) + dönem fiyatları birlikte silinir.
///  - Oda: oda tipi/daire etkilenmez; fotoğraf etiketleri kaldırılır.
///  - Silinen odayı "tercih eden" başvurularda yatak tercihi temizlenir (başvuru "yatak fark etmez" olur).
///  ENGELLER (silinemez): odalarda şu an ya da ileride yerleşik öğrenci varsa; oda tipinde ayrıca kayıtlı öğrenci (kayıt listelerinde
///  oda tipi adı gerektiği için) ya da bekleyen başvuru varsa. Geçmişte bitmiş yerleşim kayıtları silmeyi engellemez; ancak oda silindiği için
///  öğrencinin yerleşim geçmişi listesinde görünmez (özet ekranda sayısı uyarı olarak yazılır).
/// </summary>
public class StructureDeletionHandler(AppDbContext db, AuditWriter audit)
{
    // ───────── etki analizi ─────────

    public async Task<Result<DeleteImpact>> ApartmentImpactAsync(Guid id, CancellationToken ct)
    {
        var apartment = await db.Apartments.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.Name }).FirstOrDefaultAsync(ct);
        if (apartment is null) return Error.NotFound("Daire bulunamadı.");

        var rooms = await db.Rooms.AsNoTracking().Where(x => x.ApartmentId == id).Select(x => new { x.Id, x.Beds }).ToListAsync(ct);
        var roomIds = rooms.Select(x => x.Id).ToList();
        var photos = await db.ApartmentMedia.CountAsync(x => x.ApartmentId == id, ct);
        var (residents, past) = await PlacementsAsync(roomIds, ct);
        var pending = await PendingPreferringAsync(roomIds, ct);

        var blocked = residents > 0
            ? $"Bu dairedeki odalarda şu an ya da ileri tarihte yerleşik {residents} öğrenci var. Önce öğrencilerin yerleşimini başka odaya taşıyın ya da sonlandırın."
            : null;
        return new DeleteImpact("apartment", apartment.Name, 1, rooms.Count, rooms.Sum(x => x.Beds), 0, photos, pending, 0, residents, past, blocked);
    }

    public async Task<Result<DeleteImpact>> RoomTypeImpactAsync(Guid id, CancellationToken ct)
    {
        var type = await db.RoomTypes.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.Name }).FirstOrDefaultAsync(ct);
        if (type is null) return Error.NotFound("Oda tipi bulunamadı.");

        var rooms = await db.Rooms.AsNoTracking().Where(x => x.RoomTypeId == id).Select(x => new { x.Id, x.ApartmentId, x.Beds }).ToListAsync(ct);
        var roomIds = rooms.Select(x => x.Id).ToList();
        var prices = await db.RoomTypePrices.CountAsync(x => x.RoomTypeId == id, ct);
        var enrollments = await db.Enrollments.CountAsync(x => x.RoomTypeId == id, ct);
        var pendingApps = await db.Applications.CountAsync(x => x.RoomTypeId == id && x.Status == ApplicationStatus.Pending, ct);
        var (residents, past) = await PlacementsAsync(roomIds, ct);

        string? blocked = null;
        if (enrollments > 0)
            blocked = $"Bu oda tipiyle kayıtlı {enrollments} öğrenci kaydı var. Silinirse bu kayıtlar listelerden kaybolur; bu yüzden silinemez. Bunun yerine “Sitede göster”i kapatın.";
        else if (pendingApps > 0)
            blocked = $"Bu oda tipini seçmiş {pendingApps} bekleyen başvuru var. Önce başvuruları onaylayın ya da reddedin.";
        else if (residents > 0)
            blocked = $"Bu oda tipindeki odalarda şu an ya da ileri tarihte yerleşik {residents} öğrenci var. Önce yerleşimlerini taşıyın ya da sonlandırın.";

        return new DeleteImpact("roomtype", type.Name.Tr, rooms.Select(x => x.ApartmentId).Distinct().Count(), rooms.Count, rooms.Sum(x => x.Beds),
            prices, 0, pendingApps, enrollments, residents, past, blocked);
    }

    public async Task<Result<DeleteImpact>> RoomImpactAsync(Guid id, CancellationToken ct)
    {
        var room = await db.Rooms.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.Name, x.Beds }).FirstOrDefaultAsync(ct);
        if (room is null) return Error.NotFound("Oda bulunamadı.");

        var (residents, past) = await PlacementsAsync([id], ct);
        var pending = await PendingPreferringAsync([id], ct);
        var blocked = residents > 0
            ? $"Bu odada şu an ya da ileri tarihte yerleşik {residents} öğrenci var. Önce yerleşimini başka odaya taşıyın ya da sonlandırın."
            : null;
        return new DeleteImpact("room", room.Name, 0, 1, room.Beds, 0, 0, pending, 0, residents, past, blocked);
    }

    // ───────── silme ─────────

    public async Task<Result> DeleteApartmentAsync(Guid id, CancellationToken ct)
    {
        var impact = await ApartmentImpactAsync(id, ct);
        if (!impact.IsSuccess) return impact.Error!;
        if (impact.Value!.BlockedReason is { } reason) return Error.Conflict(reason);

        var apartment = await db.Apartments.Include(x => x.Media).FirstAsync(x => x.Id == id, ct);
        var rooms = await db.Rooms.Where(x => x.ApartmentId == id).ToListAsync(ct);
        await ClearPreferencesAsync(rooms.Select(x => x.Id).ToList(), ct);

        db.ApartmentMedia.RemoveRange(apartment.Media); // dosyalar medya kitaplığında kalır
        db.Rooms.RemoveRange(rooms);
        db.Apartments.Remove(apartment);
        audit.Add("apartment.delete", "apartment", id, before: new { apartment.Name, rooms = rooms.Count, beds = rooms.Sum(x => x.Beds) });
        await db.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> DeleteRoomTypeAsync(Guid id, CancellationToken ct)
    {
        var impact = await RoomTypeImpactAsync(id, ct);
        if (!impact.IsSuccess) return impact.Error!;
        if (impact.Value!.BlockedReason is { } reason) return Error.Conflict(reason);

        var type = await db.RoomTypes.FirstAsync(x => x.Id == id, ct);
        var rooms = await db.Rooms.Where(x => x.RoomTypeId == id).ToListAsync(ct);
        var prices = await db.RoomTypePrices.Where(x => x.RoomTypeId == id).ToListAsync(ct);
        await ClearPreferencesAsync(rooms.Select(x => x.Id).ToList(), ct);
        foreach (var room in rooms) await RoomSaveHandler.UntagAsync(db, room.ApartmentId, room.Id, ct);

        db.Rooms.RemoveRange(rooms);
        db.RoomTypePrices.RemoveRange(prices);
        db.RoomTypes.Remove(type);
        audit.Add("roomtype.delete", "roomtype", id, before: new { type.Name, type.Slug, rooms = rooms.Count, prices = prices.Count });
        await db.SaveChangesAsync(ct);
        return Result.Success();
    }

    public async Task<Result> DeleteRoomAsync(Guid id, CancellationToken ct)
    {
        var impact = await RoomImpactAsync(id, ct);
        if (!impact.IsSuccess) return impact.Error!;
        if (impact.Value!.BlockedReason is { } reason) return Error.Conflict(reason);

        var room = await db.Rooms.FirstAsync(x => x.Id == id, ct);
        await ClearPreferencesAsync([id], ct);
        await RoomSaveHandler.UntagAsync(db, room.ApartmentId, room.Id, ct);
        db.Rooms.Remove(room);
        audit.Add("room.delete", "room", id, before: new { room.Name, room.ApartmentId, room.Beds });
        await db.SaveChangesAsync(ct);
        return Result.Success();
    }

    // ───────── yardımcılar ─────────

    /// <summary>Şu an / ileride yerleşik öğrenci sayısı ve geçmişte biten yerleşim kaydı sayısı</summary>
    private async Task<(int Residents, int Past)> PlacementsAsync(List<Guid> roomIds, CancellationToken ct)
    {
        if (roomIds.Count == 0) return (0, 0);
        var today = TurkeyClock.Today;
        var residents = await db.Placements.Where(x => roomIds.Contains(x.RoomId) && x.EndDate >= today).Select(x => x.EnrollmentId).Distinct().CountAsync(ct);
        var past = await db.Placements.CountAsync(x => roomIds.Contains(x.RoomId) && x.EndDate < today, ct);
        return (residents, past);
    }

    private async Task<int> PendingPreferringAsync(List<Guid> roomIds, CancellationToken ct) =>
        roomIds.Count == 0 ? 0 : await db.Applications.CountAsync(x => x.PreferredRoomId != null && roomIds.Contains(x.PreferredRoomId.Value) && x.Status != ApplicationStatus.Rejected, ct);

    /// <summary>Silinen odayı yatak tercihi olarak seçmiş başvurularda tercih temizlenir (SaveChanges çağırana aittir)</summary>
    private async Task ClearPreferencesAsync(List<Guid> roomIds, CancellationToken ct)
    {
        if (roomIds.Count == 0) return;
        var apps = await db.Applications.Where(x => x.PreferredRoomId != null && roomIds.Contains(x.PreferredRoomId.Value)).ToListAsync(ct);
        foreach (var app in apps) app.PreferredRoomId = null;
    }
}

/// <summary>Silme öncesi etki özeti uçları (yalnızca yönetici)</summary>
public static class DeleteImpactEndpoints
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/admin/apartments/{id:guid}/delete-impact", async (Guid id, StructureDeletionHandler h, CancellationToken ct) =>
                (await h.ApartmentImpactAsync(id, ct)).ToOk());
            app.MapGet("/api/admin/room-types/{id:guid}/delete-impact", async (Guid id, StructureDeletionHandler h, CancellationToken ct) =>
                (await h.RoomTypeImpactAsync(id, ct)).ToOk());
            app.MapGet("/api/admin/rooms/{id:guid}/delete-impact", async (Guid id, StructureDeletionHandler h, CancellationToken ct) =>
                (await h.RoomImpactAsync(id, ct)).ToOk());
        }
    }
}
