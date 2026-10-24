using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Features.Apartments;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Rooms;

/// <summary>Oda girişi: daire, oda tipi, ad ("1. Sol Oda"), yatak sayısı, durum, oda özellikleri (yatak, masa, gardırop...)</summary>
public record RoomInput(Guid ApartmentId, Guid RoomTypeId, string? Name, int Beds, RoomStatus Status, int Order, List<FeatureItem>? Features);

public class RoomSaveHandler(AppDbContext db, AuditWriter audit)
{
    public async Task<Result<Guid>> Save(Room? existing, RoomInput input, CancellationToken ct)
    {
        var name = (input.Name ?? "").Trim();
        var validator = new Validator()
            .Required("name", name, "Oda adını yazın (örn. 1. Sol Oda).").MaxLength("name", name, 60)
            .Must("beds", input.Beds is >= 1 and <= 12, "Yatak sayısı 1 ile 12 arasında olmalı.")
            .Must("status", Enum.IsDefined(input.Status), "Durum seçin.");
        var features = FeatureItems.Clean(input.Features, "features", validator);

        if (!await db.Apartments.AnyAsync(x => x.Id == input.ApartmentId, ct)) validator.AddError("apartmentId", "Daire bulunamadı.");
        if (!await db.RoomTypes.AnyAsync(x => x.Id == input.RoomTypeId, ct)) validator.AddError("roomTypeId", "Oda tipi bulunamadı.");
        if (!validator.IsValid) return validator.ToFailure<Guid>();

        // Türlü dairede yalnızca o türün oda seçenekleri (ya da türsüz eski oda tipleri) kullanılabilir
        var apartmentTypeId = await db.Apartments.Where(x => x.Id == input.ApartmentId).Select(x => x.ApartmentTypeId).FirstAsync(ct);
        var optionTypeId = await db.RoomTypes.Where(x => x.Id == input.RoomTypeId).Select(x => x.ApartmentTypeId).FirstAsync(ct);
        if (apartmentTypeId is not null && optionTypeId is not null && apartmentTypeId != optionTypeId)
            return Error.Field("roomTypeId", "Bu oda seçeneği, dairenin türüne ait değil.");

        var id = existing?.Id;
        if (await db.Rooms.AnyAsync(x => x.ApartmentId == input.ApartmentId && x.Name == name && x.Id != id, ct))
            return Error.Conflict("Bu dairede aynı adda bir oda var.");

        // Odada şu an ya da ileride kalan öğrenci varken: kapatma/bakıma alma, oda tipi değiştirme, başka daireye taşıma
        // ve yatak sayısını kalan öğrenci sayısının altına düşürme engellenir.
        if (existing is not null)
        {
            var today = TurkeyClock.Today;
            var upcoming = await db.Placements.Where(p => p.RoomId == existing.Id && p.EndDate >= today).ToListAsync(ct);
            if (upcoming.Count > 0)
            {
                if (input.Status != RoomStatus.Active)
                    return Error.Conflict("Bu odada şu an ya da ileride kalan öğrenci var; kapatmadan/bakıma almadan önce odalarını değiştirin.");
                if (input.RoomTypeId != existing.RoomTypeId)
                    return Error.Conflict("Bu odada kalan öğrenci var; oda tipi değiştirilemez.");
                if (input.ApartmentId != existing.ApartmentId)
                    return Error.Conflict("Bu odada kalan öğrenci var; başka daireye taşınamaz.");

                var start = upcoming.Min(p => p.StartDate) < today ? today : upcoming.Min(p => p.StartDate);
                var end = upcoming.Max(p => p.EndDate);
                if (Features.Enrollments.PlacementRules.Peak(upcoming, existing.Id, start, end) > input.Beds)
                    return Error.Conflict("Yatak sayısı, odada kalan öğrenci sayısından az olamaz.");
            }
        }

        var before = existing is null ? null : new { existing.Name, existing.ApartmentId, existing.RoomTypeId, existing.Beds, existing.Status };
        var room = existing ?? new Room();

        // Başka daireye taşınan odanın eski dairedeki fotoğraf etiketleri kaldırılır (oda artık orada değil)
        if (existing is not null && existing.ApartmentId != input.ApartmentId)
            await UntagAsync(db, existing.ApartmentId, existing.Id, ct);

        room.ApartmentId = input.ApartmentId;
        room.RoomTypeId = input.RoomTypeId;
        room.Name = name;
        room.Beds = input.Beds;
        room.Status = input.Status;
        room.OrderIndex = input.Order;
        room.Features = features;

        if (existing is null) db.Rooms.Add(room);
        audit.Add(existing is null ? "room.create" : "room.update", "room", room.Id, before: before,
            after: new { room.Name, room.ApartmentId, room.RoomTypeId, room.Beds, room.Status });
        await db.SaveChangesAsync(ct);
        return room.Id;
    }

    /// <summary>Bir odaya etiketli galeri öğelerinin etiketini kaldırır (SaveChanges çağırana aittir)</summary>
    public static async Task UntagAsync(AppDbContext db, Guid apartmentId, Guid roomId, CancellationToken ct)
    {
        var tagged = await db.ApartmentMedia
            .Where(x => x.ApartmentId == apartmentId && x.TagKind == GalleryTagKind.Room && x.RoomId == roomId)
            .ToListAsync(ct);
        foreach (var item in tagged)
        {
            item.TagKind = GalleryTagKind.None;
            item.RoomId = null;
        }
    }
}

public static class CreateRoom
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/rooms", async (RoomInput input, RoomSaveHandler saver, GetApartmentsAdmin.Handler list, CancellationToken ct) =>
            {
                var saved = await saver.Save(null, input, ct);
                return saved.IsSuccess ? Results.Ok(await list.One(input.ApartmentId, ct)) : saved.Error!.ToProblem();
            });
    }
}

public static class UpdateRoom
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/rooms/{id:guid}", async (Guid id, RoomInput input, AppDbContext db, RoomSaveHandler saver,
                GetApartmentsAdmin.Handler list, CancellationToken ct) =>
            {
                var existing = await db.Rooms.FirstOrDefaultAsync(x => x.Id == id, ct);
                if (existing is null) return Error.NotFound("Oda bulunamadı.").ToProblem();

                var saved = await saver.Save(existing, input, ct);
                return saved.IsSuccess ? Results.Ok(await list.One(input.ApartmentId, ct)) : saved.Error!.ToProblem();
            });
    }
}

/// <summary>Oda silme (soft delete): yerleşik öğrencisi olan oda silinemez. Kurallar: Features/Structure/StructureDeletion.cs</summary>
public static class DeleteRoom
{
    public class Handler(MazlumApart.Features.Structure.StructureDeletionHandler deletion)
    {
        public Task<Result> Handle(Guid id, CancellationToken ct) => deletion.DeleteRoomAsync(id, ct);
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapDelete("/api/admin/rooms/{id:guid}", async (Guid id, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, ct)).ToNoContent());
    }
}
