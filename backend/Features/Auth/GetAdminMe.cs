using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Auth;

public static class GetAdminMe
{
    public record Response(Guid Id, string Email, string Name, DateTime? LastLoginAt);

    public class Handler(AppDbContext db)
    {
        public async Task<Result<Response>> Handle(Guid userId, CancellationToken ct)
        {
            var user = await db.AdminUsers.AsNoTracking()
                .Where(x => x.Id == userId)
                .Select(x => new Response(x.Id, x.Email, x.FullName, x.LastLoginAt))
                .FirstOrDefaultAsync(ct);

            return user is null ? Error.NotFound("Kullanıcı bulunamadı.") : user;
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/me", async (ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                (await handler.Handle(user.GetUserId(), ct)).ToOk());
    }
}
