using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Auth;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Auth;

public static class AdminLogin
{
    public record Command(string? Email, string? Password);

    public record UserInfo(Guid Id, string Email, string Name);

    public record Response(string AccessToken, DateTime ExpiresAt, UserInfo User);

    public class Handler(AppDbContext db, IPasswordHasher<AdminUser> hasher, TokenService tokens)
    {
        // Kullanıcı bulunamasa da şifre doğrulaması yapılır: yanıt süresi hesabın varlığını belli etmesin
        private static readonly Lazy<string> DummyHash =
            new(() => new PasswordHasher<AdminUser>().HashPassword(new AdminUser(), "dummy-password-for-timing"));

        public async Task<Result<Response>> Handle(Command cmd, CancellationToken ct)
        {
            var email = (cmd.Email ?? "").Trim().ToLowerInvariant();
            var password = cmd.Password ?? "";

            var validator = new Validator()
                .Required("email", email, "E-posta adresini yazın.").MaxLength("email", email, 256)
                .Required("password", password, "Şifreyi yazın.").MaxLength("password", password, 128);
            if (!validator.IsValid) return validator.ToFailure<Response>();

            var user = await db.AdminUsers.FirstOrDefaultAsync(x => x.Email == email, ct);

            if (user is not null && LoginGuard.IsLocked(user.LockedUntil))
                return Error.TooManyRequests($"Çok fazla hatalı deneme. {LoginGuard.LockMinutes} dakika sonra tekrar deneyin.");

            var verification = hasher.VerifyHashedPassword(user ?? new AdminUser(), user?.PasswordHash ?? DummyHash.Value, password);

            if (user is null || !user.IsActive || verification == PasswordVerificationResult.Failed)
            {
                if (user is not null)
                {
                    (user.FailedLoginCount, user.LockedUntil) = LoginGuard.RegisterFailure(user.FailedLoginCount);
                    await db.SaveChangesAsync(ct);
                }
                return Error.Unauthorized("E-posta veya şifre hatalı.");
            }

            // Hash algoritması güncellendiyse yeniden hash'le
            if (verification == PasswordVerificationResult.SuccessRehashNeeded)
                user.PasswordHash = hasher.HashPassword(user, password);

            user.FailedLoginCount = 0;
            user.LockedUntil = null;
            user.LastLoginAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);

            var (token, expiresAt) = tokens.CreateForAdmin(user);
            return new Response(token, expiresAt, new UserInfo(user.Id, user.Email, user.FullName));
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/auth/login",
                    async (Command cmd, Handler handler, CancellationToken ct) => (await handler.Handle(cmd, ct)).ToOk())
                .AllowAnonymous()
                .RequireRateLimiting(RatePolicies.AdminLogin);
    }
}
