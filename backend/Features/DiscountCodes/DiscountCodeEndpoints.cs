using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.DiscountCodes;

/*
 * İNDİRİM KODU — kayıt yenileyen eski öğrenciler için.
 *  - Site: POST /api/discount-codes/check { code } -> kod geçerliyse türü ve değeri döner (form fiyatları anında indirimli gösterir).
 *    Kodu tahmin etmeyi zorlaştırmak için IP başına 10 dakikada 5 istek ve tek tip hata mesajı.
 *  - Başvuru: ApplicationCreateHandler kodu yeniden doğrular, fiyata işler, kullanım sayısını artırır.
 *  - Panel: /api/admin/discount-codes (liste, oluştur, düzenle, sil).
 */

public static class DiscountCodeRules
{
    public const string InvalidMessage = "Bu kod geçersiz ya da süresi dolmuş.";

    public static string Normalize(string? code) => (code ?? "").Trim().ToUpperInvariant().Replace(" ", "");

    /// <summary>Kullanılabilir mi: aktif, süresi dolmamış, hakkı kalmış</summary>
    public static bool IsUsable(DiscountCode c, DateOnly today) =>
        c.IsActive && (c.ValidUntil is null || c.ValidUntil >= today) && (c.MaxUses is null || c.UsedCount < c.MaxUses);

    /// <summary>Okunaklı kod üretir (0/O, 1/I gibi karışan karakterler yok): YENILE-7KQ4M</summary>
    public static string Generate()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var chars = new char[5];
        for (var i = 0; i < chars.Length; i++) chars[i] = alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)];
        return "YENILE-" + new string(chars);
    }
}

/// <summary>Web sitesi: kod kontrolü. Dönüş: { code, kind, value, restricted }</summary>
public static class CheckDiscountCode
{
    public record Input(string? Code);

    public record Response(string Code, DiscountKind Kind, decimal Value, bool Restricted);

    public class Handler(AppDbContext db)
    {
        public async Task<Result<Response>> Handle(Input input, CancellationToken ct)
        {
            var code = DiscountCodeRules.Normalize(input.Code);
            if (code.Length is < 3 or > 20) return Error.Field("discountCode", DiscountCodeRules.InvalidMessage);

            var item = await db.DiscountCodes.AsNoTracking().FirstOrDefaultAsync(x => x.Code == code, ct);
            if (item is null || !DiscountCodeRules.IsUsable(item, TurkeyClock.Today))
                return Error.Field("discountCode", DiscountCodeRules.InvalidMessage);

            return new Response(item.Code, item.Kind, item.Value, item.Tc is not null);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/discount-codes/check", async (Input input, Handler handler, CancellationToken ct) =>
                    (await handler.Handle(input, ct)).ToOk())
                .AllowAnonymous()
                .RequireRateLimiting(RatePolicies.PublicForm);
    }
}

/// <summary>Panel: kod listesi, oluşturma, düzenleme, silme</summary>
public static class DiscountCodeAdmin
{
    public record Row(
        Guid Id, DateTime CreatedAt, string Code, string Label, DiscountKind Kind, decimal Value,
        DateOnly? ValidUntil, int? MaxUses, int UsedCount, bool IsActive, string? Tc);

    public record CreateCommand(string? Code, string? Label, DiscountKind Kind, decimal Value, DateOnly? ValidUntil, int? MaxUses, string? Tc);

    /// <summary>Tür ve değer oluşturulduktan sonra değişmez (verilmiş indirimler kodla eşleşsin); gerekirse yeni kod açılır</summary>
    public record UpdateCommand(string? Label, DateOnly? ValidUntil, int? MaxUses, bool IsActive, string? Tc);

    private static Row ToRow(DiscountCode x) => new(x.Id, x.CreatedAt, x.Code, x.Label, x.Kind, x.Value, x.ValidUntil, x.MaxUses, x.UsedCount, x.IsActive, x.Tc);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<List<Row>> List(CancellationToken ct) =>
            (await db.DiscountCodes.AsNoTracking().OrderByDescending(x => x.CreatedAt).Take(1000).ToListAsync(ct)).Select(ToRow).ToList();

        public async Task<Result<Row>> Create(CreateCommand cmd, CancellationToken ct)
        {
            var code = DiscountCodeRules.Normalize(cmd.Code);
            if (code.Length == 0) code = DiscountCodeRules.Generate();
            var label = (cmd.Label ?? "").Trim();
            var tc = string.IsNullOrWhiteSpace(cmd.Tc) ? null : cmd.Tc.Trim();

            var v = new Validator()
                .Must("code", code.Length is >= 4 and <= 20 && code.All(c => char.IsAsciiLetterOrDigit(c) || c == '-'), "Kod 4–20 karakter olmalı; yalnızca harf, rakam ve tire (Türkçe karakter yok).")
                .Must("label", label.Length <= 120, "Açıklama en fazla 120 karakter olabilir.")
                .Must("kind", Enum.IsDefined(cmd.Kind), "İndirim türünü seçin.")
                .Must("value", cmd.Value > 0, "İndirim değeri sıfırdan büyük olmalı.")
                .Must("value", cmd.Kind != DiscountKind.Percent || cmd.Value <= 90, "Yüzde en fazla 90 olabilir.")
                .Must("value", cmd.Value < 1_000_000, "Tutar çok büyük.")
                .Must("validUntil", cmd.ValidUntil is null || cmd.ValidUntil >= TurkeyClock.Today, "Son kullanma tarihi geçmişte olamaz.")
                .Must("maxUses", cmd.MaxUses is null || cmd.MaxUses is >= 1 and <= 10_000, "Kullanım hakkı 1–10.000 arasında olmalı (sınırsız için boş bırakın).")
                .Must("tc", tc is null || TurkishFormats.IsValidTc(tc), "Geçerli bir T.C. kimlik no girin (herkese açık kod için boş bırakın).");
            if (!v.IsValid) return v.ToFailure<Row>();

            if (await db.DiscountCodes.AnyAsync(x => x.Code == code, ct)) return Error.Conflict("Bu kod zaten var; başka bir kod yazın ya da boş bırakıp otomatik üretin.");

            var item = new DiscountCode
            {
                Code = code,
                Label = label,
                Kind = cmd.Kind,
                Value = decimal.Round(cmd.Value, 2),
                ValidUntil = cmd.ValidUntil,
                MaxUses = cmd.MaxUses,
                Tc = tc
            };
            db.DiscountCodes.Add(item);
            audit.Add("discount_code.create", "discount_code", item.Id, after: new { item.Code, item.Kind, item.Value, item.ValidUntil, item.MaxUses, restricted = tc is not null });
            await db.SaveChangesAsync(ct);
            return ToRow(item);
        }

        public async Task<Result<Row>> Update(Guid id, UpdateCommand cmd, CancellationToken ct)
        {
            var item = await db.DiscountCodes.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (item is null) return Error.NotFound("İndirim kodu bulunamadı.");

            var label = (cmd.Label ?? "").Trim();
            var tc = string.IsNullOrWhiteSpace(cmd.Tc) ? null : cmd.Tc.Trim();
            var v = new Validator()
                .Must("label", label.Length <= 120, "Açıklama en fazla 120 karakter olabilir.")
                .Must("maxUses", cmd.MaxUses is null || cmd.MaxUses >= Math.Max(1, item.UsedCount), $"Kullanım hakkı, şimdiye kadar kullanılan {item.UsedCount} adetten az olamaz.")
                .Must("maxUses", cmd.MaxUses is null || cmd.MaxUses <= 10_000, "Kullanım hakkı en fazla 10.000 olabilir.")
                .Must("tc", tc is null || TurkishFormats.IsValidTc(tc), "Geçerli bir T.C. kimlik no girin (herkese açık kod için boş bırakın).");
            if (!v.IsValid) return v.ToFailure<Row>();

            var before = new { item.Label, item.ValidUntil, item.MaxUses, item.IsActive, restricted = item.Tc is not null };
            item.Label = label;
            item.ValidUntil = cmd.ValidUntil;
            item.MaxUses = cmd.MaxUses;
            item.IsActive = cmd.IsActive;
            item.Tc = tc;

            audit.Add("discount_code.update", "discount_code", item.Id, before: before,
                after: new { item.Label, item.ValidUntil, item.MaxUses, item.IsActive, restricted = tc is not null });
            await db.SaveChangesAsync(ct);
            return ToRow(item);
        }

        public async Task<Result> Delete(Guid id, CancellationToken ct)
        {
            var item = await db.DiscountCodes.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (item is null) return Error.NotFound("İndirim kodu bulunamadı.");

            db.DiscountCodes.Remove(item); // soft delete; bu kodla açılmış başvurular kodu ve fiyatı kendi üzerinde taşır
            audit.Add("discount_code.delete", "discount_code", item.Id, before: new { item.Code, item.UsedCount });
            await db.SaveChangesAsync(ct);
            return Result.Success();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/admin/discount-codes", async (Handler handler, CancellationToken ct) => Results.Ok(await handler.List(ct)));
            app.MapPost("/api/admin/discount-codes", async (CreateCommand cmd, Handler handler, CancellationToken ct) => (await handler.Create(cmd, ct)).ToOk());
            app.MapPut("/api/admin/discount-codes/{id:guid}", async (Guid id, UpdateCommand cmd, Handler handler, CancellationToken ct) => (await handler.Update(id, cmd, ct)).ToOk());
            app.MapDelete("/api/admin/discount-codes/{id:guid}", async (Guid id, Handler handler, CancellationToken ct) => (await handler.Delete(id, ct)).ToNoContent());
        }
    }
}
