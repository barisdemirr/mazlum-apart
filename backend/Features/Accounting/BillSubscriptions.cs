using System.Security.Claims;
using System.Text.RegularExpressions;
using Hangfire;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Accounting;

/*
 * FATURA ABONELİKLERİ. Yönetici bir kez "Elektrik · abone no 1234567" tanımlar; sistem her ay için o aboneye ait bir "fatura bekleniyor"
 * kaydı (Bill, AwaitingInvoice=true) üretir. Tutar son gerçek faturanın tutarıdır (yoksa tahmini tutar), vade aboneliğin ayın günüdür.
 * Gerçek fatura gelince yönetici ilgili kaydın tutarını ve son ödeme tarihini günceller (UpdateBill) ve kayıt normal faturaya dönüşür.
 *
 * Üretim üç yerden tetiklenir ve her biri aynı idempotent kodu çalıştırır (aynı ay iki kez üretilmez; veritabanında benzersiz dizin vardır):
 *   1. Günlük arka plan görevi (BillSubscriptions:Cron, varsayılan her gün 06:00 Türkiye saati)
 *   2. Abonelik eklendiğinde / güncellendiğinde
 *   3. Faturalar sayfası açıldığında (görev çalışmamış olsa bile liste eksik kalmaz)
 * Elle silinen aylık kayıt yeniden üretilmez. Kapalı döneme ve dönemi olmayan aya kayıt üretilmez.
 */
public sealed class BillSubscriptionOptions
{
    public string Cron { get; set; } = "0 6 * * *";
}

public sealed class BillSubscriptionGenerator(AppDbContext db, ILogger<BillSubscriptionGenerator> logger)
{
    private const int MaxBackfillMonths = 36;

    /// <summary>"2026-10" → ay başı; geçersizse null</summary>
    private static DateOnly? FirstOf(string month) =>
        Money.IsMonth(month) ? DateOnly.ParseExact(month + "-01", "yyyy-MM-dd") : null;

    /// <summary>Vade günü: ayın günü, kısa aylarda ayın son günü</summary>
    public static DateOnly DueDateOf(string month, int dueDay)
    {
        var first = FirstOf(month)!.Value;
        return new DateOnly(first.Year, first.Month, Math.Min(Math.Max(dueDay, 1), DateTime.DaysInMonth(first.Year, first.Month)));
    }

    /// <summary>Yeni aylık kaydın tutarı: aboneliğin son gerçek (girilmiş) faturası, yoksa tahmini tutar</summary>
    public static decimal PlaceholderAmount(BillSubscription sub, IEnumerable<(string Month, decimal Amount, bool Awaiting)> bills) =>
        bills.Where(b => !b.Awaiting).OrderByDescending(b => b.Month, StringComparer.Ordinal).Select(b => (decimal?)b.Amount).FirstOrDefault()
        ?? sub.EstimatedAmount;

    /// <summary>Eksik aylık kayıtları üretir; üretilen sayıyı döner. Hata olursa uygulamayı düşürmez (günlüğe yazar).</summary>
    public async Task<int> EnsureAsync(CancellationToken ct)
    {
        try
        {
            var subs = await db.BillSubscriptions.Where(x => x.IsActive).ToListAsync(ct);
            if (subs.Count == 0) return 0;

            var currentMonth = Money.MonthOf(TurkeyClock.Today);
            var periods = await db.Periods.AsNoTracking().Where(x => x.Status != PeriodStatus.Closed).ToListAsync(ct);
            if (periods.Count == 0) return 0;

            var ids = subs.Select(x => x.Id).ToList();
            // Silinmiş kayıtlar da okunur: elle silinen ay yeniden üretilmesin
            var existing = (await db.Bills.IgnoreQueryFilters().AsNoTracking()
                    .Where(b => b.SubscriptionId != null && ids.Contains(b.SubscriptionId.Value))
                    .Select(b => new { SubscriptionId = b.SubscriptionId!.Value, b.Month, b.Amount, b.AwaitingInvoice, b.DeletedAt })
                    .ToListAsync(ct))
                .ToLookup(b => b.SubscriptionId);

            var created = 0;
            foreach (var sub in subs)
            {
                var mine = existing[sub.Id].ToList();
                var known = mine.Select(b => b.Month).ToHashSet(StringComparer.Ordinal);
                var history = mine.Where(b => b.DeletedAt is null).Select(b => (b.Month, b.Amount, b.AwaitingInvoice)).ToList();

                foreach (var month in MonthsFrom(sub.StartMonth, currentMonth))
                {
                    if (known.Contains(month)) continue;
                    var first = FirstOf(month)!.Value;
                    var last = new DateOnly(first.Year, first.Month, DateTime.DaysInMonth(first.Year, first.Month));
                    var period = periods.Where(p => p.StartDate <= last && p.EndDate >= first)
                        .OrderBy(p => p.Status == PeriodStatus.Active ? 0 : 1).ThenByDescending(p => p.StartDate).FirstOrDefault();
                    if (period is null) continue;

                    db.Bills.Add(new Bill
                    {
                        PeriodId = period.Id,
                        Kind = sub.Kind,
                        Month = month,
                        Amount = PlaceholderAmount(sub, history),
                        DueDate = DueDateOf(month, sub.DueDay),
                        Note = sub.Note,
                        SubscriptionId = sub.Id,
                        SubscriberNo = sub.SubscriberNo,
                        AwaitingInvoice = true
                    });
                    created++;
                }
            }

            if (created > 0) await db.SaveChangesAsync(ct);
            return created;
        }
        catch (DbUpdateException ex)
        {
            // Aynı anda iki yerden üretim: benzersiz dizin ikincisini reddeder, ilki yazmıştır
            db.ChangeTracker.Clear();
            logger.LogWarning(ex, "Fatura abonelik kaydı üretilemedi (eşzamanlı çalışma olabilir).");
            return 0;
        }
    }

    private static IEnumerable<string> MonthsFrom(string start, string end)
    {
        var from = FirstOf(start);
        var to = FirstOf(end);
        if (from is null || to is null) yield break;

        var cursor = from.Value;
        for (var i = 0; cursor <= to.Value && i < MaxBackfillMonths; i++, cursor = cursor.AddMonths(1))
            yield return Money.MonthOf(cursor);
    }
}

/// <summary>Günlük arka plan görevi: tüm aktif abonelikler için eksik aylık kayıtları üretir</summary>
public sealed class BillSubscriptionJob(BillSubscriptionGenerator generator, ILogger<BillSubscriptionJob> logger)
{
    public const string JobId = "bill-subscriptions";

    [DisableConcurrentExecution(300)]
    [AutomaticRetry(Attempts = 1)]
    public async Task RunAsync(CancellationToken ct)
    {
        var created = await generator.EnsureAsync(ct);
        if (created > 0) logger.LogInformation("Abonelik faturası kaydı üretildi: {Count}", created);
    }
}

public sealed class BillSubscriptionScheduler(IRecurringJobManager jobs, IOptions<BillSubscriptionOptions> options, ILogger<BillSubscriptionScheduler> logger) : IHostedService
{
    // Türkiye kalıcı UTC+3: sunucu işletim sisteminden bağımsız
    private static readonly TimeZoneInfo Turkey = TimeZoneInfo.CreateCustomTimeZone("TR", TimeSpan.FromHours(3), "Türkiye", "Türkiye");

    public Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            jobs.AddOrUpdate<BillSubscriptionJob>(BillSubscriptionJob.JobId, job => job.RunAsync(CancellationToken.None), options.Value.Cron,
                new RecurringJobOptions { TimeZone = Turkey });
        }
        catch (Exception ex)
        {
            // Hangfire veritabanına ulaşılamaz ya da cron geçersiz: uygulama yine de açılır (sayfa açılışında üretim yine çalışır)
            logger.LogError(ex, "Fatura abonelik görevi kaydedilemedi.");
        }
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

/// <summary>
/// Abonelik satırı. LastAmount: son gerçek faturanın tutarı (yeni aylık kayıtların tutarı bu olur).
/// AwaitingCount: gerçek faturası henüz girilmemiş aylık kayıt sayısı.
/// </summary>
public record SubscriptionRow(
    Guid Id, BillKind Kind, string SubscriberNo, string? Provider, int DueDay, decimal EstimatedAmount, decimal? LastAmount,
    string StartMonth, string? Note, bool Active, int AwaitingCount);

public static class SubscriptionRules
{
    private static readonly Regex SubscriberNoPattern = new(@"^[0-9A-Za-zÇĞİÖŞÜçğıöşü\-./ ]+$", RegexOptions.Compiled);

    public record Input(BillKind? Kind, string? SubscriberNo, string? Provider, int DueDay, decimal EstimatedAmount, string? StartMonth, string? Note, bool? Active);

    public record Clean(BillKind Kind, string SubscriberNo, string? Provider, int DueDay, decimal EstimatedAmount, string StartMonth, string? Note, bool Active);

    public static (Clean? Value, Validator Errors) Validate(Input input)
    {
        var no = input.SubscriberNo?.Trim() ?? "";
        var provider = input.Provider?.Trim() ?? "";
        var note = input.Note?.Trim() ?? "";
        var start = string.IsNullOrWhiteSpace(input.StartMonth) ? Money.MonthOf(TurkeyClock.Today) : input.StartMonth.Trim();

        var v = new Validator()
            .Must("kind", input.Kind is not null, "Fatura türünü seçin.")
            .Required("subscriberNo", no, "Abone numarasını girin.")
            .MaxLength("subscriberNo", no, 30)
            .Must("subscriberNo", no.Length == 0 || SubscriberNoPattern.IsMatch(no), "Abone numarası yalnızca harf, rakam, boşluk ve - . / içerebilir.")
            .Must("dueDay", input.DueDay is >= 1 and <= 31, "Vade günü 1 ile 31 arasında olmalı.")
            .Must("startMonth", Money.IsMonth(start), "Başlangıç ayı geçerli değil.")
            .MaxLength("provider", provider, 60)
            .MaxLength("note", note, 300);
        if (Money.Check(input.EstimatedAmount) is { } money) v.AddError("estimatedAmount", money);

        if (!v.IsValid) return (null, v);
        return (new Clean(input.Kind!.Value, no, provider.Length == 0 ? null : provider, input.DueDay, input.EstimatedAmount, start,
            note.Length == 0 ? null : note, input.Active ?? true), v);
    }

    public static async Task<Dictionary<Guid, (decimal? Last, int Awaiting)>> StatsAsync(AppDbContext db, IReadOnlyCollection<Guid> ids, CancellationToken ct)
    {
        var bills = await db.Bills.AsNoTracking()
            .Where(b => b.SubscriptionId != null && ids.Contains(b.SubscriptionId.Value))
            .Select(b => new { SubscriptionId = b.SubscriptionId!.Value, b.Month, b.Amount, b.AwaitingInvoice, b.Status })
            .ToListAsync(ct);

        return bills.GroupBy(b => b.SubscriptionId).ToDictionary(
            g => g.Key,
            g => (
                g.Where(b => !b.AwaitingInvoice).OrderByDescending(b => b.Month, StringComparer.Ordinal).Select(b => (decimal?)b.Amount).FirstOrDefault(),
                g.Count(b => b.AwaitingInvoice && b.Status == BillStatus.Unpaid)));
    }

    public static SubscriptionRow ToRow(BillSubscription s, (decimal? Last, int Awaiting) stats) =>
        new(s.Id, s.Kind, s.SubscriberNo, s.Provider, s.DueDay, s.EstimatedAmount, stats.Last, s.StartMonth, s.Note, s.IsActive, stats.Awaiting);
}

/// <summary>Abonelik listesi (türüne ve abone numarasına göre)</summary>
public static class GetBillSubscriptions
{
    public class Handler(AppDbContext db)
    {
        public async Task<Result<List<SubscriptionRow>>> Handle(CancellationToken ct)
        {
            var subs = await db.BillSubscriptions.AsNoTracking().OrderBy(x => x.Kind).ThenBy(x => x.SubscriberNo).ToListAsync(ct);
            var stats = await SubscriptionRules.StatsAsync(db, subs.Select(x => x.Id).ToList(), ct);
            return subs.Select(s => SubscriptionRules.ToRow(s, stats.GetValueOrDefault(s.Id))).ToList();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/bill-subscriptions", async (Handler h, CancellationToken ct) => (await h.Handle(ct)).ToOk());
    }
}

public static class CreateBillSubscription
{
    public class Handler(AppDbContext db, BillSubscriptionGenerator generator, IdempotencyGuard idempotency, AuditWriter audit)
    {
        public async Task<Result<SubscriptionRow>> Handle(SubscriptionRules.Input input, Guid adminId, Guid? key, CancellationToken ct)
        {
            var (clean, v) = SubscriptionRules.Validate(input);
            if (clean is null) return v.ToFailure<SubscriptionRow>();

            if (await db.BillSubscriptions.AnyAsync(x => x.Kind == clean.Kind && x.SubscriberNo == clean.SubscriberNo, ct))
                return Error.Field("subscriberNo", "Bu abone numarası bu türde zaten tanımlı.");

            if (await idempotency.BeginAsync(key, "bill-subscription.create", adminId, ct) is { } dup) return dup;

            var sub = new BillSubscription
            {
                Kind = clean.Kind,
                SubscriberNo = clean.SubscriberNo,
                Provider = clean.Provider,
                DueDay = clean.DueDay,
                EstimatedAmount = clean.EstimatedAmount,
                StartMonth = clean.StartMonth,
                Note = clean.Note,
                IsActive = clean.Active
            };
            db.BillSubscriptions.Add(sub);
            audit.Add("bill-subscription.create", "bill-subscription", sub.Id, after: new { sub.Kind, sub.SubscriberNo, sub.Provider, sub.DueDay, sub.EstimatedAmount, sub.StartMonth });
            await db.SaveChangesAsync(ct);

            await generator.EnsureAsync(ct); // bu ayın "fatura bekleniyor" kaydı hemen görünsün
            var stats = await SubscriptionRules.StatsAsync(db, [sub.Id], ct);
            return SubscriptionRules.ToRow(sub, stats.GetValueOrDefault(sub.Id));
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/bill-subscriptions", async (SubscriptionRules.Input input, [FromHeader(Name = IdempotencyGuard.Header)] Guid? key,
                    ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(input, user.GetUserId(), key, ct)).ToOk());
    }
}

/// <summary>
/// Abonelik güncelleme. Geçmiş faturalar değişmez. Henüz gerçek faturası girilmemiş (bekleyen) aylık kayıtların vadesi yeni güne,
/// tutarı yeni duruma göre güncellenir.
/// </summary>
public static class UpdateBillSubscription
{
    public class Handler(AppDbContext db, BillSubscriptionGenerator generator, AuditWriter audit)
    {
        public async Task<Result<SubscriptionRow>> Handle(Guid id, SubscriptionRules.Input input, CancellationToken ct)
        {
            var sub = await db.BillSubscriptions.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (sub is null) return Error.NotFound("Abonelik bulunamadı.");

            var (clean, v) = SubscriptionRules.Validate(input with { StartMonth = input.StartMonth ?? sub.StartMonth, Active = input.Active ?? sub.IsActive });
            if (clean is null) return v.ToFailure<SubscriptionRow>();

            if (await db.BillSubscriptions.AnyAsync(x => x.Id != id && x.Kind == clean.Kind && x.SubscriberNo == clean.SubscriberNo, ct))
                return Error.Field("subscriberNo", "Bu abone numarası bu türde zaten tanımlı.");

            var before = new { sub.Kind, sub.SubscriberNo, sub.Provider, sub.DueDay, sub.EstimatedAmount, sub.StartMonth, sub.IsActive };
            sub.Kind = clean.Kind;
            sub.SubscriberNo = clean.SubscriberNo;
            sub.Provider = clean.Provider;
            sub.DueDay = clean.DueDay;
            sub.EstimatedAmount = clean.EstimatedAmount;
            sub.StartMonth = clean.StartMonth;
            sub.Note = clean.Note;
            sub.IsActive = clean.Active;

            // Bekleyen aylık kayıtlar yeni vade gününe ve tutara uyar
            var bills = await db.Bills.Where(b => b.SubscriptionId == id).ToListAsync(ct);
            var history = bills.Select(b => (b.Month, b.Amount, b.AwaitingInvoice)).ToList();
            foreach (var bill in bills.Where(b => b.AwaitingInvoice && b.Status == BillStatus.Unpaid))
            {
                bill.Kind = sub.Kind;
                bill.SubscriberNo = sub.SubscriberNo;
                bill.DueDate = BillSubscriptionGenerator.DueDateOf(bill.Month, sub.DueDay);
                bill.Amount = BillSubscriptionGenerator.PlaceholderAmount(sub, history);
            }

            audit.Add("bill-subscription.update", "bill-subscription", sub.Id, before: before,
                after: new { sub.Kind, sub.SubscriberNo, sub.Provider, sub.DueDay, sub.EstimatedAmount, sub.StartMonth, sub.IsActive });
            await db.SaveChangesAsync(ct);

            await generator.EnsureAsync(ct);
            var stats = await SubscriptionRules.StatsAsync(db, [sub.Id], ct);
            return SubscriptionRules.ToRow(sub, stats.GetValueOrDefault(sub.Id));
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/bill-subscriptions/{id:guid}", async (Guid id, SubscriptionRules.Input input, Handler h, CancellationToken ct) =>
                (await h.Handle(id, input, ct)).ToOk());
    }
}

/// <summary>Aboneliği siler: bekleyen (gerçek faturası girilmemiş) aylık kayıtlar da silinir; girilmiş ve ödenmiş faturalar kalır.</summary>
public static class DeleteBillSubscription
{
    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result> Handle(Guid id, CancellationToken ct)
        {
            var sub = await db.BillSubscriptions.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (sub is null) return Error.NotFound("Abonelik bulunamadı.");

            var awaiting = await db.Bills.Where(b => b.SubscriptionId == id && b.AwaitingInvoice && b.Status == BillStatus.Unpaid).ToListAsync(ct);
            db.Bills.RemoveRange(awaiting);
            db.BillSubscriptions.Remove(sub);
            audit.Add("bill-subscription.delete", "bill-subscription", id, before: new { sub.Kind, sub.SubscriberNo }, note: $"{awaiting.Count} bekleyen kayıt silindi");
            await db.SaveChangesAsync(ct);
            return Result.Success();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapDelete("/api/admin/bill-subscriptions/{id:guid}", async (Guid id, Handler h, CancellationToken ct) => (await h.Handle(id, ct)).ToNoContent());
    }
}
