using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Net.Http.Headers;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Applications;

/// <summary>
/// Başvurunun öğrenci belgesi (PDF) — YALNIZCA yönetici:
///  GET  /api/admin/applications/{id}/document[?download=true] → tarayıcıda açılır (inline) ya da indirilir
///  POST /api/admin/applications/{id}/document (multipart "document") → ofis kaydına belge ekler ya da belgeyi değiştirir
/// </summary>
public static class ApplicationDocument
{
    public record Response(string DocumentName, long DocumentSize);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/admin/applications/{id:guid}/document", async (Guid id, bool? download, HttpContext http, AppDbContext db, DocumentStorage documents, CancellationToken ct) =>
            {
                var doc = await db.Applications.AsNoTracking().Where(x => x.Id == id)
                    .Select(x => new { x.No, x.DocumentPath, x.DocumentName }).FirstOrDefaultAsync(ct);
                if (doc?.DocumentPath is null) return Results.NotFound();

                var path = documents.ToPhysicalPath(doc.DocumentPath);
                if (!File.Exists(path)) return Results.NotFound();

                var name = $"{doc.No}-ogrenci-belgesi.pdf";
                var disposition = new ContentDispositionHeaderValue(download == true ? "attachment" : "inline");
                disposition.SetHttpFileName(name);
                http.Response.Headers.ContentDisposition = disposition.ToString();
                http.Response.Headers.CacheControl = "private, no-store";
                return Results.File(path, "application/pdf", enableRangeProcessing: false);
            });

            app.MapPost("/api/admin/applications/{id:guid}/document", async (Guid id, HttpRequest request, ClaimsPrincipal user,
                    AppDbContext db, DocumentStorage documents, AuditWriter audit, CancellationToken ct) =>
                {
                    if (!request.HasFormContentType) return Error.Field("document", "Belgeyi (PDF) seçin.").ToProblem();
                    var application = await db.Applications.FirstOrDefaultAsync(x => x.Id == id, ct);
                    if (application is null) return Error.NotFound("Başvuru bulunamadı.").ToProblem();

                    var form = await request.ReadFormAsync(ct);
                    if (form.Files.Count > 1) return Error.Field("document", "Tek bir PDF seçin.").ToProblem();
                    var saved = await documents.SavePdfAsync(form.Files.GetFile("document"), ct);
                    if (!saved.IsSuccess) return saved.Error!.ToProblem();

                    var old = application.DocumentPath;
                    var doc = saved.Value!;
                    application.DocumentPath = doc.Path;
                    application.DocumentName = doc.FileName;
                    application.DocumentSize = doc.Size;
                    application.DocumentSha256 = doc.Sha256;
                    audit.Add("application.document", "application", application.Id, application.PeriodId,
                        after: new { doc.FileName, doc.Size, replaced = old is not null });
                    try
                    {
                        await db.SaveChangesAsync(ct);
                    }
                    catch
                    {
                        documents.Delete(doc.Path);
                        throw;
                    }
                    documents.Delete(old);
                    return Results.Ok(new Response(doc.FileName, doc.Size));
                })
                .RequireRateLimiting(RatePolicies.Upload)
                .DisableAntiforgery()
                .WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(6 * 1024 * 1024));
        }
    }
}
