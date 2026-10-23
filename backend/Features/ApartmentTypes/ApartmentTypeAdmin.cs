using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.ApartmentTypes;

/// <summary>Türün altındaki oda seçeneği: kaç oda/yatak var ve seçili dönemin fiyatı (fiyat Dönemler & Fiyatlar sayfasından girilir)</summary>
public record ApartmentTypeOptionDto(Guid Id, LocalizedText Name, bool Active, int Rooms, int Beds, decimal? Monthly, decimal? Deposit);

/// <summary>Panel kartı. Kontenjan = türdeki daire sayısı (her dairenin odaları ayrıca sayılır); elle girilmez.</summary>
public record ApartmentTypeAdminDto(
    Guid Id, string Slug, LocalizedText Name, LocalizedText Description, Guid? CoverMediaId, string? CoverUrl, bool Active, int Order,
    int Apartments, int Rooms, int Beds, List<ApartmentTypeOptionDto> Options);

public record ApartmentTypeInput(LocalizedText? Name, string? Slug, LocalizedText? Description, Guid? CoverMediaId, bool Active, int Order);

public static class GetApartmentTypesAdmin
{
    public class Handler(AppDbContext db)
    {
        public async Task<List<ApartmentTypeAdminDto>> Handle(Guid? periodId, CancellationToken ct)
        {
            var types = await db.ApartmentTypes.AsNoTracking().Include(x => x.CoverMedia)
                .OrderBy(x => x.OrderIndex).ThenBy(x => x.CreatedAt).ToListAsync(ct);
            var apartments = await db.Apartments.AsNoTracking().Select(x => new { x.Id, x.ApartmentTypeId }).ToListAsync(ct);
            var options = await db.RoomTypes.AsNoTracking().Where(x => x.ApartmentTypeId != null)
                .OrderBy(x => x.OrderIndex).ThenBy(x => x.CreatedAt).ToListAsync(ct);
            var rooms = await db.Rooms.AsNoTracking().Select(x => new { x.RoomTypeId, x.ApartmentId, x.Beds, x.Status }).ToListAsync(ct);
            var prices = periodId is null
                ? new List<RoomTypePrice>()
                : await db.RoomTypePrices.AsNoTracking().Where(x => x.PeriodId == periodId).ToListAsync(ct);

            return types.Select(t =>
            {
                var own = options.Where(o => o.ApartmentTypeId == t.Id).Select(o =>
                {
                    var r = rooms.Where(x => x.RoomTypeId == o.Id).ToList();
                    var price = prices.FirstOrDefault(p => p.RoomTypeId == o.Id);
                    return new ApartmentTypeOptionDto(o.Id, o.Name, o.IsActive, r.Count, r.Where(x => x.Status == RoomStatus.Active).Sum(x => x.Beds), price?.Monthly, price?.Deposit);
                }).ToList();
                return new ApartmentTypeAdminDto(
                    t.Id, t.Slug, t.Name, t.Description ?? new LocalizedText(), t.CoverMediaId, t.CoverMedia?.FilePath, t.IsActive, t.OrderIndex,
                    apartments.Count(a => a.ApartmentTypeId == t.Id), own.Sum(o => o.Rooms), own.Sum(o => o.Beds), own);
            }).ToList();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/apartment-types", async (Guid? periodId, Handler handler, CancellationToken ct) =>
                Results.Ok(await handler.Handle(periodId, ct)));
    }
}

public class ApartmentTypeSaveHandler(AppDbContext db, AuditWriter audit)
{
    public async Task<Result<Guid>> Save(ApartmentType? existing, ApartmentTypeInput input, CancellationToken ct)
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
            s => db.ApartmentTypes.AnyAsync(x => x.Slug == s && x.Id != id, ct));
        if (conflict is not null) return conflict;

        var before = existing is null ? null : new { existing.Name, existing.Slug, existing.IsActive };
        var type = existing ?? new ApartmentType();
        type.Name = input.Name!.Trimmed();
        type.Slug = slug;
        type.Description = input.Description.OrNull();
        type.CoverMediaId = input.CoverMediaId;
        type.IsActive = input.Active;
        type.OrderIndex = input.Order;

        if (existing is null) db.ApartmentTypes.Add(type);
        audit.Add(existing is null ? "apartmenttype.create" : "apartmenttype.update", "apartmenttype", type.Id,
            before: before, after: new { type.Name, type.Slug, type.IsActive });
        await db.SaveChangesAsync(ct);
        return type.Id;
    }
}

public static class CreateApartmentType
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/apartment-types", async (ApartmentTypeInput input, ApartmentTypeSaveHandler saver, GetApartmentTypesAdmin.Handler list, CancellationToken ct) =>
            {
                var saved = await saver.Save(null, input, ct);
                if (!saved.IsSuccess) return saved.Error!.ToProblem();
                return Results.Ok((await list.Handle(null, ct)).First(x => x.Id == saved.Value));
            });
    }
}

public static class UpdateApartmentType
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/apartment-types/{id:guid}", async (Guid id, ApartmentTypeInput input, AppDbContext db, ApartmentTypeSaveHandler saver,
                GetApartmentTypesAdmin.Handler list, CancellationToken ct) =>
            {
                var existing = await db.ApartmentTypes.FirstOrDefaultAsync(x => x.Id == id, ct);
                if (existing is null) return Error.NotFound("Daire türü bulunamadı.").ToProblem();

                var saved = await saver.Save(existing, input, ct);
                if (!saved.IsSuccess) return saved.Error!.ToProblem();
                return Results.Ok((await list.Handle(null, ct)).First(x => x.Id == id));
            });
    }
}

/// <summary>Silme: dairesi ya da oda seçeneği olan tür silinemez (önce pasife alın)</summary>
public static class DeleteApartmentType
{
    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result> Handle(Guid id, CancellationToken ct)
        {
            var type = await db.ApartmentTypes.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (type is null) return Error.NotFound("Daire türü bulunamadı.");
            if (await db.Apartments.AnyAsync(x => x.ApartmentTypeId == id, ct))
                return Error.Conflict("Bu türde daireler var. Silmek yerine “Sitede göster”i kapatın.");
            if (await db.RoomTypes.AnyAsync(x => x.ApartmentTypeId == id, ct))
                return Error.Conflict("Bu türün oda seçenekleri var. Silmek yerine “Sitede göster”i kapatın.");

            db.ApartmentTypes.Remove(type);
            audit.Add("apartmenttype.delete", "apartmenttype", id, before: new { type.Name, type.Slug });
            await db.SaveChangesAsync(ct);
            return Result.Success();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapDelete("/api/admin/apartment-types/{id:guid}", async (Guid id, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, ct)).ToNoContent());
    }
}
