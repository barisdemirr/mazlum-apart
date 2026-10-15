using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Auth;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.StudentAccounts;

/// <summary>
/// Yönetici, öğrencinin portal şifresini sıfırlar (öğrenci unuttuysa ya da hesabı kilitlendiyse).
/// Yeni şifre yalnızca bu yanıtta döner; öğrenciye WhatsApp/SMS ile iletilir (SMS gönderimi aşama 6).
/// Öğrencinin açık oturumları kapanır.
/// </summary>
public static class ResetStudentPassword
{
    public record Response(Guid StudentId, string Phone, string Password);

    public class Handler(AppDbContext db, IPasswordHasher<Student> hasher, AuditWriter audit)
    {
        public async Task<Result<Response>> Handle(Guid studentId, CancellationToken ct)
        {
            var student = await db.Students.FirstOrDefaultAsync(x => x.Id == studentId, ct);
            if (student is null) return Error.NotFound("Öğrenci bulunamadı.");

            var password = PasswordGenerator.Create(8);
            student.PasswordHash = hasher.HashPassword(student, password);
            student.PasswordChangedAt = null; // öğrenci henüz kendisi belirlemedi
            student.SecurityStamp = Guid.NewGuid();
            student.FailedLoginCount = 0;
            student.LockedUntil = null;

            audit.Add("student.password_reset", "student", student.Id);
            await db.SaveChangesAsync(ct);

            return new Response(student.Id, student.Phone, password);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/students/{id:guid}/reset-password", async (Guid id, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, ct)).ToOk());
    }
}
