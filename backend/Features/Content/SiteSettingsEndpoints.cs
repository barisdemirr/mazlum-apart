using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Content;

public record SiteSettingsDto(
    string Phone, string Whatsapp, string Email, LocalizedText Address, string MapUrl, string Instagram,
    string Iban, string IbanHolder, Guid? HeroVideoMediaId, Guid? MapMediaId);

public record VideoRef(string Url, string? Poster);

/// <summary>Sitedeki ön başvuru alanı: açık mı, yeni fiyatların açıklanacağı tarih (boşsa "yakında")</summary>
public record PublicPreRegistration(bool Enabled, DateOnly? AnnounceDate);

/// <summary>Herkese açık ayarlar: boş alanlar null döner ve sitede gösterilmez. IBAN burada YOK (yalnızca öğrenci portalında).</summary>
public record PublicSiteSettingsDto(
    string? Phone, string? Whatsapp, string? Email, LocalizedText? Address, string? MapUrl, string? Instagram,
    VideoRef? HeroVideo, string? MapImage, PublicPreRegistration PreRegistration);

public static class SiteSettingsStore
{
    public static async Task<SiteSetting> GetAsync(AppDbContext db, CancellationToken ct) =>
        await db.SiteSettings.FirstOrDefaultAsync(x => x.Id == SiteSetting.SingletonId, ct)
        ?? db.SiteSettings.Add(new SiteSetting { Id = SiteSetting.SingletonId }).Entity;

    public static SiteSettingsDto ToDto(SiteSetting s) => new(
        s.Phone ?? "", s.Whatsapp ?? "", s.Email ?? "", s.Address ?? new LocalizedText(), s.MapUrl ?? "", s.Instagram ?? "",
        s.Iban ?? "", s.IbanHolder ?? "", s.HeroVideoMediaId, s.MapMediaId);
}

public static class GetSiteSettingsAdmin
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/site-settings", async (AppDbContext db, CancellationToken ct) =>
                Results.Ok(SiteSettingsStore.ToDto(await SiteSettingsStore.GetAsync(db, ct))));
    }
}

public static class GetPublicSiteSettings
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/site-settings", async (AppDbContext db, CancellationToken ct) =>
            {
                var s = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == SiteSetting.SingletonId, ct) ?? new SiteSetting();
                var mediaIds = new[] { s.HeroVideoMediaId, s.MapMediaId }.Where(x => x is not null).Select(x => x!.Value).ToList();
                var media = await db.MediaAssets.AsNoTracking().Where(x => mediaIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);

                var hero = s.HeroVideoMediaId is { } h && media.TryGetValue(h, out var video) ? new VideoRef(video.FilePath, video.PosterPath) : null;
                var map = s.MapMediaId is { } m && media.TryGetValue(m, out var image) ? image.FilePath : null;

                return Results.Ok(new PublicSiteSettingsDto(
                    Blank(s.Phone), Blank(s.Whatsapp), Blank(s.Email), s.Address.OrNull(), Blank(s.MapUrl), Blank(s.Instagram), hero, map,
                    new PublicPreRegistration(s.PreRegistrationEnabled, s.PriceAnnounceDate)));
            }).AllowAnonymous();

        private static string? Blank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;
    }
}

/// <summary>Site ayarları. Boş alan "gösterme" demektir. Telefonlar 10 hane, IBAN TR + 24 hane (mod-97), IBAN varsa hesap sahibi zorunlu.</summary>
public static class UpdateSiteSettings
{
    public record Command(
        string? Phone, string? Whatsapp, string? Email, LocalizedText? Address, string? MapUrl, string? Instagram,
        string? Iban, string? IbanHolder, Guid? HeroVideoMediaId, Guid? MapMediaId);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result<SiteSettingsDto>> Handle(Command cmd, CancellationToken ct)
        {
            var phone = Optional(cmd.Phone);
            var whatsapp = Optional(cmd.Whatsapp);
            var email = cmd.Email?.Trim();
            var iban = cmd.Iban?.Replace(" ", "").ToUpperInvariant();
            var holder = cmd.IbanHolder?.Trim();
            var mapUrl = cmd.MapUrl?.Trim();
            var instagram = cmd.Instagram?.Trim();

            var validator = new Validator()
                .Must("phone", string.IsNullOrWhiteSpace(cmd.Phone) || phone is not null, "Telefon 5 ile başlayan 10 haneli olmalı.")
                .Must("whatsapp", string.IsNullOrWhiteSpace(cmd.Whatsapp) || whatsapp is not null, "WhatsApp numarası 5 ile başlayan 10 haneli olmalı.")
                .Email("email", email).MaxLength("email", email, 256)
                .Must("iban", string.IsNullOrEmpty(iban) || TurkishFormats.IsValidIban(iban), "IBAN geçersiz. TR ile başlayan 26 karakter olmalı; yazım hatası olabilir.")
                .Must("ibanHolder", string.IsNullOrEmpty(iban) || !string.IsNullOrWhiteSpace(holder), "IBAN yazıldıysa hesap sahibi adı da gerekli.")
                .MaxLength("ibanHolder", holder, 150)
                .Must("mapUrl", string.IsNullOrEmpty(mapUrl) || Uri.TryCreate(mapUrl, UriKind.Absolute, out var u) && u.Scheme == Uri.UriSchemeHttps,
                    "Harita bağlantısı https:// ile başlayan geçerli bir adres olmalı.")
                .MaxLength("mapUrl", mapUrl, 1000)
                .MaxLength("instagram", instagram, 200)
                .LocalizedOptional("address", cmd.Address, 400);

            if (cmd.HeroVideoMediaId is { } hv && !await db.MediaAssets.AnyAsync(x => x.Id == hv && x.Kind == MediaKind.Video, ct))
                validator.AddError("heroVideoMediaId", "Video bulunamadı.");
            if (cmd.MapMediaId is { } mm && !await db.MediaAssets.AnyAsync(x => x.Id == mm && x.Kind == MediaKind.Image, ct))
                validator.AddError("mapMediaId", "Görsel bulunamadı.");
            if (!validator.IsValid) return validator.ToFailure<SiteSettingsDto>();

            var s = await SiteSettingsStore.GetAsync(db, ct);
            var before = SiteSettingsStore.ToDto(s);

            s.Phone = phone;
            s.Whatsapp = whatsapp;
            s.Email = string.IsNullOrEmpty(email) ? null : email;
            s.Address = cmd.Address.OrNull();
            s.MapUrl = string.IsNullOrEmpty(mapUrl) ? null : mapUrl;
            s.Instagram = string.IsNullOrEmpty(instagram) ? null : instagram;
            s.Iban = string.IsNullOrEmpty(iban) ? null : iban;
            s.IbanHolder = string.IsNullOrEmpty(iban) ? null : holder;
            s.HeroVideoMediaId = cmd.HeroVideoMediaId;
            s.MapMediaId = cmd.MapMediaId;

            var after = SiteSettingsStore.ToDto(s);
            audit.Add("settings.update", "settings", "site", before: before, after: after);
            await db.SaveChangesAsync(ct);
            return after;
        }

        private static string? Optional(string? value) => string.IsNullOrWhiteSpace(value) ? null : TurkishFormats.NormalizeMobile(value);
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/site-settings", async (Command cmd, Handler handler, CancellationToken ct) => (await handler.Handle(cmd, ct)).ToOk());
    }
}
