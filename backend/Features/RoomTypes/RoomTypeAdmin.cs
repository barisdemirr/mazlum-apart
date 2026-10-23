using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.RoomTypes;

/// <summary>Panel kartı: içerik + oda/yatak sayıları + seçili dönemin fiyatı</summary>
public record RoomTypeAdminDto(
    Guid Id,
    string Slug,
    LocalizedText Name,
    LocalizedText Description,
    Guid? CoverMediaId,
    string? CoverUrl,
    bool Active,
    int Order,
    int Rooms,
    int Beds,
    int Apartments,
    decimal? Monthly,
    decimal? Deposit,
    decimal? SummerMonthly = null);

/// <summary>Oda tipi girişi: ad (TR zorunlu), slug (boşsa addan), açıklama, kapak (medya id), sitede göster, sıra</summary>
public record RoomTypeInput(LocalizedText? Name, string? Slug, LocalizedText? Description, Guid? CoverMediaId, bool Active, int Order);

public static class GetRoomTypesAdmin
{
    public class Handler(AppDbContext db)
    {
        public async Task<List<RoomTypeAdminDto>> Handle(Guid? periodId, CancellationToken ct)
        {
            var types = await db.RoomTypes.AsNoTracking().Include(x => x.CoverMedia)
                .OrderBy(x => x.OrderIndex).ThenBy(x => x.CreatedAt).ToListAsync(ct);
            var rooms = await db.Rooms.AsNoTracking().Select(x => new { x.RoomTypeId, x.ApartmentId, x.Beds, x.Status }).ToListAsync(ct);
            var prices = periodId is null
                ? new List<RoomTypePrice>()
                : await db.RoomTypePrices.AsNoTracking().Where(x => x.PeriodId == periodId).ToListAsync(ct);

            return types.Select(t =>
            {
                var own = rooms.Where(r => r.RoomTypeId == t.Id).ToList();
                var price = prices.FirstOrDefault(p => p.RoomTypeId == t.Id);
                return new RoomTypeAdminDto(
                    t.Id, t.Slug, t.Name, t.Description ?? new LocalizedText(), t.CoverMediaId, t.CoverMedia?.FilePath, t.IsActive, t.OrderIndex,
                    own.Count, own.Where(r => r.Status == RoomStatus.Active).Sum(r => r.Beds), own.Select(r => r.ApartmentId).Distinct().Count(),
                    price?.Monthly, price?.Deposit, price?.SummerMonthly);
            }).ToList();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/room-types", async (Guid? periodId, Handler handler, CancellationToken ct) =>
                Results.Ok(await handler.Handle(periodId, ct)));
    }
}

/// <summary>Oluşturma ve güncelleme ortak kaydı</summary>
public class RoomTypeSaveHandler(AppDbContext db, AuditWriter audit)
{
    public async Task<Result<Guid>> Save(RoomType? existing, RoomTypeInput input, CancellationToken ct)
    {
        var validator = new Validator()
            .LocalizedRequired("name", input.Name, 80)
            .LocalizedOptional("description", input.Description, 4000);

        var plan = SlugResolver.Plan(input.Slug, existing?.Slug, input.Name?.Tr, validator);

        if (input.CoverMediaId is { } coverId &&
            !await db.MediaAssets.AnyAsync(x => x.Id == coverId && x.Kind == MediaKind.Image, ct))
            validator.AddError("coverMediaId", "Kapak görseli bulunamadı.");

        if (!validator.IsValid) return validator.ToFailure<Guid>();

        var id = existing?.Id;
        var (slug, conflict) = await SlugResolver.EnsureUniqueAsync(plan, existing is null,
            s => db.RoomTypes.AnyAsync(x => x.Slug == s && x.Id != id, ct));
        if (conflict is not null) return conflict;

        var before = existing is null ? null : new { existing.Name, existing.Slug, existing.IsActive };
        var type = existing ?? new RoomType();
        type.Name = input.Name!.Trimmed();
        type.Slug = slug;
        type.Description = input.Description.OrNull();
        type.CoverMediaId = input.CoverMediaId;
        type.IsActive = input.Active;
        type.OrderIndex = input.Order;

        if (existing is null) db.RoomTypes.Add(type);
        audit.Add(existing is null ? "roomtype.create" : "roomtype.update", "roomtype", type.Id,
            before: before, after: new { type.Name, type.Slug, type.IsActive });
        await db.SaveChangesAsync(ct);
        return type.Id;
    }
}

public static class CreateRoomType
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/room-types", async (RoomTypeInput input, RoomTypeSaveHandler saver, GetRoomTypesAdmin.Handler list, CancellationToken ct) =>
            {
                var saved = await saver.Save(null, input, ct);
                if (!saved.IsSuccess) return saved.Error!.ToProblem();
                return Results.Ok((await list.Handle(null, ct)).First(x => x.Id == saved.Value));
            });
    }
}

public static class UpdateRoomType
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/room-types/{id:guid}", async (Guid id, RoomTypeInput input, AppDbContext db, RoomTypeSaveHandler saver,
                GetRoomTypesAdmin.Handler list, CancellationToken ct) =>
            {
                var existing = await db.RoomTypes.FirstOrDefaultAsync(x => x.Id == id, ct);
                if (existing is null) return Error.NotFound("Oda tipi bulunamadı.").ToProblem();

                var saved = await saver.Save(existing, input, ct);
                if (!saved.IsSuccess) return saved.Error!.ToProblem();
                return Results.Ok((await list.Handle(null, ct)).First(x => x.Id == id));
            });
    }
}

/// <summary>Silme: odası ya da fiyatı olan oda tipi silinemez (önce pasife alın)</summary>
public static class DeleteRoomType
{
    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result> Handle(Guid id, CancellationToken ct)
        {
            var type = await db.RoomTypes.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (type is null) return Error.NotFound("Oda tipi bulunamadı.");

            if (await db.Rooms.AnyAsync(x => x.RoomTypeId == id, ct))
                return Error.Conflict("Bu oda tipinde odalar var. Silmek yerine “Sitede göster”i kapatın.");
            if (await db.Applications.AnyAsync(x => x.RoomTypeId == id, ct) || await db.Enrollments.AnyAsync(x => x.RoomTypeId == id, ct))
                return Error.Conflict("Bu oda tipiyle yapılmış başvuru/kayıt var. Silmek yerine “Sitede göster”i kapatın.");
            if (await db.RoomTypePrices.AnyAsync(x => x.RoomTypeId == id, ct))
                return Error.Conflict("Bu oda tipinin dönem fiyatları var. Silmek yerine “Sitede göster”i kapatın.");

            db.RoomTypes.Remove(type);
            audit.Add("roomtype.delete", "roomtype", id, before: new { type.Name, type.Slug });
            await db.SaveChangesAsync(ct);
            return Result.Success();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapDelete("/api/admin/room-types/{id:guid}", async (Guid id, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, ct)).ToNoContent());
    }
}
