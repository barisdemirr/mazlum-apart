using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Auth;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Auth;

/// <summary>Öğrenci kendi şifresini değiştirir; diğer cihazlardaki oturumlar kapanır, bu cihaz için yeni token döner</summary>
public static class ChangeStudentPassword
{
    public record Command(string? CurrentPassword, string? NewPassword, bool Remember);

    public class Handler(AppDbContext db, IPasswordHasher<Student> hasher, TokenService tokens, AuditWriter audit)
    {
        public async Task<Result<ChangeAdminPassword.Response>> Handle(Guid studentId, Command cmd, CancellationToken ct)
        {
            var current = cmd.CurrentPassword ?? "";
            var next = cmd.NewPassword ?? "";

            var validator = new Validator()
                .Required("currentPassword", current, "Mevcut şifrenizi yazın.")
                .Required("newPassword", next, "Yeni şifreyi yazın.")
                .MinLength("newPassword", next, 8).MaxLength("newPassword", next, 128)
                .Must("newPassword", next != current, "Yeni şifre eskisiyle aynı olamaz.");
            if (!validator.IsValid) return validator.ToFailure<ChangeAdminPassword.Response>();

            var student = await db.Students.FirstOrDefaultAsync(x => x.Id == studentId, ct);
            if (student?.PasswordHash is null) return Error.NotFound("Hesap bulunamadı.");

            if (hasher.VerifyHashedPassword(student, student.PasswordHash, current) == PasswordVerificationResult.Failed)
                return Error.Field("currentPassword", "Mevcut şifre hatalı.");

            student.PasswordHash = hasher.HashPassword(student, next);
            student.PasswordChangedAt = DateTime.UtcNow;
            student.SecurityStamp = Guid.NewGuid();
            audit.Add("student.password", "student", student.Id);
            await db.SaveChangesAsync(ct);

            var (token, expiresAt) = tokens.CreateForStudent(student, cmd.Remember);
            return new ChangeAdminPassword.Response(token, expiresAt);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/student/me/password", async (Command cmd, ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                    (await handler.Handle(user.GetUserId(), cmd, ct)).ToOk())
                .RequireAuthorization(AppPolicies.Student)
                .RequireRateLimiting(RatePolicies.StudentWrite);
    }
}
