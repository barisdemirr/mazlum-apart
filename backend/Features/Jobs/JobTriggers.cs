using System.Security.Cryptography;
using System.Text;
using Hangfire;
using Microsoft.Extensions.Primitives;
using Microsoft.Extensions.Options;
using MazlumApart.Features.Accounting;
using MazlumApart.Features.Messaging;
using MazlumApart.Shared;

namespace MazlumApart.Features.Jobs;

/*
 * GÜNLÜK GÖREVLERİN DIŞARIDAN TETİKLENMESİ.
 * Paylaşımlı Windows hostingde (Natro/Plesk) IIS uygulama havuzu boşta ~5 dk sonra durur, ~29 saatte bir geri dönüşüme girer ve
 * AlwaysRunning açılamaz. Uygulama içi zamanlayıcı (Hangfire RecurringJob) o saatte istek gelmezse çalışmaz. Bu yüzden:
 *   Plesk > Web Siteleri ve Alan Adları > (backend sitesi) > Zamanlanmış Görevler > "URL getir"
 *     her gün 10:00  →  https://<backend>/api/jobs/payment-reminders?key=<Jobs:TriggerKey>
 *     her gün 06:00  →  https://<backend>/api/jobs/bill-subscriptions?key=<Jobs:TriggerKey>
 * İstek havuzu uyandırır ve görevi Hangfire kuyruğuna atar; Hangfire hemen işler. Görevler idempotenttir:
 * aynı gün iki kez tetiklenmesi çift SMS / çift fatura kaydı üretmez (bkz. PaymentReminderJob, BillSubscriptionGenerator).
 *
 * Güvenlik: anahtar "X-Job-Key" başlığıyla ya da (Plesk yalnızca düz GET attığı için) "key" sorgu parametresiyle gelir,
 * sabit zamanlı karşılaştırılır. Jobs:TriggerKey boş / 32 karakterden kısaysa uç tamamen kapalıdır (404).
 */
public sealed class JobTriggerOptions
{
    /// <summary>En az 32 karakter, rastgele. Üretmek için (PowerShell 7): [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))</summary>
    public string TriggerKey { get; set; } = "";

    public bool IsConfigured => TriggerKey.Length >= 32;
}

public static class JobTriggers
{
    public const string KeyHeader = "X-Job-Key";
    public const string KeyQuery = "key";

    /// <summary>Dışarıdan tetiklenebilen görevler: URL'deki ad → Hangfire kuyruğuna atma</summary>
    private static readonly Dictionary<string, Func<IBackgroundJobClient, string>> Registry = new(StringComparer.OrdinalIgnoreCase)
    {
        [PaymentReminderJob.JobId] = client => client.Enqueue<PaymentReminderJob>(job => job.RunAsync(CancellationToken.None)),
        [BillSubscriptionJob.JobId] = client => client.Enqueue<BillSubscriptionJob>(job => job.RunAsync(CancellationToken.None))
    };

    public static IReadOnlyCollection<string> Names => Registry.Keys;

    public static bool KeyMatches(string configured, string? given) =>
        !string.IsNullOrEmpty(given) &&
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(given), Encoding.UTF8.GetBytes(configured));

    public record Response(string Job, string JobId, DateTime QueuedAtUtc);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapMethods("/api/jobs/{name}", [HttpMethods.Get, HttpMethods.Post],
                    (string name, HttpRequest request, IOptions<JobTriggerOptions> options, IBackgroundJobClient client, ILoggerFactory loggers) =>
                    {
                        var o = options.Value;
                        if (!o.IsConfigured || !Registry.TryGetValue(name, out var enqueue))
                            return Results.NotFound();

                        var given = request.Headers.TryGetValue(KeyHeader, out var header) && !StringValues.IsNullOrEmpty(header)
                            ? header.ToString()
                            : request.Query[KeyQuery].ToString();
                        if (!KeyMatches(o.TriggerKey, given))
                            return Results.Unauthorized();

                        var jobId = enqueue(client);
                        loggers.CreateLogger("MazlumApart.Jobs").LogInformation("Görev dışarıdan tetiklendi: {Job} ({JobId})", name, jobId);
                        return Results.Json(new Response(name.ToLowerInvariant(), jobId, DateTime.UtcNow), statusCode: StatusCodes.Status202Accepted);
                    })
                .AllowAnonymous()
                .RequireRateLimiting(RatePolicies.Jobs);
    }
}

/// <summary>
/// Eski sürüm görevleri uygulama içi cron ile (RecurringJob) kaydediyordu; o kayıtlar Hangfire veritabanında kalır ve uygulama her
/// uyandığında kaçırılan çalışmayı tetikler. Açılışta silinir (yoksa bir şey yapmaz). Hata uygulamanın açılmasını engellemez.
/// </summary>
public sealed class RecurringJobCleanup(IRecurringJobManager jobs, ILogger<RecurringJobCleanup> logger) : IHostedService
{
    public Task StartAsync(CancellationToken cancellationToken)
    {
        foreach (var id in JobTriggers.Names)
        {
            try
            {
                jobs.RemoveIfExists(id);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Eski tekrarlayan görev kaydı silinemedi: {JobId}", id);
            }
        }
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
