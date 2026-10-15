using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Auth;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.AdminUsers;

/// <summary>Başka bir yöneticinin şifresini sıfırlar (şifresini unutan yönetici için). Kendi şifrenizi Profil'den değiştirirsiniz.</summary>
public static class ResetAdminUserPassword
{
    public class Handler(AppDbContext db, IPasswordHasher<AdminUser> hasher, AuditWriter audit)
    {
        public async Task<Result<AdminUserWithPassword>> Handle(Guid id, Guid currentUserId, CancellationToken ct)
        {
            if (id == currentUserId) return Error.Conflict("Kendi şifrenizi Profil sayfasından değiştirin.");

            var user = await db.AdminUsers.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (user is null) return Error.NotFound("Yönetici bulunamadı.");

            var password = PasswordGenerator.Create(12);
            user.PasswordHash = hasher.HashPassword(user, password);
            user.SecurityStamp = Guid.NewGuid();
            user.FailedLoginCount = 0;
            user.LockedUntil = null;

            audit.Add("admin.password_reset", "admin", user.Id);
            await db.SaveChangesAsync(ct);

            return new AdminUserWithPassword(AdminUserDto.From(user), password);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/users/{id:guid}/reset-password", async (Guid id, ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, user.GetUserId(), ct)).ToOk());
    }
}
