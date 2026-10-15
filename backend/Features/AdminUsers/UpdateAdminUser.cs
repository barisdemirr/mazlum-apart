using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.AdminUsers;

/// <summary>
/// Yöneticinin adı, e-postası ve aktifliği. Kurallar: kendi hesabınızı pasife alamazsınız; en az bir aktif yönetici kalmalı.
/// Pasife alınan hesabın açık oturumları anında kapanır (SecurityStamp yenilenir).
/// </summary>
public static class UpdateAdminUser
{
    public record Command(string? Name, string? Email, bool Active);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result<AdminUserDto>> Handle(Guid id, Guid currentUserId, Command cmd, CancellationToken ct)
        {
            var user = await db.AdminUsers.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (user is null) return Error.NotFound("Yönetici bulunamadı.");

            var email = (cmd.Email ?? "").Trim().ToLowerInvariant();
            var name = (cmd.Name ?? "").Trim();

            var validator = new Validator()
                .Required("name", name, "Adı yazın.").MaxLength("name", name, 100)
                .Required("email", email, "E-posta yazın.").MaxLength("email", email, 256).Email("email", email);
            if (!validator.IsValid) return validator.ToFailure<AdminUserDto>();

            if (!cmd.Active && user.IsActive)
            {
                if (id == currentUserId) return Error.Conflict("Kendi hesabınızı pasife alamazsınız.");
                if (!await db.AdminUsers.AnyAsync(x => x.IsActive && x.Id != id, ct))
                    return Error.Conflict("En az bir aktif yönetici kalmalı.");
            }

            if (await db.AdminUsers.AnyAsync(x => x.Email == email && x.Id != id, ct))
                return Error.Conflict("Bu e-posta ile bir yönetici zaten var.");

            var before = AdminUserDto.From(user);
            var activeChanged = user.IsActive != cmd.Active;

            user.FullName = name;
            user.Email = email;
            user.IsActive = cmd.Active;
            if (activeChanged || before.Email != email) user.SecurityStamp = Guid.NewGuid();

            var action = !activeChanged ? "admin.update" : cmd.Active ? "admin.activate" : "admin.deactivate";
            audit.Add(action, "admin", user.Id, before: before, after: AdminUserDto.From(user));
            await db.SaveChangesAsync(ct);

            return AdminUserDto.From(user);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/users/{id:guid}", async (Guid id, Command cmd, ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, user.GetUserId(), cmd, ct)).ToOk());
    }
}
