using System.Security.Cryptography;
using System.Text;

namespace MazlumApart.Shared;

/// <summary>
/// İsteğin gerçek istemci IP'si (hız sınırı ve denetim kaydı için).
///
/// Frontend (Next.js / Vercel) bazı istekleri SUNUCUDAN yapar (giriş, sayfa verisi). O zaman RemoteIpAddress Vercel'in IP'si olur
/// ve tüm kullanıcılar tek kişi gibi görünür. Bu yüzden Next sunucusu gerçek IP'yi "X-Client-Ip" başlığıyla iletir.
/// Başlığa herkes yazabileceği için YALNIZCA ortak gizli anahtar ("X-Proxy-Secret" = Frontend:ProxySecret) doğruysa güvenilir.
/// </summary>
public static class ClientIp
{
    public const string ProxySecretHeader = "X-Proxy-Secret";
    public const string ClientIpHeader = "X-Client-Ip";

    private static byte[]? _secret;

    public static void Configure(string? proxySecret) =>
        _secret = string.IsNullOrWhiteSpace(proxySecret) ? null : Encoding.UTF8.GetBytes(proxySecret);

    public static string Get(HttpContext context)
    {
        if (_secret is not null &&
            context.Request.Headers.TryGetValue(ProxySecretHeader, out var given) &&
            CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(given.ToString()), _secret) &&
            context.Request.Headers.TryGetValue(ClientIpHeader, out var forwarded) &&
            System.Net.IPAddress.TryParse(forwarded.ToString().Split(',')[0].Trim(), out var ip))
        {
            return ip.ToString();
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
