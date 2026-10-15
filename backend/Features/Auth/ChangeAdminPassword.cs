using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Auth;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Auth;

/// <summary>
/// Şifre değişikliği. SecurityStamp yenilenir: bu hesabın DİĞER cihazlardaki oturumları kapanır.
/// Bu cihaz için yeni token döner (frontend çerezi günceller).
/// </summary>
public static class ChangeAdminPassword
{
    public record Command(string? CurrentPassword, string? NewPassword);

    public record Response(string AccessToken, DateTime ExpiresAt);

    public class Handler(AppDbContext db, IPasswordHasher<AdminUser> hasher, TokenService tokens, AuditWriter audit)
    {
        public async Task<Result<Response>> Handle(Guid userId, Command cmd, CancellationToken ct)
        {
            var current = cmd.CurrentPassword ?? "";
            var next = cmd.NewPassword ?? "";

            var validator = new Validator()
                .Required("currentPassword", current, "Mevcut şifrenizi yazın.")
                .Required("newPassword", next, "Yeni şifreyi yazın.")
                .MinLength("newPassword", next, 8).MaxLength("newPassword", next, 128)
                .Must("newPassword", next != current, "Yeni şifre eskisiyle aynı olamaz.");
            if (!validator.IsValid) return validator.ToFailure<Response>();

            var user = await db.AdminUsers.FirstOrDefaultAsync(x => x.Id == userId, ct);
            if (user is null) return Error.NotFound("Kullanıcı bulunamadı.");

            if (hasher.VerifyHashedPassword(user, user.PasswordHash, current) == PasswordVerificationResult.Failed)
                return Error.Field("currentPassword", "Mevcut şifre hatalı.");

            user.PasswordHash = hasher.HashPassword(user, next);
            user.SecurityStamp = Guid.NewGuid();
            audit.Add("admin.password", "admin", user.Id);
            await db.SaveChangesAsync(ct);

            var (token, expiresAt) = tokens.CreateForAdmin(user);
            return new Response(token, expiresAt);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/me/password", async (Command cmd, ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                (await handler.Handle(user.GetUserId(), cmd, ct)).ToOk());
    }
}
