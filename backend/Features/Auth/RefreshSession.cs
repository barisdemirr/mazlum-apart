using MazlumApart.Infrastructure.Auth;
using MazlumApart.Shared;

namespace MazlumApart.Features.Auth;

/// <summary>
/// Oturum yenileme ve çıkış. Rol (yönetici/öğrenci) yenileme anahtarının kendisinden bilinir.
/// Yalnızca frontend sunucusu (BFF) çağırır; anahtar tarayıcıya hiç geçmez (httpOnly çerez).
/// </summary>
public static class RefreshSession
{
    public record Command(string? RefreshToken);

    public record Response(string AccessToken, DateTime ExpiresAt, string RefreshToken, DateTime RefreshExpiresAt, bool Persistent);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("/api/auth/refresh", async Task<IResult> (Command cmd, RefreshTokenService service, CancellationToken ct) =>
                {
                    var result = await service.Rotate(cmd.RefreshToken, ct);
                    if (!result.IsSuccess) return result.Error!.ToProblem();
                    var r = result.Value!;
                    return Results.Ok(new Response(r.AccessToken, r.ExpiresAt, r.RefreshToken, r.RefreshExpiresAt, r.Persistent));
                })
                .AllowAnonymous()
                .RequireRateLimiting(RatePolicies.Refresh);

            app.MapPost("/api/auth/logout", async (Command cmd, RefreshTokenService service, CancellationToken ct) =>
                {
                    await service.Revoke(cmd.RefreshToken, ct);
                    return Results.NoContent();
                })
                .AllowAnonymous()
                .RequireRateLimiting(RatePolicies.Refresh);
        }
    }
}
