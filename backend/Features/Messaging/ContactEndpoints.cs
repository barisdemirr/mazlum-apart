using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Features.Enrollments;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Messaging;

/// <summary>
/// İletişim geçmişi. WhatsApp mesajı tarayıcıda (wa.me bağlantısı) açılır; panel yalnızca "iletişim kuruldu" kaydını yazar.
/// SMS ve bildirim kayıtları gönderim uçlarınca otomatik yazılır.
/// </summary>
public static class ContactEndpoints
{
    public record LogCommand(Guid EnrollmentId, string? Purpose, string? Note);

    public record Row(Guid Id, DateTime At, Guid EnrollmentId, StudentRef Student, ContactChannel Channel, string Purpose, string? Note, string? By);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("/api/admin/contacts", async (LogCommand cmd, ClaimsPrincipal user, AppDbContext db, CancellationToken ct) =>
            {
                var purpose = cmd.Purpose?.Trim() ?? "other";
                var note = cmd.Note?.Trim();
                if (!MessagePurposes.All.Contains(purpose)) return Error.Field("purpose", "İletişim amacı geçersiz.").ToProblem();
                if (note is { Length: > 1000 }) return Error.Field("note", "Not en fazla 1000 karakter olabilir.").ToProblem();

                var enrollment = await db.Enrollments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == cmd.EnrollmentId, ct);
                if (enrollment is null) return Error.NotFound("Kayıt bulunamadı.").ToProblem();

                var log = new ContactLog
                {
                    PeriodId = enrollment.PeriodId,
                    EnrollmentId = enrollment.Id,
                    Channel = ContactChannel.Whatsapp,
                    Purpose = purpose,
                    Note = string.IsNullOrWhiteSpace(note) ? null : note,
                    CreatedById = user.GetUserId(),
                    CreatedByName = user.GetDisplayName()
                };
                db.ContactLogs.Add(log);
                await db.SaveChangesAsync(ct);
                return Results.Ok(new { id = log.Id, at = log.CreatedAt });
            });

            app.MapGet("/api/admin/contacts", async (Guid periodId, Guid? enrollmentId, AppDbContext db, CancellationToken ct) =>
            {
                var query = db.ContactLogs.AsNoTracking().Where(x => x.PeriodId == periodId);
                if (enrollmentId is not null) query = query.Where(x => x.EnrollmentId == enrollmentId);

                var logs = await query.OrderByDescending(x => x.CreatedAt).Take(2000).ToListAsync(ct);
                var ids = logs.Select(l => l.EnrollmentId).Distinct().ToList();
                var students = await db.Enrollments.AsNoTracking().IgnoreQueryFilters().Where(x => ids.Contains(x.Id))
                    .Select(x => new { x.Id, Ref = new StudentRef(x.StudentId, x.Student!.FirstName, x.Student.LastName, x.Student.Phone, x.Student.Tc) })
                    .ToDictionaryAsync(x => x.Id, x => x.Ref, ct);

                return Results.Ok(logs.Select(l => new Row(l.Id, l.CreatedAt, l.EnrollmentId,
                    students.GetValueOrDefault(l.EnrollmentId) ?? new StudentRef(Guid.Empty, "", "", "", ""),
                    l.Channel, l.Purpose, l.Note, l.CreatedByName)));
            });
        }
    }
}
