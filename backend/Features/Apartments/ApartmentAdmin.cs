using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Apartments;

public record CapacityDto(int Beds, int? PerKitchen, int? PerBathroom);

public record RoomAdminDto(Guid Id, string Name, Guid RoomTypeId, string RoomTypeName, int Beds, RoomStatus Status, List<FeatureItem> Features, int Order);

public record GallerySummaryDto(int Photos, bool HasVideo, int Untagged);

/// <summary>Panel "Daireler & Odalar" satırı. Kişi sayıları aktif odaların yataklarından hesaplanır (elle girilmez).</summary>
public record ApartmentAdminDto(
    Guid Id,
    string Name,
    string Slug,
    int Floor,
    int Kitchens,
    int Bathrooms,
    string? Note,
    bool Published,
    int Order,
    List<FeatureItem> SharedAreas,
    CapacityDto Capacity,
    List<RoomAdminDto> Rooms,
    GallerySummaryDto Gallery);

public record ApartmentInput(
    string? Name, string? Slug, int Floor, int Kitchens, int Bathrooms, string? Note, bool Published, int Order, List<FeatureItem>? SharedAreas);

public static class FeatureItems
{
    /// <summary>İkonlu madde listesi doğrulama + temizleme (boş satırlar atılır)</summary>
    public static List<FeatureItem> Clean(List<FeatureItem>? items, string field, Validator validator, int max = 20)
    {
        var list = (items ?? []).Where(x => x is not null && !string.IsNullOrWhiteSpace(x.Text?.Tr)).ToList();
        if (list.Count > max) validator.AddError(field, $"En fazla {max} madde eklenebilir.");

        for (var i = 0; i < list.Count; i++)
        {
            var item = list[i];
            if (item.Text.Tr.Length > 120 || item.Text.En?.Length > 120) validator.AddError($"{field}[{i}].text", "Madde en fazla 120 karakter olabilir.");
            if (item.Icon?.Length > 40) validator.AddError($"{field}[{i}].icon", "İkon adı geçersiz.");
        }

        return list.Select(x => new FeatureItem
        {
            Icon = string.IsNullOrWhiteSpace(x.Icon) ? "check_circle" : x.Icon.Trim(),
            Text = x.Text.Trimmed()
        }).ToList();
    }
}

public static class GetApartmentsAdmin
{
    public class Handler(AppDbContext db)
    {
        public async Task<List<ApartmentAdminDto>> Handle(CancellationToken ct)
        {
            var apartments = await db.Apartments.AsNoTracking()
                .Include(x => x.Rooms).ThenInclude(r => r.RoomType)
                .Include(x => x.Media).ThenInclude(m => m.MediaAsset)
                .OrderBy(x => x.OrderIndex).ThenBy(x => x.Name)
                .AsSplitQuery()
                .ToListAsync(ct);

            return apartments.Select(ToDto).ToList();
        }

        public async Task<ApartmentAdminDto?> One(Guid id, CancellationToken ct) =>
            (await Handle(ct)).FirstOrDefault(x => x.Id == id);

        private static ApartmentAdminDto ToDto(Apartment a)
        {
            var activeBeds = a.Rooms.Where(r => r.Status == RoomStatus.Active).Sum(r => r.Beds);
            var roomIds = a.Rooms.Select(r => r.Id).ToHashSet();
            var media = a.Media.Where(m => m.MediaAsset is not null).ToList();

            return new ApartmentAdminDto(
                a.Id, a.Name, a.Slug, a.Floor, a.Kitchens, a.Bathrooms, a.Note, a.IsPublished, a.OrderIndex, a.SharedAreas,
                new CapacityDto(activeBeds,
                    a.Kitchens > 0 ? (int)Math.Ceiling(activeBeds / (double)a.Kitchens) : null,
                    a.Bathrooms > 0 ? (int)Math.Ceiling(activeBeds / (double)a.Bathrooms) : null),
                a.Rooms.OrderBy(r => r.OrderIndex).ThenBy(r => r.Name)
                    .Select(r => new RoomAdminDto(r.Id, r.Name, r.RoomTypeId, r.RoomType?.Name.Tr ?? "", r.Beds, r.Status, r.Features, r.OrderIndex))
                    .ToList(),
                new GallerySummaryDto(
                    media.Count(m => !m.IsVideo),
                    media.Any(m => m.IsVideo),
                    media.Count(m => !m.IsVideo && (m.TagKind == GalleryTagKind.None || (m.TagKind == GalleryTagKind.Room && !roomIds.Contains(m.RoomId ?? Guid.Empty))))));
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/apartments", async (Handler handler, CancellationToken ct) => Results.Ok(await handler.Handle(ct)));
    }
}

public class ApartmentSaveHandler(AppDbContext db, AuditWriter audit)
{
    public async Task<Result<Guid>> Save(Apartment? existing, ApartmentInput input, CancellationToken ct)
    {
        var name = (input.Name ?? "").Trim();
        var validator = new Validator()
            .Required("name", name, "Daire adını yazın.").MaxLength("name", name, 60)
            .Must("floor", input.Floor is >= -5 and <= 100, "Kat geçersiz.")
            .Must("kitchens", input.Kitchens is >= 0 and <= 10, "Mutfak sayısı geçersiz.")
            .Must("bathrooms", input.Bathrooms is >= 0 and <= 10, "Banyo sayısı geçersiz.")
            .MaxLength("note", input.Note, 500);
        var shared = FeatureItems.Clean(input.SharedAreas, "sharedAreas", validator);
        var plan = SlugResolver.Plan(input.Slug, existing?.Slug, name, validator);
        if (!validator.IsValid) return validator.ToFailure<Guid>();

        var id = existing?.Id;
        if (await db.Apartments.AnyAsync(x => x.Name == name && x.Id != id, ct))
            return Error.Conflict("Bu adda bir daire zaten var.");

        var (slug, conflict) = await SlugResolver.EnsureUniqueAsync(plan, existing is null,
            s => db.Apartments.AnyAsync(x => x.Slug == s && x.Id != id, ct));
        if (conflict is not null) return conflict;

        var before = existing is null ? null : new { existing.Name, existing.Floor, existing.Kitchens, existing.Bathrooms, existing.IsPublished };
        var apartment = existing ?? new Apartment();
        apartment.Name = name;
        apartment.Slug = slug;
        apartment.Floor = input.Floor;
        apartment.Kitchens = input.Kitchens;
        apartment.Bathrooms = input.Bathrooms;
        apartment.Note = string.IsNullOrWhiteSpace(input.Note) ? null : input.Note.Trim();
        apartment.IsPublished = input.Published;
        apartment.OrderIndex = input.Order;
        apartment.SharedAreas = shared;

        if (existing is null) db.Apartments.Add(apartment);
        audit.Add(existing is null ? "apartment.create" : "apartment.update", "apartment", apartment.Id, before: before,
            after: new { apartment.Name, apartment.Floor, apartment.Kitchens, apartment.Bathrooms, apartment.IsPublished });
        await db.SaveChangesAsync(ct);
        return apartment.Id;
    }
}

public static class CreateApartment
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/apartments", async (ApartmentInput input, ApartmentSaveHandler saver, GetApartmentsAdmin.Handler list, CancellationToken ct) =>
            {
                var saved = await saver.Save(null, input, ct);
                return saved.IsSuccess ? Results.Ok(await list.One(saved.Value, ct)) : saved.Error!.ToProblem();
            });
    }
}

public static class UpdateApartment
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/apartments/{id:guid}", async (Guid id, ApartmentInput input, AppDbContext db, ApartmentSaveHandler saver,
                GetApartmentsAdmin.Handler list, CancellationToken ct) =>
            {
                var existing = await db.Apartments.FirstOrDefaultAsync(x => x.Id == id, ct);
                if (existing is null) return Error.NotFound("Daire bulunamadı.").ToProblem();

                var saved = await saver.Save(existing, input, ct);
                return saved.IsSuccess ? Results.Ok(await list.One(id, ct)) : saved.Error!.ToProblem();
            });
    }
}

/// <summary>Silme: odası olan daire silinemez. Galeri bağlantıları da kaldırılır (dosyalar medya kitaplığında kalır).</summary>
public static class DeleteApartment
{
    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result> Handle(Guid id, CancellationToken ct)
        {
            var apartment = await db.Apartments.Include(x => x.Media).FirstOrDefaultAsync(x => x.Id == id, ct);
            if (apartment is null) return Error.NotFound("Daire bulunamadı.");
            if (await db.Rooms.AnyAsync(x => x.ApartmentId == id, ct)) return Error.Conflict("Bu dairede oda var. Önce odaları kaldırın.");

            db.ApartmentMedia.RemoveRange(apartment.Media);
            db.Apartments.Remove(apartment);
            audit.Add("apartment.delete", "apartment", id, before: new { apartment.Name });
            await db.SaveChangesAsync(ct);
            return Result.Success();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapDelete("/api/admin/apartments/{id:guid}", async (Guid id, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, ct)).ToNoContent());
    }
}
