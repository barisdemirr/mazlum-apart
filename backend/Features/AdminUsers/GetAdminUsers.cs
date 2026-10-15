using Microsoft.EntityFrameworkCore;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.AdminUsers;

public static class GetAdminUsers
{
    public class Handler(AppDbContext db)
    {
        public async Task<List<AdminUserDto>> Handle(CancellationToken ct)
        {
            var users = await db.AdminUsers.AsNoTracking().OrderBy(x => x.CreatedAt).ToListAsync(ct);
            return users.Select(AdminUserDto.From).ToList();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/users", async (Handler handler, CancellationToken ct) => Results.Ok(await handler.Handle(ct)));
    }
}
