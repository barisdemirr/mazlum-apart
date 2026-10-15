using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Features.Catalog;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Content;

public record SlideDto(Guid Id, Guid MediaId, string Url, LocalizedText Title, LocalizedText Subtitle, bool Active, int Order);

public record PublicSlideDto(Guid Id, MediaRef Image, LocalizedText Title, LocalizedText? Subtitle);

public record SlideInput(Guid MediaId, LocalizedText? Title, LocalizedText? Subtitle, bool Active);

public static class GetSlidesAdmin
{
    public class Handler(AppDbContext db)
    {
        public async Task<List<SlideDto>> Handle(CancellationToken ct) =>
            (await db.Slides.AsNoTracking().Include(x => x.Media).OrderBy(x => x.OrderIndex).ToListAsync(ct))
            .Where(x => x.Media is not null)
            .Select(x => new SlideDto(x.Id, x.MediaId, x.Media!.FilePath, x.Title, x.Subtitle ?? new LocalizedText(), x.IsActive, x.OrderIndex))
            .ToList();
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/slides", async (Handler handler, CancellationToken ct) => Results.Ok(await handler.Handle(ct)));
    }
}

public static class GetPublicSlides
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/slides", async (AppDbContext db, CancellationToken ct) =>
                Results.Ok((await db.Slides.AsNoTracking().Include(x => x.Media)
                        .Where(x => x.IsActive).OrderBy(x => x.OrderIndex).ToListAsync(ct))
                    .Where(x => x.Media is not null)
                    .Select(x => new PublicSlideDto(x.Id, new MediaRef(x.Media!.FilePath, x.Media.AltText), x.Title, x.Subtitle.OrNull()))))
                .AllowAnonymous();
    }
}

/// <summary>Slayt ekleme/güncelleme. Başlık boş olabilir (yalnızca görsel); doluysa TR zorunlu.</summary>
public class SlideSaveHandler(AppDbContext db, GetSlidesAdmin.Handler list)
{
    public async Task<Result<List<SlideDto>>> Save(Guid? id, SlideInput input, CancellationToken ct)
    {
        var validator = new Validator()
            .LocalizedOptional("title", input.Title, 120)
            .LocalizedOptional("subtitle", input.Subtitle, 240);
        if (!await db.MediaAssets.AnyAsync(x => x.Id == input.MediaId && x.Kind == MediaKind.Image, ct))
            validator.AddError("mediaId", "Slayt için bir görsel seçin.");
        if (!validator.IsValid) return validator.ToFailure<List<SlideDto>>();

        Slide? slide;
        if (id is null)
        {
            var order = await db.Slides.AnyAsync(ct) ? await db.Slides.MaxAsync(x => x.OrderIndex, ct) + 1 : 0;
            slide = new Slide { OrderIndex = order };
            db.Slides.Add(slide);
        }
        else
        {
            slide = await db.Slides.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (slide is null) return Error.NotFound("Slayt bulunamadı.");
        }

        slide.MediaId = input.MediaId;
        slide.Title = input.Title.OrNull() ?? new LocalizedText();
        slide.Subtitle = input.Subtitle.OrNull();
        slide.IsActive = input.Active;

        await db.SaveChangesAsync(ct);
        return await list.Handle(ct);
    }
}

public static class CreateSlide
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/slides", async (SlideInput input, SlideSaveHandler saver, CancellationToken ct) =>
                (await saver.Save(null, input, ct)).ToOk());
    }
}

public static class UpdateSlide
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/slides/{id:guid}", async (Guid id, SlideInput input, SlideSaveHandler saver, CancellationToken ct) =>
                (await saver.Save(id, input, ct)).ToOk());
    }
}

public static class DeleteSlide
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapDelete("/api/admin/slides/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
            {
                var slide = await db.Slides.FirstOrDefaultAsync(x => x.Id == id, ct);
                if (slide is null) return Error.NotFound("Slayt bulunamadı.").ToProblem();
                db.Slides.Remove(slide);
                await db.SaveChangesAsync(ct);
                return Results.NoContent();
            });
    }
}

/// <summary>Sıralama: { ids: [...] } tüm slaytlar yeni sırasıyla</summary>
public static class ReorderSlides
{
    public record Command(List<Guid>? Ids);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/slides/order", async (Command cmd, AppDbContext db, GetSlidesAdmin.Handler list, CancellationToken ct) =>
            {
                var slides = await db.Slides.ToListAsync(ct);
                var ids = cmd.Ids ?? [];
                if (ids.Count != slides.Count || ids.Distinct().Count() != ids.Count || slides.Any(x => !ids.Contains(x.Id)))
                    return Error.Field("ids", "Sıralama listesi tüm slaytları birer kez içermeli.").ToProblem();

                foreach (var s in slides) s.OrderIndex = ids.IndexOf(s.Id);
                await db.SaveChangesAsync(ct);
                return Results.Ok(await list.Handle(ct));
            });
    }
}
