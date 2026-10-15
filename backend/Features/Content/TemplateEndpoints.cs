using Microsoft.EntityFrameworkCore;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Content;

/// <summary>Mesaj şablonu: frontend { id, key, name, tr, en }</summary>
public record TemplateDto(Guid Id, string Key, string Name, string Tr, string En);

public static class GetMessageTemplates
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/message-templates", async (AppDbContext db, CancellationToken ct) =>
                Results.Ok((await db.MessageTemplates.AsNoTracking().OrderBy(x => x.CreatedAt).ToListAsync(ct))
                    .Select(x => new TemplateDto(x.Id, x.Key, x.Name, x.BodyTr, x.BodyEn ?? ""))));
    }
}

/// <summary>Şablon metni (anahtar değişmez). En fazla 1000 karakter; SMS'te uzun metin birden çok kredi harcar.</summary>
public static class UpdateMessageTemplate
{
    public record Command(string? Name, string? Tr, string? En);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/message-templates/{id:guid}", async (Guid id, Command cmd, AppDbContext db, AuditWriter audit, CancellationToken ct) =>
            {
                var template = await db.MessageTemplates.FirstOrDefaultAsync(x => x.Id == id, ct);
                if (template is null) return Error.NotFound("Şablon bulunamadı.").ToProblem();

                var tr = (cmd.Tr ?? "").Trim();
                var en = cmd.En?.Trim();
                var name = string.IsNullOrWhiteSpace(cmd.Name) ? template.Name : cmd.Name.Trim();
                var validator = new Validator()
                    .Required("tr", tr, "Türkçe mesaj metnini yazın.").MaxLength("tr", tr, 1000).MaxLength("en", en, 1000).MaxLength("name", name, 80);
                if (!validator.IsValid) return validator.ToFailure().Error!.ToProblem();

                template.Name = name;
                template.BodyTr = tr;
                template.BodyEn = string.IsNullOrEmpty(en) ? null : en;
                audit.Add("template.update", "template", template.Key);
                await db.SaveChangesAsync(ct);
                return Results.Ok(new TemplateDto(template.Id, template.Key, template.Name, template.BodyTr, template.BodyEn ?? ""));
            });
    }
}
