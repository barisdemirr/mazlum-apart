using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Auth;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Auth;

/// <summary>
/// Öğrenci girişi: telefon + şifre. Şifre, başvuru onaylanınca üretilir ve öğrenciye iletilir.
/// "Beni hatırla" açıksa token 30 gün, kapalıysa 12 saat geçerlidir.
/// </summary>
public static class StudentLogin
{
    public record Command(string? Phone, string? Password, bool Remember);

    public record UserInfo(Guid Id, string Name, string Phone);

    public record Response(string AccessToken, DateTime ExpiresAt, UserInfo User);

    public class Handler(AppDbContext db, IPasswordHasher<Student> hasher, TokenService tokens)
    {
        private static readonly Lazy<string> DummyHash =
            new(() => new PasswordHasher<Student>().HashPassword(new Student(), "dummy-password-for-timing"));

        public async Task<Result<Response>> Handle(Command cmd, CancellationToken ct)
        {
            var phone = TurkishFormats.NormalizeMobile(cmd.Phone);
            var password = cmd.Password ?? "";

            var validator = new Validator()
                .Must("phone", phone is not null, "5 ile başlayan 10 haneli telefon numaranızı yazın.")
                .Required("password", password, "Şifrenizi yazın.").MaxLength("password", password, 128);
            if (!validator.IsValid) return validator.ToFailure<Response>();

            var student = await db.Students.FirstOrDefaultAsync(x => x.Phone == phone, ct);

            if (student is not null && LoginGuard.IsLocked(student.LockedUntil))
                return Error.TooManyRequests($"Çok fazla hatalı deneme. {LoginGuard.LockMinutes} dakika sonra tekrar deneyin.");

            var hash = student?.PasswordHash;
            var verification = hasher.VerifyHashedPassword(student ?? new Student(), hash ?? DummyHash.Value, password);

            if (student is null || hash is null || !student.IsActive || verification == PasswordVerificationResult.Failed)
            {
                if (student is not null)
                {
                    (student.FailedLoginCount, student.LockedUntil) = LoginGuard.RegisterFailure(student.FailedLoginCount);
                    await db.SaveChangesAsync(ct);
                }
                return Error.Unauthorized("Telefon numarası veya şifre hatalı.");
            }

            if (verification == PasswordVerificationResult.SuccessRehashNeeded)
                student.PasswordHash = hasher.HashPassword(student, password);

            student.FailedLoginCount = 0;
            student.LockedUntil = null;
            student.LastLoginAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            var (token, expiresAt) = tokens.CreateForStudent(student, cmd.Remember);
            return new Response(token, expiresAt, new UserInfo(student.Id, student.FullName, student.Phone));
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/student/auth/login",
                    async (Command cmd, Handler handler, CancellationToken ct) => (await handler.Handle(cmd, ct)).ToOk())
                .AllowAnonymous()
                .RequireRateLimiting(RatePolicies.StudentLogin);
    }
}
