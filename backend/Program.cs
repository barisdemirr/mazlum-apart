using System.Text;
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
builder.Services.AddScoped<MediaUsageChecker>();
builder.Services.AddScoped<AvailabilityService>();
builder.Services.AddScoped<LedgerService>();
builder.Services.AddSingleton<NumberGenerator>();
builder.Services.AddScoped<CashBook>();
builder.Services.AddScoped<IdempotencyGuard>();
builder.Services.AddScoped<MazlumApart.Features.Accounting.ExpenseWriter>();
builder.Services.AddMemoryCache();

// ---- Mesajlaşma: SMS (Verimor) + Web Push (aşama 6) ----
builder.Services.Configure<SmsOptions>(builder.Configuration.GetSection("Sms"));
builder.Services.Configure<PushOptions>(builder.Configuration.GetSection("Push"));
builder.Services
    .AddHttpClient<VerimorClient>((sp, client) =>
        client.Timeout = TimeSpan.FromSeconds(Math.Clamp(sp.GetRequiredService<IOptions<SmsOptions>>().Value.TimeoutSeconds, 5, 60)))
    .RemoveAllLoggers(); // API şifresi sorgu dizesinde gider: istek adresleri ASLA günlüğe yazılmaz
builder.Services.AddSingleton<MazlumApart.Features.Messaging.SmsGate>();
builder.Services.AddSingleton<WebPushSender>();
builder.Services.AddScoped<PushDispatcher>();
builder.Services.AddSingleton<AdminAlerts>();
builder.Services.AddHostedService<AdminAlertWorker>();
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
