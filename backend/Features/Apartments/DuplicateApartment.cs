using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Apartments;

/// <summary>Daire kopyalama girdisi: ilk kopyanın adı ve kaç kopya açılacağı (1–20)</summary>
public record DuplicateApartmentInput(string? Name, int Count = 1);

/// <summary>
/// Aynı türden birden fazla daire için: dairenin bilgilerini, ortak alanlarını ve odalarını (ad, oda seçeneği, yatak, özellikler)
/// kopyalar. Galeri (fotoğraf/video) kopyalanmaz ve kopyalar sitede GİZLİ açılır: her dairenin kendi fotoğrafı eklendikten sonra açılır.
/// Kopya adları: son rakam artırılır ("Daire 5" → "Daire 6", "Daire 7"); rakam yoksa " 2", " 3" eklenir.
/// </summary>
public static class DuplicateApartment
{
    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result<List<Guid>>> Handle(Guid id, DuplicateApartmentInput input, CancellationToken ct)
        {
            var name = (input.Name ?? "").Trim();
            var validator = new Validator()
                .Required("name", name, "Yeni dairenin adını yazın.").MaxLength("name", name, 60)
                .Must("count", input.Count is >= 1 and <= 20, "Kopya sayısı 1 ile 20 arasında olmalı.");
            if (!validator.IsValid) return validator.ToFailure<List<Guid>>();

            var source = await db.Apartments.AsNoTracking().Include(x => x.Rooms).FirstOrDefaultAsync(x => x.Id == id, ct);
            if (source is null) return Error.NotFound("Daire bulunamadı.");

            var names = Enumerable.Range(0, input.Count).Select(i => NameFor(name, i)).ToList();
            if (names.Any(n => n.Length > 60)) return Error.Field("name", "Kopya adları en fazla 60 karakter olabilir.");
            var taken = await db.Apartments.Where(x => names.Contains(x.Name)).Select(x => x.Name).ToListAsync(ct);
            if (taken.Count > 0) return Error.Conflict($"Bu adda daire zaten var: {string.Join(", ", taken)}.");

            var created = new List<Apartment>();
            foreach (var copyName in names)
            {
                var plan = SlugResolver.Plan(null, null, copyName, new Validator());
                var (slug, conflict) = await SlugResolver.EnsureUniqueAsync(plan, true,
                    s => db.Apartments.AnyAsync(x => x.Slug == s, ct));
                if (conflict is not null) return conflict;

                var copy = new Apartment
                {
                    ApartmentTypeId = source.ApartmentTypeId,
                    Name = copyName,
                    Slug = slug,
                    Floor = source.Floor,
                    Kitchens = source.Kitchens,
                    Bathrooms = source.Bathrooms,
                    Note = source.Note,
                    Description = source.Description,
                    IsPublished = false,
                    OrderIndex = source.OrderIndex,
                    SharedAreas = source.SharedAreas.ToList(),
                    Rooms = source.Rooms.OrderBy(r => r.OrderIndex).Select(r => new Room
                    {
                        RoomTypeId = r.RoomTypeId,
                        Name = r.Name,
                        Beds = r.Beds,
                        Status = r.Status,
                        Features = r.Features.ToList(),
                        OrderIndex = r.OrderIndex,
                    }).ToList(),
                };
                db.Apartments.Add(copy);
                created.Add(copy);
                audit.Add("apartment.duplicate", "apartment", copy.Id, after: new { copy.Name, from = source.Name, rooms = copy.Rooms.Count });
                await db.SaveChangesAsync(ct); // sıradaki kopyanın slug kontrolü bunu görsün
            }
            return created.Select(x => x.Id).ToList();
        }

        /// <summary>0. kopya girilen ad; sonrakilerde sondaki sayı artırılır, sayı yoksa " 2", " 3"... eklenir</summary>
        public static string NameFor(string name, int index)
        {
            if (index == 0) return name;
            var m = Regex.Match(name, @"^(.*?)(\d+)$");
            return m.Success && int.TryParse(m.Groups[2].Value, out var n)
                ? $"{m.Groups[1].Value}{(n + index).ToString().PadLeft(m.Groups[2].Value.Length, '0')}"
                : $"{name} {index + 1}";
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/apartments/{id:guid}/duplicate", async (Guid id, DuplicateApartmentInput input, Handler handler, CancellationToken ct) =>
            {
                var result = await handler.Handle(id, input, ct);
                return result.IsSuccess ? Results.Ok(new { ids = result.Value }) : result.Error!.ToProblem();
            });
    }
}
