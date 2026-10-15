using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace MazlumApart.Shared;

/// <summary>
/// Hız sınırı politikaları. Endpoint'ler .RequireRateLimiting(RatePolicies.X) ile bağlanır.
/// Not: Yurtta öğrenciler aynı internet çıkışını (aynı IP) paylaşabilir; öğrenci tarafı sınırlar bu yüzden kullanıcıya göre
/// ya da cömert tutulur. Asıl kaba kuvvet koruması giriş handler'ındaki hesap kilidi (stage 2) ile yapılır.
/// </summary>
public static class RatePolicies
{
    public const string AdminLogin = "admin-login";
    public const string StudentLogin = "student-login";
    public const string PublicForm = "public-form";
    public const string StudentWrite = "student-write";
    public const string Upload = "upload";
    public const string Sms = "sms";
    public const string Webhook = "webhook";
    public const string Push = "push";
}

public static class RateLimitingExtensions
{
    public static IServiceCollection AddAppRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, ct) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                    context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();

                await Results.Problem(
                        "Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.",
                        statusCode: StatusCodes.Status429TooManyRequests,
                        title: "Çok fazla istek")
                    .ExecuteAsync(context.HttpContext);
            };

            // Genel sınır: kötüye kullanım ve kazara döngülere karşı. Giriş yapmışsa kullanıcıya, değilse IP'ye göre.
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetFixedWindowLimiter(UserOrIp(context), _ => Window(1200, TimeSpan.FromMinutes(1))));

            // Yönetici girişi: IP başına dakikada 5 deneme
            options.AddPolicy(RatePolicies.AdminLogin, context =>
                RateLimitPartition.GetFixedWindowLimiter(ClientIp.Get(context), _ => Window(5, TimeSpan.FromMinutes(1))));

            // Öğrenci girişi: aynı IP'yi paylaşan öğrenciler için daha cömert (hesap bazlı kilit ayrıca var)
            options.AddPolicy(RatePolicies.StudentLogin, context =>
                RateLimitPartition.GetFixedWindowLimiter(ClientIp.Get(context), _ => Window(20, TimeSpan.FromMinutes(1))));

            // Herkese açık formlar (başvuru): IP başına 10 dakikada 5
            options.AddPolicy(RatePolicies.PublicForm, context =>
                RateLimitPartition.GetFixedWindowLimiter(ClientIp.Get(context), _ => Window(5, TimeSpan.FromMinutes(10))));

            // Öğrencinin yazma işlemleri (arıza talebi, bildirim aboneliği): öğrenci başına saatte 30
            options.AddPolicy(RatePolicies.StudentWrite, context =>
                RateLimitPartition.GetFixedWindowLimiter(UserOrIp(context), _ => Window(30, TimeSpan.FromHours(1))));

            // Dosya yükleme: kullanıcı başına 10 dakikada 60
            options.AddPolicy(RatePolicies.Upload, context =>
                RateLimitPartition.GetFixedWindowLimiter(UserOrIp(context), _ => Window(60, TimeSpan.FromMinutes(10))));

            // SMS gönderimi (maliyetli): yönetici başına 10 dakikada 5 gönderim isteği.
            // Günlük boy tavanı, alıcı sınırı ve tekrar gönderim koruması ayrıca SendSms handler'ında uygulanır.
            options.AddPolicy(RatePolicies.Sms, context =>
                RateLimitPartition.GetFixedWindowLimiter(UserOrIp(context), _ => Window(5, TimeSpan.FromMinutes(10))));

            // Toplu bildirim ve test bildirimi: yönetici başına 10 dakikada 10
            options.AddPolicy(RatePolicies.Push, context =>
                RateLimitPartition.GetFixedWindowLimiter(UserOrIp(context), _ => Window(10, TimeSpan.FromMinutes(10))));

            // SMS sağlayıcısının teslim raporu geri çağrısı
            options.AddPolicy(RatePolicies.Webhook, context =>
                RateLimitPartition.GetFixedWindowLimiter(ClientIp.Get(context), _ => Window(120, TimeSpan.FromMinutes(1))));
        });

        return services;
    }

    private static FixedWindowRateLimiterOptions Window(int permits, TimeSpan window) => new()
    {
        PermitLimit = permits,
        Window = window,
        QueueLimit = 0,
        AutoReplenishment = true
    };

    private static string UserOrIp(HttpContext context)
    {
        var sub = context.User.FindFirstValue(AppClaims.Subject);
        return sub is not null ? $"u:{sub}" : $"ip:{ClientIp.Get(context)}";
    }
}
