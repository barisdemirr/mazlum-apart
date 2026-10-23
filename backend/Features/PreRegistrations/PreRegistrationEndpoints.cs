using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Features.Content;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Messaging;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.PreRegistrations;

/*
 * ÖN BAŞVURU — yeni dönem fiyatları henüz açıklanmamışken dolu oda ilanından "fiyatlar açıklanınca bana haber verin" kaydı.
 *  - Site: POST /api/pre-registrations (anonim, IP başına 10 dakikada 5). Ayar kapalıysa 409.
 *  - Panel: liste, durum/not güncelleme, silme, ayarlar (aç/kapa + fiyat açıklama tarihi).
 *  - Toplu SMS: /api/admin/sms/* uçlarına { preRegistrationId } alıcısı verilir; gönderilenler "bilgilendirildi" olur.
 */

public record PreRegistrationSettingsDto(bool Enabled, DateOnly? AnnounceDate);

/// <summary>Web sitesinden ön başvuru. Dönüş: { already } — aynı numara aynı oda için zaten kayıtlıysa true (kayıt güncellenir)</summary>
public static class SubmitPreRegistration
{
    public record Input(string? FullName, string? Phone, string? RoomSlug, string? Note, string? Lang, bool Kvkk);

    public record Response(bool Already);

    public class Handler(AppDbContext db, AdminAlerts alerts, AuditWriter audit)
    {
        public async Task<Result<Response>> Handle(Input input, string? ip, CancellationToken ct)
        {
            var settings = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == SiteSetting.SingletonId, ct);
            if (settings?.PreRegistrationEnabled != true) return Error.Conflict("Ön başvuru şu an kapalı.");

            var name = string.Join(' ', (input.FullName ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries));
            var phone = TurkishFormats.NormalizeMobile(input.Phone);
            var note = input.Note?.Trim();

            var v = new Validator()
                .Must("fullName", name.Length >= 3, "Adını ve soyadını yaz.").MaxLength("fullName", name, 120)
                .Must("phone", phone is not null, "Telefon 5 ile başlayan 10 haneli olmalı.")
                .MaxLength("note", note, 500)
                .Must("kvkk", input.Kvkk, "Devam etmek için onay vermen gerekiyor.");
            if (!v.IsValid) return v.ToFailure<Response>();

            RoomType? roomType = string.IsNullOrWhiteSpace(input.RoomSlug)
                ? null
                : await db.RoomTypes.AsNoTracking().FirstOrDefaultAsync(x => x.Slug == input.RoomSlug && x.IsActive, ct);
            var lang = string.Equals(input.Lang, "en", StringComparison.OrdinalIgnoreCase) ? "en" : "tr";
            Guid? typeId = roomType?.Id;

            // Aynı kişi aynı oda için ikinci kez gönderirse yeni satır açılmaz (liste temiz kalır)
            var existing = await db.PreRegistrations.FirstOrDefaultAsync(x => x.Phone == phone && x.RoomTypeId == typeId
                && (x.Status == PreRegistrationStatus.New || x.Status == PreRegistrationStatus.Contacted), ct);
            if (existing is not null)
            {
                existing.FullName = name;
                existing.Lang = lang;
                if (!string.IsNullOrEmpty(note)) existing.Note = note;
                await db.SaveChangesAsync(ct);
                return new Response(true);
            }

            var item = new PreRegistration
            {
                FullName = name,
                Phone = phone!,
                RoomTypeId = typeId,
                Note = string.IsNullOrEmpty(note) ? null : note,
                Lang = lang,
                Ip = ip
            };
            db.PreRegistrations.Add(item);
            audit.Add("pre_registration.create", "pre_registration", item.Id, after: new { roomType = roomType?.Slug });
            await db.SaveChangesAsync(ct);

            alerts.Enqueue(new PushPayload("Yeni ön başvuru", $"{item.FullName}{(roomType is null ? "" : $" · {roomType.Name.Tr}")}",
                "/admin/on-basvurular", $"pre-registration-{item.Id:N}"));
            return new Response(false);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/pre-registrations", async (Input input, HttpContext http, Handler handler, CancellationToken ct) =>
                    (await handler.Handle(input, ClientIp.Get(http), ct)).ToOk())
                .AllowAnonymous()
                .RequireRateLimiting(RatePolicies.PublicForm);
    }
}

/// <summary>Panel: ön başvuru listesi (en yeni üstte, en çok 2000), durum/not güncelleme, silme</summary>
public static class PreRegistrationAdmin
{
    public record Row(
        Guid Id, DateTime CreatedAt, string FullName, string Phone, Guid? RoomTypeId, LocalizedText? RoomTypeName, string? Note,
        string Lang, PreRegistrationStatus Status, DateTime? ContactedAt, string? AdminNote);

    public record UpdateCommand(string? Status, string? AdminNote);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/admin/pre-registrations", async (AppDbContext db, CancellationToken ct) =>
            {
                var items = await db.PreRegistrations.AsNoTracking().OrderByDescending(x => x.CreatedAt).Take(2000).ToListAsync(ct);
                var typeIds = items.Where(x => x.RoomTypeId != null).Select(x => x.RoomTypeId!.Value).Distinct().ToList();
                var names = await db.RoomTypes.AsNoTracking().IgnoreQueryFilters().Where(x => typeIds.Contains(x.Id))
                    .ToDictionaryAsync(x => x.Id, x => x.Name, ct);

                return Results.Ok(items.Select(x => new Row(x.Id, x.CreatedAt, x.FullName, x.Phone, x.RoomTypeId,
                    x.RoomTypeId is { } t ? names.GetValueOrDefault(t) : null, x.Note, x.Lang, x.Status, x.ContactedAt, x.AdminNote)));
            });

            app.MapPut("/api/admin/pre-registrations/{id:guid}", async (Guid id, UpdateCommand cmd, AppDbContext db, AuditWriter audit, CancellationToken ct) =>
            {
                var item = await db.PreRegistrations.FirstOrDefaultAsync(x => x.Id == id, ct);
                if (item is null) return Error.NotFound("Ön başvuru bulunamadı.").ToProblem();

                var note = cmd.AdminNote?.Trim();
                PreRegistrationStatus status = item.Status;
                var v = new Validator()
                    .Must("status", cmd.Status is null || QueryParsing.TryParseEnum(cmd.Status, out status), "Durum geçersiz.")
                    .MaxLength("adminNote", note, 500);
                if (!v.IsValid) return v.ToFailure().Error!.ToProblem();

                var before = new { item.Status, item.AdminNote };
                if (status == PreRegistrationStatus.Contacted && item.Status != PreRegistrationStatus.Contacted) item.ContactedAt = DateTime.UtcNow;
                item.Status = status;
                if (cmd.AdminNote is not null) item.AdminNote = string.IsNullOrEmpty(note) ? null : note;

                audit.Add("pre_registration.update", "pre_registration", item.Id, before: before, after: new { item.Status, item.AdminNote });
                await db.SaveChangesAsync(ct);
                return Results.NoContent();
            });

            app.MapDelete("/api/admin/pre-registrations/{id:guid}", async (Guid id, AppDbContext db, AuditWriter audit, CancellationToken ct) =>
            {
                var item = await db.PreRegistrations.FirstOrDefaultAsync(x => x.Id == id, ct);
                if (item is null) return Error.NotFound("Ön başvuru bulunamadı.").ToProblem();

                db.PreRegistrations.Remove(item); // soft delete
                audit.Add("pre_registration.delete", "pre_registration", item.Id, before: new { item.FullName, item.Phone });
                await db.SaveChangesAsync(ct);
                return Results.NoContent();
            });
        }
    }
}

/// <summary>Ön başvuru ayarları: sitede gösterilsin mi + yeni fiyatların açıklanacağı tarih (site ayarları satırında saklanır)</summary>
public static class PreRegistrationSettings
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/admin/pre-registrations/settings", async (AppDbContext db, CancellationToken ct) =>
            {
                var s = await SiteSettingsStore.GetAsync(db, ct);
                return Results.Ok(new PreRegistrationSettingsDto(s.PreRegistrationEnabled, s.PriceAnnounceDate));
            });

            app.MapPut("/api/admin/pre-registrations/settings", async (PreRegistrationSettingsDto cmd, AppDbContext db, AuditWriter audit, CancellationToken ct) =>
            {
                if (cmd.AnnounceDate is { } d && (d < TurkeyClock.Today.AddYears(-1) || d > TurkeyClock.Today.AddYears(2)))
                    return Error.Field("announceDate", "Tarih geçerli görünmüyor.").ToProblem();

                var s = await SiteSettingsStore.GetAsync(db, ct);
                var before = new PreRegistrationSettingsDto(s.PreRegistrationEnabled, s.PriceAnnounceDate);
                s.PreRegistrationEnabled = cmd.Enabled;
                s.PriceAnnounceDate = cmd.AnnounceDate;
                var after = new PreRegistrationSettingsDto(s.PreRegistrationEnabled, s.PriceAnnounceDate);

                audit.Add("settings.pre_registration", "settings", "pre_registration", before: before, after: after);
                await db.SaveChangesAsync(ct);
                return Results.Ok(after);
            });
        }
    }
}
