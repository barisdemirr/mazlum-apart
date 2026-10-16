using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using WebPush;
using PushSubscriptionEntity = MazlumApart.Domain.Entities.PushSubscription;

namespace MazlumApart.Infrastructure.Messaging;

/// <summary>Bildirim yükü (frontend public/pwa/sw.js "push" olayı bu alanları okur). url aynı uygulamanın kapsamında olmalı.</summary>
public sealed record PushPayload(string Title, string Body, string Url, string? Tag = null);

public static class PushRules
{
    public const int TitleMax = 65;
    public const int BodyMax = 240;
    public const int MaxDevicesPerOwner = 10;

    /// <summary>
    /// SSRF koruması: sunucu abonelik adresine istek atar; bu yüzden yalnızca bilinen push servislerine izin verilir
    /// (Chrome/Edge/Android: FCM · Firefox: Mozilla · Safari/iOS: Apple · Windows: WNS).
    /// </summary>
    private static readonly string[] AllowedHostSuffixes =
    [
        "fcm.googleapis.com", "android.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com"
    ];

    public static bool IsAllowedEndpoint(string? endpoint)
    {
        if (string.IsNullOrWhiteSpace(endpoint) || endpoint.Length > 2000) return false;
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps || !uri.IsDefaultPort) return false;
        var host = uri.Host.ToLowerInvariant();
        return AllowedHostSuffixes.Any(s => host == s || host.EndsWith("." + s, StringComparison.Ordinal));
    }

    public static string Hash(string endpoint) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(endpoint)));

    /// <summary>Bildirime dokununca açılacak sayfa: öğrenci için /ogrenci…, yönetici için /admin…</summary>
    public static bool IsAllowedUrl(string? url, PushOwner owner)
    {
        if (string.IsNullOrWhiteSpace(url) || url.Length > 200) return false;
        var root = owner == PushOwner.Student ? "/ogrenci" : "/admin";
        return (url == root || url.StartsWith(root + "/", StringComparison.Ordinal) || url.StartsWith(root + "?", StringComparison.Ordinal))
               && !url.Contains("//", StringComparison.Ordinal) && !url.Contains("..", StringComparison.Ordinal);
    }
}

/// <summary>Web Push gönderici (VAPID). 404/410: abonelik ölmüş → silinmeli.</summary>
public sealed class WebPushSender(IOptions<PushOptions> options, ILogger<WebPushSender> logger)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly WebPushClient client = new();
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(20) };

    public enum Outcome { Ok, Gone, Failed }

    public bool Enabled => options.Value.Enabled;

    public async Task<Outcome> SendAsync(PushSubscriptionEntity subscription, PushPayload payload, CancellationToken ct)
    {
        var o = options.Value;
        if (!o.Enabled) return Outcome.Failed;

        try
        {
            var target = new WebPush.PushSubscription(subscription.Endpoint, subscription.P256dh, subscription.Auth);
            // Urgency: high -> telefon uykudayken (Android Doze) bile hemen iletilir. Varsayılan "normal" öncelikli
            // bildirimler, uygulama kapalıyken cihaz uyandığında (uygulama açılınca) teslim edilir. TTL: 1 gün.
            // Kütüphane Urgency başlığını desteklemediği için isteği o üretir, başlığı biz ekleriz.
            var options = new Dictionary<string, object>
            {
                ["vapidDetails"] = new VapidDetails(o.Subject, o.PublicKey, o.PrivateKey),
                ["TTL"] = 86400
            };
            using var request = client.GenerateRequestDetails(target, JsonSerializer.Serialize(payload, Json), options);
            request.Headers.TryAddWithoutValidation("Urgency", "high");
            using var response = await Http.SendAsync(request, ct);

            if (response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone) return Outcome.Gone;
            if (response.IsSuccessStatusCode) return Outcome.Ok;
            logger.LogWarning("Bildirim gönderilemedi: {Status}", (int)response.StatusCode);
            return Outcome.Failed;
        }
        catch (WebPushException ex) when (ex.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
        {
            return Outcome.Gone;
        }
        catch (WebPushException ex)
        {
            logger.LogWarning("Bildirim gönderilemedi: {Status}", (int)ex.StatusCode);
            return Outcome.Failed;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or ArgumentException or FormatException)
        {
            logger.LogWarning("Bildirim gönderilemedi: {Type}", ex.GetType().Name);
            return Outcome.Failed;
        }
    }
}

/// <summary>
/// Birden çok cihaza bildirim: en fazla 8 eşzamanlı gönderim. Sonuçlar SIRAYLA veritabanına yazılır
/// (DbContext eşzamanlı kullanılmaz): başarılıda LastSuccessAt, ölü abonelikte silme, hatada FailureCount.
/// SaveChanges çağırana aittir.
/// </summary>
public class PushDispatcher(AppDbContext db, WebPushSender sender)
{
    public async Task<Dictionary<Guid, WebPushSender.Outcome>> SendAsync(
        IReadOnlyList<(PushSubscriptionEntity Subscription, PushPayload Payload)> jobs, CancellationToken ct)
    {
        var results = new System.Collections.Concurrent.ConcurrentDictionary<Guid, WebPushSender.Outcome>();
        await Parallel.ForEachAsync(jobs, new ParallelOptions { MaxDegreeOfParallelism = 8, CancellationToken = ct }, async (job, token) =>
            results[job.Subscription.Id] = await sender.SendAsync(job.Subscription, job.Payload, token));

        foreach (var (subscription, _) in jobs)
        {
            switch (results.GetValueOrDefault(subscription.Id, WebPushSender.Outcome.Failed))
            {
                case WebPushSender.Outcome.Ok:
                    subscription.LastSuccessAt = DateTime.UtcNow;
                    subscription.FailureCount = 0;
                    break;
                case WebPushSender.Outcome.Gone:
                    db.PushSubscriptions.Remove(subscription);
                    break;
                default:
                    subscription.FailureCount++;
                    if (subscription.FailureCount >= 10) db.PushSubscriptions.Remove(subscription); // sürekli hata veren cihaz
                    break;
            }
        }
        return new Dictionary<Guid, WebPushSender.Outcome>(results);
    }
}

/// <summary>Yöneticilere arka planda bildirim (yeni başvuru, yeni arıza). İsteği bekletmez; kuyruk dolarsa en eskisi düşer.</summary>
public sealed class AdminAlerts
{
    private readonly Channel<PushPayload> channel = Channel.CreateBounded<PushPayload>(
        new BoundedChannelOptions(100) { FullMode = BoundedChannelFullMode.DropOldest });

    public ChannelReader<PushPayload> Reader => channel.Reader;

    public void Enqueue(PushPayload payload) => channel.Writer.TryWrite(payload);
}

public sealed class AdminAlertWorker(AdminAlerts alerts, IServiceScopeFactory scopes, WebPushSender sender, ILogger<AdminAlertWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var payload in alerts.Reader.ReadAllAsync(stoppingToken))
        {
            if (!sender.Enabled) continue;
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var dispatcher = scope.ServiceProvider.GetRequiredService<PushDispatcher>();

                var subscriptions = await db.PushSubscriptions.Where(x => x.OwnerType == PushOwner.Admin).ToListAsync(stoppingToken);
                if (subscriptions.Count == 0) continue;

                await dispatcher.SendAsync(subscriptions.Select(s => (s, payload)).ToList(), stoppingToken);
                await db.SaveChangesAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Yönetici bildirimi gönderilemedi");
            }
        }
    }
}
