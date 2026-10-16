using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Auth;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Auth;

/// <summary>
/// Öğrenci girişi: telefon + şifre. Şifre, başvuru onaylanınca üretilir ve öğrenciye iletilir.
/// Erişim token'ı kısa ömürlüdür (15 dk); oturumu yenileme anahtarı ayakta tutar.
/// "Beni hatırla" açıksa yenileme anahtarı kayan 180 gün, kapalıysa 24 saat geçerlidir (Jwt ayarları).
/// </summary>
public static class StudentLogin
{
    public record Command(string? Phone, string? Password, bool Remember);

    public record UserInfo(Guid Id, string Name, string Phone);

    public record Response(string AccessToken, DateTime ExpiresAt, string RefreshToken, DateTime RefreshExpiresAt, bool Persistent, UserInfo User);

    public class Handler(AppDbContext db, IPasswordHasher<Student> hasher, TokenService tokens,
        RefreshTokenService refresh, Microsoft.Extensions.Options.IOptions<JwtOptions> jwt)
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

            var lifetime = cmd.Remember ? TimeSpan.FromDays(jwt.Value.StudentRefreshDays) : TimeSpan.FromHours(jwt.Value.StudentSessionRefreshHours);
            var issued = refresh.Issue(AppRoles.Student, student.Id, student.SecurityStamp, lifetime, cmd.Remember);
            await db.SaveChangesAsync(ct);

            var (token, expiresAt) = tokens.CreateForStudent(student);
            return new Response(token, expiresAt, issued.Token, issued.ExpiresAt, issued.Persistent, new UserInfo(student.Id, student.FullName, student.Phone));
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
