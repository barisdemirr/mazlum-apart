using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Auth;

/// <summary>Profil: yönetici kendi adını değiştirir (e-posta ve aktiflik Yöneticiler sayfasından)</summary>
public static class UpdateAdminProfile
{
    public record Command(string? Name);

    public class Handler(AppDbContext db)
    {
        public async Task<Result<GetAdminMe.Response>> Handle(Guid userId, Command cmd, CancellationToken ct)
        {
            var name = (cmd.Name ?? "").Trim();
            var validator = new Validator().Required("name", name, "Adınızı yazın.").MaxLength("name", name, 100);
            if (!validator.IsValid) return validator.ToFailure<GetAdminMe.Response>();

            var user = await db.AdminUsers.FirstOrDefaultAsync(x => x.Id == userId, ct);
            if (user is null) return Error.NotFound("Kullanıcı bulunamadı.");

            user.FullName = name;
            await db.SaveChangesAsync(ct);
            return new GetAdminMe.Response(user.Id, user.Email, user.FullName, user.LastLoginAt);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/me", async (Command cmd, ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                (await handler.Handle(user.GetUserId(), cmd, ct)).ToOk());
    }
}
