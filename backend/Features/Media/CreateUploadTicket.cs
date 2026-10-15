using System.Security.Claims;
using MazlumApart.Infrastructure.Auth;
using MazlumApart.Shared;

namespace MazlumApart.Features.Media;

/// <summary>
/// Yükleme bileti. Panel (Next.js sunucusu üzerinden, oturum çerezi ile) bu ucu çağırır; dönen kısa ömürlü bilet tarayıcıya verilir
/// ve dosya doğrudan backend'e yüklenir (Vercel gövde sınırı 4,5 MB; video 60 MB'a kadar). Bilet başka hiçbir uca girmez.
/// </summary>
public static class CreateUploadTicket
{
    public record Response(string Token, DateTime ExpiresAt);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/media/upload-ticket", (ClaimsPrincipal user, TokenService tokens) =>
            {
                var (token, expiresAt) = tokens.CreateUploadTicket(user);
                return Results.Ok(new Response(token, expiresAt));
            }).RequireRateLimiting(RatePolicies.Upload);
    }
}
