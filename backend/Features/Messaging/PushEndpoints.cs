using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Messaging;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Messaging;

/*
 * WEB PUSH BİLDİRİMLERİ (frontend PWA.md "Backend sözleşmesi")
 *  - Abonelik: öğrenci ve yönetici kendi cihazlarını ekler/siler. Yalnızca bilinen push servislerinin adresleri kabul edilir (SSRF).
 *  - Toplu bildirim: SMS gibi tek uç; şablon TR/EN, değişkenler sunucuda dolar, her cihaza kendi dilinde gider.
 *  - Bildirimi kapalı öğrenci atlanır (arayüz SMS önerir). Ölü abonelikler (404/410) otomatik silinir.
 */

public record PushKeys(string? P256dh, string? Auth);

public record SubscribeCommand(string? Endpoint, PushKeys? Keys, string? Lang, string? UserAgent);

public record UnsubscribeCommand(string? Endpoint);

public partial class PushSubscriptionHandler(AppDbContext db)
{
    [GeneratedRegex("^[A-Za-z0-9_-]+=*$")]
    private static partial Regex Base64Url();

    public async Task<Result> Upsert(PushOwner owner, Guid ownerId, SubscribeCommand cmd, CancellationToken ct)
    {
        var endpoint = cmd.Endpoint?.Trim() ?? "";
        var p256dh = cmd.Keys?.P256dh?.Trim() ?? "";
        var auth = cmd.Keys?.Auth?.Trim() ?? "";
        var lang = string.Equals(cmd.Lang, "en", StringComparison.OrdinalIgnoreCase) ? "en" : "tr";

        var v = new Validator()
            .Must("endpoint", PushRules.IsAllowedEndpoint(endpoint), "Bildirim aboneliği geçersiz.")
            .Must("keys", p256dh.Length is > 40 and <= 200 && Base64Url().IsMatch(p256dh), "Bildirim anahtarı geçersiz.")
            .Must("keys", auth.Length is > 10 and <= 100 && Base64Url().IsMatch(auth), "Bildirim anahtarı geçersiz.");
        if (!v.IsValid) return v.ToFailure();

        var hash = PushRules.Hash(endpoint);
        var subscription = await db.PushSubscriptions.FirstOrDefaultAsync(x => x.EndpointHash == hash, ct);
        if (subscription is null)
        {
            subscription = new PushSubscription { EndpointHash = hash, Endpoint = endpoint, CreatedAt = DateTime.UtcNow };
            db.PushSubscriptions.Add(subscription);
        }

        // Aynı cihazda başka kullanıcı oturum açtıysa abonelik yeni sahibine geçer
        subscription.OwnerType = owner;
        subscription.OwnerId = ownerId;
        subscription.P256dh = p256dh;
        subscription.Auth = auth;
        subscription.Lang = lang;
        subscription.UserAgent = cmd.UserAgent is { Length: > 0 } ua ? ua[..Math.Min(ua.Length, 300)] : null;
        subscription.FailureCount = 0;

        // Kişi başına en fazla 10 cihaz: fazlası en eskiden silinir
        var others = await db.PushSubscriptions.Where(x => x.OwnerType == owner && x.OwnerId == ownerId && x.EndpointHash != hash)
            .OrderByDescending(x => x.CreatedAt).Skip(PushRules.MaxDevicesPerOwner - 1).ToListAsync(ct);
        db.PushSubscriptions.RemoveRange(others);

        await db.SaveChangesAsync(ct);
        return Result.Success();
    }

    /// <summary>Yalnızca kendi aboneliğini silebilir</summary>
    public async Task<Result> Remove(PushOwner owner, Guid ownerId, UnsubscribeCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Endpoint)) return Error.Field("endpoint", "Abonelik belirtilmedi.");
        var hash = PushRules.Hash(cmd.Endpoint.Trim());
        var subscription = await db.PushSubscriptions.FirstOrDefaultAsync(x => x.EndpointHash == hash && x.OwnerType == owner && x.OwnerId == ownerId, ct);
        if (subscription is not null)
        {
            db.PushSubscriptions.Remove(subscription);
            await db.SaveChangesAsync(ct);
        }
        return Result.Success();
    }
}

public static class PushSubscriptionEndpoints
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            // Frontend'in abonelik için ihtiyaç duyduğu genel anahtar (gizli değildir)
            app.MapGet("/api/push/config", (IOptions<PushOptions> options) =>
                    Results.Ok(new { enabled = options.Value.Enabled, publicKey = options.Value.Enabled ? options.Value.PublicKey : null }))
                .AllowAnonymous();

            var student = app.MapGroup("/api/student/push").RequireAuthorization(AppPolicies.Student).RequireRateLimiting(RatePolicies.StudentWrite);
            student.MapPost("/subscriptions", async (SubscribeCommand cmd, ClaimsPrincipal user, PushSubscriptionHandler h, CancellationToken ct) =>
                (await h.Upsert(PushOwner.Student, user.GetUserId(), cmd, ct)).ToNoContent());
            student.MapDelete("/subscriptions", async ([FromBody] UnsubscribeCommand cmd, ClaimsPrincipal user, PushSubscriptionHandler h, CancellationToken ct) =>
                (await h.Remove(PushOwner.Student, user.GetUserId(), cmd, ct)).ToNoContent());
            student.MapPost("/test", async (ClaimsPrincipal user, PushTestHandler h, CancellationToken ct) =>
                (await h.Send(PushOwner.Student, user.GetUserId(), ct)).ToOk());

            var admin = app.MapGroup("/api/admin/push");
            admin.MapPost("/subscriptions", async (SubscribeCommand cmd, ClaimsPrincipal user, PushSubscriptionHandler h, CancellationToken ct) =>
                (await h.Upsert(PushOwner.Admin, user.GetUserId(), cmd, ct)).ToNoContent());
            admin.MapDelete("/subscriptions", async ([FromBody] UnsubscribeCommand cmd, ClaimsPrincipal user, PushSubscriptionHandler h, CancellationToken ct) =>
                (await h.Remove(PushOwner.Admin, user.GetUserId(), cmd, ct)).ToNoContent());
            admin.MapPost("/test", async (ClaimsPrincipal user, PushTestHandler h, CancellationToken ct) =>
                (await h.Send(PushOwner.Admin, user.GetUserId(), ct)).ToOk()).RequireRateLimiting(RatePolicies.Push);

            // Hangi öğrencinin bildirimi açık (toplu bildirim ekranında "bildirimi kapalı" ayrımı için)
            admin.MapGet("/audience", async (Guid periodId, AppDbContext db, CancellationToken ct) =>
            {
                var rows = await db.Enrollments.AsNoTracking().Where(x => x.PeriodId == periodId)
                    .Select(x => new
                    {
                        enrollmentId = x.Id,
                        studentId = x.StudentId,
                        devices = db.PushSubscriptions.Count(s => s.OwnerType == PushOwner.Student && s.OwnerId == x.StudentId)
                    })
                    .ToListAsync(ct);
                return Results.Ok(rows);
            });
        }
    }
}

/// <summary>Kendi cihazlarına test bildirimi</summary>
public class PushTestHandler(AppDbContext db, PushDispatcher dispatcher, WebPushSender sender)
{
    public record Response(int Devices, int Succeeded);

    public async Task<Result<Response>> Send(PushOwner owner, Guid ownerId, CancellationToken ct)
    {
        if (!sender.Enabled) return Error.Conflict("Bildirim servisi yapılandırılmamış (Push anahtarları).");
        var subscriptions = await db.PushSubscriptions.Where(x => x.OwnerType == owner && x.OwnerId == ownerId).ToListAsync(ct);
        if (subscriptions.Count == 0) return Error.Conflict("Bu hesapta bildirime açık cihaz yok.");

        var jobs = subscriptions.Select(s =>
        {
            var en = s.Lang == "en";
            var payload = owner == PushOwner.Admin
                ? new PushPayload("Mazlum Yönetim", "Bildirimler bu cihazda çalışıyor.", "/admin", "test")
                : new PushPayload("Mazlum Apart", en ? "Notifications are working on this device." : "Bildirimler bu cihazda çalışıyor.", "/ogrenci", "test");
            return (s, payload);
        }).ToList();

        var results = await dispatcher.SendAsync(jobs, ct);
        await db.SaveChangesAsync(ct);
        return new Response(subscriptions.Count, results.Values.Count(r => r == WebPushSender.Outcome.Ok));
    }
}

/// <summary>Toplu bildirim: { purpose, url, title{tr,en}, body{tr,en}, recipients:[{enrollmentId, chargeId?, vars?}] }</summary>
public record NotificationCommand(string? Purpose, string? Url, LocalizedText? Title, LocalizedText? Body, List<RecipientInput>? Recipients);

public record NotificationPreviewRow(Guid EnrollmentId, string Name, int Devices, string Title, string Body);

public record NotificationPreview(List<NotificationPreviewRow> Messages, List<SkippedRecipient> Skipped, bool Enabled);

public class NotificationComposeHandler(AppDbContext db, MessageAudienceHandler audience, WebPushSender sender)
{
    public const int MaxRecipients = 500;

    public sealed record Device(PushSubscription Subscription, string Title, string Body);

    public sealed record Prepared(ResolvedRecipient Recipient, List<Device> Devices, string TitleTr, string BodyTr);

    public sealed record Composition(string Purpose, string Url, LocalizedText Title, LocalizedText Body, List<Prepared> Messages, List<SkippedRecipient> Skipped);

    public async Task<Result<Composition>> ComposeAsync(NotificationCommand cmd, CancellationToken ct)
    {
        var purpose = cmd.Purpose?.Trim() ?? "";
        var url = cmd.Url?.Trim() is { Length: > 0 } u ? u : "/ogrenci";
        var title = new LocalizedText { Tr = cmd.Title?.Tr?.Trim() ?? "", En = cmd.Title?.En?.Trim() ?? "" };
        var body = new LocalizedText { Tr = cmd.Body?.Tr?.Trim() ?? "", En = cmd.Body?.En?.Trim() ?? "" };
        var recipients = cmd.Recipients ?? [];

        var v = new Validator()
            .Must("purpose", MessagePurposes.All.Contains(purpose), "Bildirim amacını seçin.")
            .Must("url", PushRules.IsAllowedUrl(url, PushOwner.Student), "Bağlantı öğrenci portalında bir sayfa olmalı.")
            .Required("title.tr", title.Tr, "Türkçe başlığı yazın.")
            .Required("body.tr", body.Tr, "Türkçe mesajı yazın.")
            .MaxLength("title.tr", title.Tr, 200).MaxLength("title.en", title.En, 200)
            .MaxLength("body.tr", body.Tr, 600).MaxLength("body.en", body.En, 600)
            .Must("recipients", recipients.Count > 0, "En az bir alıcı seçin.")
            .Must("recipients", recipients.Count <= MaxRecipients, $"Bir seferde en fazla {MaxRecipients} kişiye bildirim gönderilebilir.");
        if (!v.IsValid) return v.ToFailure<Composition>();

        var (found, skipped) = await audience.ResolveAsync(recipients, allowApplications: false, ct);

        var studentIds = found.Where(r => r.StudentId is not null).Select(r => r.StudentId!.Value).Distinct().ToList();
        var subscriptions = (await db.PushSubscriptions.Where(x => x.OwnerType == PushOwner.Student && studentIds.Contains(x.OwnerId)).ToListAsync(ct))
            .ToLookup(x => x.OwnerId);

        var messages = new List<Prepared>();
        var seen = new HashSet<Guid>();
        foreach (var r in found)
        {
            if (r.StudentId is not { } studentId || r.EnrollmentId is null) { skipped.Add(Skip(r, "Kayıtlı öğrenci değil")); continue; }
            if (!seen.Add(studentId)) { skipped.Add(Skip(r, "Aynı öğrenci listede iki kez var")); continue; }

            var devices = subscriptions[studentId].ToList();
            if (devices.Count == 0) { skipped.Add(Skip(r, "Bildirimi kapalı")); continue; }

            var prepared = new List<Device>();
            string? problem = null;
            foreach (var device in devices)
            {
                var english = device.Lang == "en" && !string.IsNullOrWhiteSpace(title.En) && !string.IsNullOrWhiteSpace(body.En);
                var vars = english ? r.VarsEn : r.VarsTr;
                var t = MessageAudienceHandler.Fill(english ? title.En : title.Tr, vars);
                var b = MessageAudienceHandler.Fill(english ? body.En : body.Tr, vars);
                if (MessageAudienceHandler.HasUnfilled(t + b)) { problem = "Doldurulmamış değişken var"; break; }
                if (t.Length > PushRules.TitleMax) { problem = $"Başlık {PushRules.TitleMax} karakteri aşıyor"; break; }
                if (b.Length > PushRules.BodyMax) { problem = $"Mesaj {PushRules.BodyMax} karakteri aşıyor"; break; }
                prepared.Add(new Device(device, t, b));
            }
            if (problem is not null) { skipped.Add(Skip(r, problem)); continue; }

            messages.Add(new Prepared(r, prepared,
                MessageAudienceHandler.Fill(title.Tr, r.VarsTr, r.SecretKeys), MessageAudienceHandler.Fill(body.Tr, r.VarsTr, r.SecretKeys)));
        }

        return new Composition(purpose, url, title, body, messages, skipped);
    }

    private static SkippedRecipient Skip(ResolvedRecipient r, string reason) => new(r.EnrollmentId, r.ApplicationId, r.Name, reason);

    public NotificationPreview ToPreview(Composition c) =>
        new(c.Messages.Select(m => new NotificationPreviewRow(m.Recipient.EnrollmentId!.Value, m.Recipient.Name, m.Devices.Count, m.TitleTr, m.BodyTr)).ToList(),
            c.Skipped, sender.Enabled);
}

public static class PreviewNotification
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/notifications/preview", async (NotificationCommand cmd, NotificationComposeHandler composer, CancellationToken ct) =>
            {
                var composed = await composer.ComposeAsync(cmd, ct);
                return composed.IsSuccess ? Results.Ok(composer.ToPreview(composed.Value!)) : composed.Error!.ToProblem();
            });
    }
}

public static class SendNotification
{
    public record SentRow(Guid EnrollmentId, string Name, int Devices, int Succeeded);

    public record Response(Guid BatchId, int Delivered, int Failed, List<SentRow> Sent, List<SkippedRecipient> Skipped);

    public class Handler(AppDbContext db, NotificationComposeHandler composer, PushDispatcher dispatcher, WebPushSender sender,
        IdempotencyGuard idempotency, AuditWriter audit)
    {
        public async Task<Result<Response>> Handle(NotificationCommand cmd, ClaimsPrincipal user, Guid? key, CancellationToken ct)
        {
            if (!sender.Enabled) return Error.Conflict("Bildirim servisi yapılandırılmamış (Push anahtarları).");

            var composed = await composer.ComposeAsync(cmd, ct);
            if (!composed.IsSuccess) return composed.Error!;
            var c = composed.Value!;
            if (c.Messages.Count == 0)
                return Error.Field("recipients", $"Bildirim gönderilebilecek kimse yok: {c.Skipped.FirstOrDefault()?.Reason ?? "geçersiz mesaj"}.");

            if (await idempotency.BeginAsync(key, "push.send", user.GetUserId(), ct) is { } dup) return dup;

            var jobs = c.Messages.SelectMany(m => m.Devices.Select(d => (d.Subscription, new PushPayload(d.Title, d.Body, c.Url)))).ToList();
            var results = await dispatcher.SendAsync(jobs, CancellationToken.None);

            var batch = new NotificationBatch
            {
                Purpose = c.Purpose,
                Url = c.Url,
                TitleTr = Cut(c.Title.Tr, 65),
                TitleEn = string.IsNullOrWhiteSpace(c.Title.En) ? null : Cut(c.Title.En, 65),
                BodyTr = Cut(c.Body.Tr, 240),
                BodyEn = string.IsNullOrWhiteSpace(c.Body.En) ? null : Cut(c.Body.En, 240),
                RecipientCount = c.Messages.Count,
                SkippedCount = c.Skipped.Count,
                CreatedById = user.GetUserId(),
                CreatedByName = user.GetDisplayName()
            };
            db.NotificationBatches.Add(batch);

            var sent = new List<SentRow>();
            foreach (var m in c.Messages)
            {
                var ok = m.Devices.Count(d => results.TryGetValue(d.Subscription.Id, out var outcome) && outcome == WebPushSender.Outcome.Ok);
                sent.Add(new SentRow(m.Recipient.EnrollmentId!.Value, m.Recipient.Name, m.Devices.Count, ok));
                db.NotificationDeliveries.Add(new NotificationDelivery
                {
                    BatchId = batch.Id,
                    StudentId = m.Recipient.StudentId!.Value,
                    EnrollmentId = m.Recipient.EnrollmentId,
                    RecipientName = m.Recipient.Name,
                    Lang = m.Devices[0].Subscription.Lang,
                    Title = Cut(m.TitleTr, 120),
                    Body = Cut(m.BodyTr, 400),
                    Devices = m.Devices.Count,
                    Succeeded = ok,
                    Failed = m.Devices.Count - ok
                });

                if (ok > 0)
                {
                    db.ContactLogs.Add(new ContactLog
                    {
                        PeriodId = m.Recipient.PeriodId!.Value,
                        EnrollmentId = m.Recipient.EnrollmentId!.Value,
                        Channel = ContactChannel.Push,
                        Purpose = c.Purpose,
                        Note = Cut($"{m.TitleTr} — {m.BodyTr}", 1000),
                        NotificationBatchId = batch.Id,
                        CreatedById = batch.CreatedById,
                        CreatedByName = batch.CreatedByName
                    });
                }
            }
            batch.DeliveredCount = sent.Count(s => s.Succeeded > 0);
            batch.FailedCount = sent.Count(s => s.Succeeded == 0);

            audit.Add("push.bulk", "notification", batch.Id, c.Messages[0].Recipient.PeriodId,
                after: new { purpose = c.Purpose, title = batch.TitleTr, recipients = c.Messages.Count, delivered = batch.DeliveredCount, skipped = c.Skipped.Count });
            await db.SaveChangesAsync(CancellationToken.None);

            return new Response(batch.Id, batch.DeliveredCount, batch.FailedCount, sent, c.Skipped);
        }

        private static string Cut(string value, int max) => value.Length > max ? value[..max] : value;
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/notifications/send", async (NotificationCommand cmd, [FromHeader(Name = IdempotencyGuard.Header)] Guid? key,
                    ClaimsPrincipal user, Handler h, CancellationToken ct) => (await h.Handle(cmd, user, key, ct)).ToOk())
                .RequireRateLimiting(RatePolicies.Push);
    }
}

public static class NotificationHistory
{
    public record BatchRow(Guid Id, DateTime CreatedAt, string Purpose, string Url, string TitleTr, string BodyTr,
        int RecipientCount, int SkippedCount, int DeliveredCount, int FailedCount, string? CreatedBy);

    public record DeliveryRow(Guid StudentId, Guid? EnrollmentId, string Name, string Lang, string Title, string Body, int Devices, int Succeeded);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/admin/notifications/batches", async (int? page, int? pageSize, AppDbContext db, CancellationToken ct) =>
            {
                var (p, s) = Paging.Normalize(page, pageSize, 20, 100);
                var total = await db.NotificationBatches.CountAsync(ct);
                var rows = await db.NotificationBatches.AsNoTracking().OrderByDescending(x => x.CreatedAt).Skip((p - 1) * s).Take(s)
                    .Select(x => new BatchRow(x.Id, x.CreatedAt, x.Purpose, x.Url, x.TitleTr, x.BodyTr, x.RecipientCount, x.SkippedCount,
                        x.DeliveredCount, x.FailedCount, x.CreatedByName))
                    .ToListAsync(ct);
                return Results.Ok(new PagedResult<BatchRow>(rows, total, p, s));
            });

            app.MapGet("/api/admin/notifications/batches/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
            {
                var batch = await db.NotificationBatches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
                if (batch is null) return Error.NotFound("Bildirim gönderimi bulunamadı.").ToProblem();
                var deliveries = await db.NotificationDeliveries.AsNoTracking().Where(x => x.BatchId == id).OrderBy(x => x.RecipientName)
                    .Select(x => new DeliveryRow(x.StudentId, x.EnrollmentId, x.RecipientName, x.Lang, x.Title, x.Body, x.Devices, x.Succeeded))
                    .ToListAsync(ct);
                return Results.Ok(new
                {
                    batch = new BatchRow(batch.Id, batch.CreatedAt, batch.Purpose, batch.Url, batch.TitleTr, batch.BodyTr, batch.RecipientCount,
                        batch.SkippedCount, batch.DeliveredCount, batch.FailedCount, batch.CreatedByName),
                    deliveries
                });
            });
        }
    }
}
