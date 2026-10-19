using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Content;

/// <summary>
/// Sabit sayfa: { key, title, body, updatedAt }.
/// Sitede yalnızca "about" (Hakkımızda) sayfası veritabanından okunur. İletişim sayfası site ayarlarından (telefon, adres, Instagram...)
/// beslenir, ayrı bir metni yoktur. Panelde yalnızca Hakkımızda METNİ düzenlenir; başlık sabittir.
/// Metin düz yazı olarak saklanır: satır sonları korunur, boş satır paragraf ayırır (site öyle gösterir).
/// </summary>
public record PageDto(string Key, LocalizedText Title, LocalizedText Body, DateTime? UpdatedAt);

public static class PageRules
{
    /// <summary>Panelde düzenlenebilen sayfalar</summary>
    public static readonly string[] Editable = ["about"];

    public const int MaxBody = 20000;

    /// <summary>Windows satır sonlarını (\r\n) tek biçime (\n) indirir, 3+ boş satırı tek boş satıra düşürür, uçları kırpar</summary>
    public static string Normalize(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "";
        var lines = text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n').Select(l => l.TrimEnd());
        var joined = string.Join('\n', lines);
        while (joined.Contains("\n\n\n")) joined = joined.Replace("\n\n\n", "\n\n");
        return joined.Trim();
    }

    public static PageDto ToDto(Domain.Entities.StaticPage page) => new(page.Key, page.Title, page.Body ?? new LocalizedText(), page.UpdatedAt);
}

public static class GetPagesAdmin
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/pages", async (AppDbContext db, CancellationToken ct) =>
                Results.Ok((await db.StaticPages.AsNoTracking().Where(x => PageRules.Editable.Contains(x.Key)).OrderBy(x => x.Key).ToListAsync(ct))
                    .Select(PageRules.ToDto)));
    }
}

public static class GetPublicPage
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/pages/{key}", async (string key, AppDbContext db, CancellationToken ct) =>
            {
                var page = await db.StaticPages.AsNoTracking().FirstOrDefaultAsync(x => x.Key == key, ct);
                return page is null ? Error.NotFound("Sayfa bulunamadı.").ToProblem() : Results.Ok(PageRules.ToDto(page));
            }).AllowAnonymous();
    }
}

/// <summary>Yalnızca metin güncellenir (Türkçe zorunlu, İngilizce isteğe bağlı). Başlık değişmez.</summary>
public static class UpdatePage
{
    public record Command(LocalizedText? Body);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/pages/{key}", async (string key, Command cmd, AppDbContext db, AuditWriter audit, CancellationToken ct) =>
            {
                if (!PageRules.Editable.Contains(key)) return Error.NotFound("Sayfa bulunamadı.").ToProblem();
                var page = await db.StaticPages.FirstOrDefaultAsync(x => x.Key == key, ct);
                if (page is null) return Error.NotFound("Sayfa bulunamadı.").ToProblem();

                var body = new LocalizedText
                {
                    Tr = PageRules.Normalize(cmd.Body?.Tr),
                    En = PageRules.Normalize(cmd.Body?.En) is { Length: > 0 } en ? en : null
                };
                var validator = new Validator().LocalizedRequired("body", body, PageRules.MaxBody);
                if (!validator.IsValid) return validator.ToFailure().Error!.ToProblem();

                page.Body = body;
                audit.Add("page.update", "page", key);
                await db.SaveChangesAsync(ct);
                return Results.Ok(PageRules.ToDto(page));
            });
    }
}
