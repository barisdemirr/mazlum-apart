using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Net.Http.Headers;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Enrollments;

/// <summary>
/// Öğrenci profilindeki belgeler (YALNIZCA yönetici oturumu; /api/admin altındaki her uç yönetici yetkisi ister):
///  GET    /api/admin/students/{studentId}/documents          → başvuruda alınan belgeler (otomatik, her dönemin başvurusundan) + sonradan yüklenenler
///  POST   /api/admin/students/{studentId}/documents          → yeni belge yükler (multipart: document, title, enrollmentId?)
///  GET    /api/admin/student-documents/{id}/file[?download]  → yüklenen belgeyi açar/indirir
///  DELETE /api/admin/student-documents/{id}                  → yüklenen belgeyi siler (başvuru belgesi buradan silinmez; Medya sayfasından yönetilir)
/// Başvuru belgesi için dosya ucu mevcut GET /api/admin/applications/{id}/document'tır.
/// </summary>
public static class StudentDocuments
{
    public record Item(string Kind, Guid Id, string Title, string? FileName, long? Size, DateTime At, string? Source);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/admin/students/{studentId:guid}/documents", async (Guid studentId, AppDbContext db, CancellationToken ct) =>
            {
                var enrollments = await db.Enrollments.AsNoTracking().Where(x => x.StudentId == studentId)
                    .Select(x => new { x.ApplicationId, x.PeriodId }).ToListAsync(ct);
                var appIds = enrollments.Select(x => x.ApplicationId).Distinct().ToList();
                var periods = await db.Periods.AsNoTracking().ToDictionaryAsync(x => x.Id, x => x.Name, ct);

                var applications = await db.Applications.AsNoTracking()
                    .Where(x => appIds.Contains(x.Id) && x.DocumentPath != null)
                    .Select(x => new { x.Id, x.No, x.PeriodId, x.DocumentName, x.DocumentSize, x.CreatedAt }).ToListAsync(ct);

                var uploads = await db.StudentDocuments.AsNoTracking().Where(x => x.StudentId == studentId)
                    .Select(x => new { x.Id, x.Title, x.FileName, x.Size, x.CreatedAt }).ToListAsync(ct);

                var items = applications.Select(a => new Item("application", a.Id, "Öğrenci belgesi (başvuru)", a.DocumentName, a.DocumentSize, a.CreatedAt,
                        $"{a.No} · {periods.GetValueOrDefault(a.PeriodId, "")}"))
                    .Concat(uploads.Select(u => new Item("upload", u.Id, u.Title, u.FileName, u.Size, u.CreatedAt, null)))
                    .OrderByDescending(x => x.At).ToList();
                return Results.Ok(items);
            });

            app.MapPost("/api/admin/students/{studentId:guid}/documents", async (Guid studentId, HttpRequest request, ClaimsPrincipal user,
                    AppDbContext db, DocumentStorage documents, AuditWriter audit, CancellationToken ct) =>
                {
                    if (!request.HasFormContentType) return Error.Field("document", "Belgeyi (PDF) seçin.").ToProblem();
                    if (!await db.Students.AnyAsync(x => x.Id == studentId, ct)) return Error.NotFound("Öğrenci bulunamadı.").ToProblem();

                    var form = await request.ReadFormAsync(ct);
                    if (form.Files.Count > 1) return Error.Field("document", "Tek bir PDF seçin.").ToProblem();
                    var title = form["title"].ToString().Trim();
                    if (title.Length == 0) return Error.Field("title", "Belge adını yazın (örn. Apart sözleşmesi).").ToProblem();
                    if (title.Length > 120) return Error.Field("title", "Belge adı en fazla 120 karakter olabilir.").ToProblem();
                    Guid? enrollmentId = Guid.TryParse(form["enrollmentId"], out var eid) ? eid : null;

                    var saved = await documents.SavePdfAsync(form.Files.GetFile("document"), ct);
                    if (!saved.IsSuccess) return saved.Error!.ToProblem();
                    var doc = saved.Value!;

                    var entity = new StudentDocument
                    {
                        StudentId = studentId, EnrollmentId = enrollmentId, Title = title,
                        Path = doc.Path, FileName = doc.FileName, Size = doc.Size, Sha256 = doc.Sha256, UploadedById = user.GetUserId()
                    };
                    db.StudentDocuments.Add(entity);
                    audit.Add("student.document", "student", studentId, null, after: new { title, doc.FileName, doc.Size });
                    try
                    {
                        await db.SaveChangesAsync(ct);
                    }
                    catch
                    {
                        documents.Delete(doc.Path);
                        throw;
                    }
                    return Results.Ok(new Item("upload", entity.Id, entity.Title, entity.FileName, entity.Size, DateTime.UtcNow, null));
                })
                .RequireRateLimiting(RatePolicies.Upload)
                .DisableAntiforgery()
                .WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(6 * 1024 * 1024));

            app.MapGet("/api/admin/student-documents/{id:guid}/file", async (Guid id, bool? download, HttpContext http, AppDbContext db, DocumentStorage documents, CancellationToken ct) =>
            {
                var doc = await db.StudentDocuments.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.Path, x.Title }).FirstOrDefaultAsync(ct);
                if (doc is null) return Results.NotFound();
                var path = documents.ToPhysicalPath(doc.Path);
                if (!File.Exists(path)) return Results.NotFound();

                var disposition = new ContentDispositionHeaderValue(download == true ? "attachment" : "inline");
                disposition.SetHttpFileName($"{doc.Title}.pdf");
                http.Response.Headers.ContentDisposition = disposition.ToString();
                http.Response.Headers.CacheControl = "private, no-store";
                return Results.File(path, "application/pdf", enableRangeProcessing: false);
            });

            app.MapDelete("/api/admin/student-documents/{id:guid}", async (Guid id, AppDbContext db, DocumentStorage documents, AuditWriter audit, CancellationToken ct) =>
            {
                var doc = await db.StudentDocuments.FirstOrDefaultAsync(x => x.Id == id, ct);
                if (doc is null) return Error.NotFound("Belge bulunamadı.").ToProblem();
                audit.Add("student.document-delete", "student", doc.StudentId, null, before: new { doc.Title, doc.FileName });
                var path = doc.Path;
                db.StudentDocuments.Remove(doc); // soft delete (BaseEntity)
                await db.SaveChangesAsync(ct);
                documents.Delete(path);
                return Results.NoContent();
            });
        }
    }
}
