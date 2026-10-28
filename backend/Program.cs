using System.Text;
using Hangfire;
using Hangfire.SqlServer;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Auth;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Messaging;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicy = "FrontendPolicy";

// ---- CORS: yalnızca frontend adresleri (appsettings "Cors:Origins") ----
var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
    options.AddPolicy(CorsPolicy, policy => policy
        .WithOrigins(origins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .WithExposedHeaders("Retry-After", "Content-Disposition")));

// ---- Veritabanı ----
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// ---- JSON: camelCase alanlar, enum'lar snake_case metin ("extra_stay", "in_progress") — frontend ile birebir ----
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower)));

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<MazlumApart.Infrastructure.ConflictExceptionHandler>(); // eşzamanlılık / tekil indeks → 409

// ---- Kimlik doğrulama: tek JWT şeması, iki rol (typ = admin | student) ----
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>();
if (jwt is null || string.IsNullOrWhiteSpace(jwt.Key) || jwt.Key.Length < 32)
    throw new InvalidOperationException(
        "Jwt:Key tanımlı değil veya 32 karakterden kısa. appsettings.Development.json / appsettings.Production.json içine ekle.");

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<SessionValidator>();
builder.Services.AddScoped<RefreshTokenService>();
builder.Services.AddSingleton<IPasswordHasher<AdminUser>, PasswordHasher<AdminUser>>();
builder.Services.AddSingleton<IPasswordHasher<Student>, PasswordHasher<Student>>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = AppClaims.Name,
            RoleClaimType = AppClaims.Role
        };
        options.Events = new JwtBearerEvents
        {
            // İmza geçerli olsa bile: kullanıcı pasif/silinmişse ya da şifresi değişmişse (stamp) token reddedilir
            OnTokenValidated = async context =>
            {
                var validator = context.HttpContext.RequestServices.GetRequiredService<SessionValidator>();
                if (context.Principal is null || !await validator.IsValidAsync(context.Principal, context.HttpContext.RequestAborted))
                    context.Fail("Oturum geçersiz.");
            }
        };
    });

// ---- Yetkilendirme (RBAC) ----
// Varsayılan politika YÖNETİCİ: bir endpoint'e politika yazmayı unutmak onu herkese değil yalnızca yöneticiye açar.
// Öğrenci uçları .RequireAuthorization(AppPolicies.Student), herkese açık uçlar .AllowAnonymous() ile işaretlenir.
// Yükleme bileti (scope claim'i olan token) yönetici uçlarının hiçbirine giremez; yalnızca AdminUpload politikasına.
var adminPolicy = new AuthorizationPolicyBuilder()
    .RequireAuthenticatedUser()
    .RequireClaim(AppClaims.Role, AppRoles.Admin)
    .RequireAssertion(context => !context.User.HasClaim(c => c.Type == AppClaims.Scope))
    .Build();

var adminUploadPolicy = new AuthorizationPolicyBuilder()
    .RequireAuthenticatedUser()
    .RequireClaim(AppClaims.Role, AppRoles.Admin)
    .RequireAssertion(context => context.User.FindFirst(AppClaims.Scope) is not { } scope || scope.Value == AppScopes.Upload)
    .Build();

builder.Services.AddAuthorizationBuilder()
    .AddPolicy(AppPolicies.Admin, adminPolicy)
    .AddPolicy(AppPolicies.AdminUpload, adminUploadPolicy)
    .AddPolicy(AppPolicies.Student, policy => policy
        .RequireAuthenticatedUser()
        .RequireClaim(AppClaims.Role, AppRoles.Student))
    .SetDefaultPolicy(adminPolicy)
    .SetFallbackPolicy(adminPolicy);

// ---- Ortak servisler ----
builder.Services.AddHttpContextAccessor();
builder.Services.Configure<UploadOptions>(builder.Configuration.GetSection("Uploads"));
builder.Services.AddSingleton<ImageService>();
builder.Services.AddSingleton<VideoService>();
builder.Services.AddSingleton<DocumentStorage>();
builder.Services.AddScoped<MediaUsageChecker>();
builder.Services.AddScoped<AvailabilityService>();
builder.Services.AddScoped<LedgerService>();
builder.Services.AddSingleton<NumberGenerator>();
builder.Services.AddScoped<CashBook>();
builder.Services.AddScoped<IdempotencyGuard>();
builder.Services.AddScoped<MazlumApart.Features.Accounting.ExpenseWriter>();
builder.Services.AddScoped<MazlumApart.Features.Departures.PresenceReader>();
builder.Services.AddScoped<MazlumApart.Features.Departures.DepartureWriter>();
builder.Services.AddMemoryCache();

// ---- Mesajlaşma: SMS (Netgsm) + Web Push (aşama 6) ----
builder.Services.Configure<SmsOptions>(builder.Configuration.GetSection("Sms"));
builder.Services.Configure<PushOptions>(builder.Configuration.GetSection("Push"));
builder.Services
    .AddHttpClient<NetgsmClient>((sp, client) =>
        client.Timeout = TimeSpan.FromSeconds(Math.Clamp(sp.GetRequiredService<IOptions<SmsOptions>>().Value.TimeoutSeconds, 5, 60)))
    .RemoveAllLoggers(); // API şifresi Authorization başlığında gider: istek ayrıntıları ASLA günlüğe yazılmaz
builder.Services.AddSingleton<MazlumApart.Features.Messaging.SmsGate>();

// ---- Arka plan görevleri (Hangfire, SQL Server): günlük otomatik ödeme hatırlatma SMS'i + fatura abonelikleri ----
// Hangfire kendi tablolarını [HangFire] şemasında ilk açılışta oluşturur. Panel (dashboard) bilinçli olarak AÇILMADI.
// Paylaşımlı IIS'te uygulama havuzu boşta ~5 dk sonra durur: uygulama içi cron (RecurringJob) zamanında ÇALIŞMAZ.
// Bu yüzden görevler dışarıdan tetiklenir (Plesk > Zamanlanmış Görevler > URL getir): GET /api/jobs/{ad}?key=... (Features/Jobs).
// İstek havuzu uyandırır, görevi Hangfire kuyruğuna atar; Hangfire işler (yeniden deneme + eşzamanlı çalışma kilidi korunur).
builder.Services.Configure<ReminderOptions>(builder.Configuration.GetSection("PaymentReminders"));
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(builder.Configuration.GetConnectionString("Default"), new SqlServerStorageOptions
    {
        CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
        SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
        QueuePollInterval = TimeSpan.Zero,
        UseRecommendedIsolationLevel = true,
        DisableGlobalLocks = true
    }));
// Dış tetikleyici anahtarı ("Jobs:TriggerKey") + eski uygulama içi cron kayıtlarının Hangfire veritabanından silinmesi.
// Temizlik Hangfire sunucusundan ÖNCE kaydedilir: hosted service'ler sırayla başlar, eski kayıt bir kez daha tetiklenmeden silinir.
builder.Services.Configure<MazlumApart.Features.Jobs.JobTriggerOptions>(builder.Configuration.GetSection("Jobs"));
builder.Services.AddHostedService<MazlumApart.Features.Jobs.RecurringJobCleanup>();
builder.Services.AddHangfireServer(options => options.WorkerCount = 1);
builder.Services.AddScoped<MazlumApart.Features.Messaging.PaymentReminderJob>();

// Fatura abonelikleri: her ay için "fatura bekleniyor" kaydı (günlük görev; faturalar sayfası da eksikleri tamamlar)
builder.Services.AddScoped<MazlumApart.Features.Accounting.BillSubscriptionGenerator>();
builder.Services.AddScoped<MazlumApart.Features.Accounting.BillSubscriptionJob>();

builder.Services.AddSingleton<WebPushSender>();
builder.Services.AddScoped<PushDispatcher>();
builder.Services.AddSingleton<AdminAlerts>();
builder.Services.AddHostedService<AdminAlertWorker>();
builder.Services.AddSingleton<StudentAlerts>();
builder.Services.AddHostedService<StudentAlertWorker>();
builder.Services.AddScoped<AuditWriter>();

// ---- Hız sınırı ----
ClientIp.Configure(builder.Configuration["Frontend:ProxySecret"]);
builder.Services.AddAppRateLimiting();

// ---- Özellikler (endpoint + handler'lar otomatik kaydolur) ----
builder.Services.AddFeatures(typeof(Program).Assembly);
builder.Services.AddOpenApi();

var app = builder.Build();

// İlk yönetici (yalnızca hiç yönetici yoksa; ayar: "Seed")
await AdminSeeder.SeedAsync(app.Services, app.Configuration);
// Sabit sayfalar, mesaj şablonları ve site ayarları satırı (yalnızca eksik olanlar)
await ContentSeeder.SeedAsync(app.Services);

app.UseExceptionHandler(); // beklenmeyen hata: ayrıntı sızdırmadan problem+json 500
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
}
else
{
    app.UseHsts();
}

app.UseHttpsRedirection();

// Temel güvenlik başlıkları (API yanıtları başka sitede çerçevelenmez, tür tahmini yapılmaz)
app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers.XContentTypeOptions = "nosniff";
    headers.XFrameOptions = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    await next();
});

// Öğrenci belgeleri (PDF) wwwroot/uploads/documents, arıza fotoğrafları wwwroot/uploads/fault-photos altında durur ama ASLA adresle sunulmaz:
// belgeleri yalnızca yönetici uçları (/api/admin/applications/{id}/document, /api/admin/student-documents/{id}/file),
// fotoğrafları yalnızca yetkili arıza uçları (/api/student|admin/.../photos/{id}) okur. Statik dosya katmanından ÖNCE kesilir;
// "documents" ya da "fault-photos" geçen her /uploads adresi (çift eğik çizgi gibi sapmalar dahil) 404 döner. Galeri görselleri bu sözcükleri taşımaz.
app.Use(async (context, next) =>
{
    var path = context.Request.Path;
    if (path.StartsWithSegments("/uploads", StringComparison.OrdinalIgnoreCase)
        && (path.Value!.Contains("documents", StringComparison.OrdinalIgnoreCase)
            || path.Value!.Contains(ImageService.ProtectedFolder, StringComparison.OrdinalIgnoreCase)))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }
    await next();
});

app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        // Yüklenen dosyaların adı benzersizdir (guid): bir yıl önbellekte kalabilir
        if (context.Context.Request.Path.StartsWithSegments("/uploads"))
            context.Context.Response.Headers.CacheControl = "public,max-age=31536000,immutable";
    }
});

// CORS, RateLimiter / Authentication / Authorization'dan ÖNCE çalışmalı
app.UseCors(CorsPolicy);

app.UseAuthentication();
app.UseRateLimiter(); // kimlik doğrulamadan sonra: kullanıcı bazlı sınırlar kullanıcıyı tanır
app.UseAuthorization();

app.MapFeatures();

app.Run();
