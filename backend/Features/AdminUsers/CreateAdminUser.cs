using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Auth;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.AdminUsers;

/// <summary>Yeni yönetici: şifreyi sistem üretir ve yalnızca bu yanıtta döner (yönetici ilk girişten sonra değiştirir)</summary>
public static class CreateAdminUser
{
    public record Command(string? Name, string? Email);

    public class Handler(AppDbContext db, IPasswordHasher<AdminUser> hasher, AuditWriter audit)
    {
        public async Task<Result<AdminUserWithPassword>> Handle(Command cmd, CancellationToken ct)
        {
            var email = (cmd.Email ?? "").Trim().ToLowerInvariant();
            var name = (cmd.Name ?? "").Trim();

            var validator = new Validator()
                .Required("name", name, "Adı yazın.").MaxLength("name", name, 100)
                .Required("email", email, "E-posta yazın.").MaxLength("email", email, 256).Email("email", email);
            if (!validator.IsValid) return validator.ToFailure<AdminUserWithPassword>();

            if (await db.AdminUsers.AnyAsync(x => x.Email == email, ct))
                return Error.Conflict("Bu e-posta ile bir yönetici zaten var.");

            var password = PasswordGenerator.Create(12);
            var user = new AdminUser { Email = email, FullName = name };
            user.PasswordHash = hasher.HashPassword(user, password);

            db.AdminUsers.Add(user);
            audit.Add("admin.create", "admin", user.Id, after: new { name, email });
            await db.SaveChangesAsync(ct);

            return new AdminUserWithPassword(AdminUserDto.From(user), password);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/users", async (Command cmd, Handler handler, CancellationToken ct) =>
                (await handler.Handle(cmd, ct)).ToOk());
    }
}
