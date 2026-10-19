using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Accounting;

/// <summary>
/// Fatura satırı. State hesaplanır (frontend billState): paid | awaiting (abonelikten üretildi, gerçek fatura henüz girilmedi)
/// | overdue (vadesi geçti) | soon (7 gün içinde) | unpaid.
/// </summary>
public record BillRow(
    Guid Id, Guid PeriodId, string PeriodName, BillKind Kind, string Month, decimal Amount, DateOnly DueDate, string? Note,
    BillStatus Status, string State, DateOnly? PaidAt, Guid? ExpenseId, DateTime CreatedAt,
    Guid? SubscriptionId, string? SubscriberNo, bool AwaitingInvoice);

public static class BillRules
{
    public const int SoonDays = 7;

    public static string StateOf(Bill bill, DateOnly today)
    {
        if (bill.Status == BillStatus.Paid) return "paid";
        if (bill.AwaitingInvoice) return "awaiting"; // tutar tahmini: gecikmiş / yaklaşan sayılmaz
        var days = bill.DueDate.DayNumber - today.DayNumber;
        if (days < 0) return "overdue";
        return days <= SoonDays ? "soon" : "unpaid";
    }

    public static BillRow ToRow(Bill b, string periodName, DateOnly today) =>
        new(b.Id, b.PeriodId, periodName, b.Kind, b.Month, b.Amount, b.DueDate, b.Note, b.Status, StateOf(b, today), b.PaidAt, b.ExpenseId, b.CreatedAt,
            b.SubscriptionId, b.SubscriberNo, b.AwaitingInvoice);

    public static string Label(BillKind kind) => kind switch
    {
        BillKind.Electricity => "Elektrik",
        BillKind.Water => "Su",
        BillKind.Gas => "Doğalgaz",
        BillKind.Internet => "İnternet",
        _ => "Fatura"
    };
}

/// <summary>Faturalar sayfası: dönemin faturaları + önceki dönemlerden ödenmemiş kalanlar</summary>
public static class GetBills
{
    public record Response(List<BillRow> Items, List<BillRow> CarriedOver);

    public class Handler(AppDbContext db, BillSubscriptionGenerator subscriptions)
    {
        public async Task<Result<Response>> Handle(Guid periodId, CancellationToken ct)
        {
            var period = await db.Periods.AsNoTracking().FirstOrDefaultAsync(x => x.Id == periodId, ct);
            if (period is null) return Error.NotFound("Dönem bulunamadı.");
            var today = TurkeyClock.Today;

            await subscriptions.EnsureAsync(ct); // günlük görev çalışmamış olsa bile abonelik kayıtları eksik kalmaz

            var items = await db.Bills.AsNoTracking().Where(x => x.PeriodId == periodId)
                .OrderByDescending(x => x.Status).ThenBy(x => x.DueDate).ToListAsync(ct); // önce ödenmemişler

            var older = await db.Bills.AsNoTracking()
                .Where(x => x.Status == BillStatus.Unpaid && !x.AwaitingInvoice) // tahmini (gerçek faturası girilmemiş) kayıtlar devreden sayılmaz
                .Join(db.Periods, b => b.PeriodId, p => p.Id, (b, p) => new { b, p })
                .Where(x => x.p.Id != periodId && x.p.StartDate < period.StartDate)
                .OrderBy(x => x.b.DueDate)
                .ToListAsync(ct);

            return new Response(
                items.Select(b => BillRules.ToRow(b, period.Name, today)).ToList(),
                older.Select(x => BillRules.ToRow(x.b, x.p.Name, today)).ToList());
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/bills", async (Guid periodId, Handler h, CancellationToken ct) => (await h.Handle(periodId, ct)).ToOk());
    }
}

/// <summary>Fatura kaydı. Bakiyeyi DEĞİŞTİRMEZ; ödemesi işlenince gider + hesap hareketi oluşur.</summary>
public static class CreateBill
{
    public record Command(Guid PeriodId, BillKind? Kind, string? Month, decimal Amount, DateOnly? DueDate, string? Note);

    public class Handler(AppDbContext db, IdempotencyGuard idempotency, AuditWriter audit)
    {
        public async Task<Result<BillRow>> Handle(Command cmd, Guid adminId, Guid? key, CancellationToken ct)
        {
            var note = cmd.Note?.Trim() ?? "";
            var month = cmd.Month?.Trim();
            var v = new Validator()
                .Must("kind", cmd.Kind is not null, "Fatura türünü seçin.")
                .Must("month", Money.IsMonth(month), "Ait olduğu ayı seçin.")
                .Must("dueDate", cmd.DueDate is not null, "Son ödeme tarihini seçin.")
                .MaxLength("note", note, 300);
            if (Money.Check(cmd.Amount) is { } money) v.AddError("amount", money);
            if (!v.IsValid) return v.ToFailure<BillRow>();

            var period = await db.Periods.AsNoTracking().FirstOrDefaultAsync(x => x.Id == cmd.PeriodId, ct);
            if (period is null) return Error.NotFound("Dönem bulunamadı.");
            if (PeriodRules.RequireOpen(period, "Fatura girişi") is { } closed) return closed;

            if (await idempotency.BeginAsync(key, "bill.create", adminId, ct) is { } dup) return dup;

            var bill = new Bill
            {
                PeriodId = period.Id,
                Kind = cmd.Kind!.Value,
                Month = month!,
                Amount = cmd.Amount,
                DueDate = cmd.DueDate!.Value,
                Note = note.Length == 0 ? null : note
            };
            db.Bills.Add(bill);
            audit.Add("bill.create", "bill", bill.Id, period.Id, after: new { bill.Kind, bill.Month, bill.Amount, bill.DueDate, bill.Note });
            await db.SaveChangesAsync(ct);
            return BillRules.ToRow(bill, period.Name, TurkeyClock.Today);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/bills", async (Command cmd, [FromHeader(Name = IdempotencyGuard.Header)] Guid? key,
                    ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(cmd, user.GetUserId(), key, ct)).ToOk());
    }
}

/// <summary>Yanlış girilmiş, ÖDENMEMİŞ faturanın silinmesi (bakiyeyi etkilemez). Ödenmiş fatura için önce gideri iptal edilir.</summary>
public static class DeleteBill
{
    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result> Handle(Guid id, CancellationToken ct)
        {
            var bill = await db.Bills.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (bill is null) return Error.NotFound("Fatura bulunamadı.");
            if (bill.Status == BillStatus.Paid) return Error.Conflict("Ödenmiş fatura silinemez. Önce Giderler sayfasından ödemesini iptal edin.");
            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == bill.PeriodId, ct);
            if (PeriodRules.RequireOpen(period, "Fatura silme") is { } closed) return closed;

            db.Bills.Remove(bill);
            audit.Add("bill.delete", "bill", id, bill.PeriodId, before: new { bill.Kind, bill.Month, bill.Amount, bill.DueDate });
            await db.SaveChangesAsync(ct);
            return Result.Success();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapDelete("/api/admin/bills/{id:guid}", async (Guid id, Handler h, CancellationToken ct) => (await h.Handle(id, ct)).ToNoContent());
    }
}

/// <summary>
/// Gelen faturaya göre tutar ve son ödeme tarihinin güncellenmesi (abonelikten üretilen "fatura bekleniyor" kaydı bununla gerçek faturaya döner).
/// Yalnızca ödenmemiş fatura güncellenir; ödenmiş fatura için önce gider iptal edilir.
/// </summary>
public static class UpdateBill
{
    public record Command(decimal Amount, DateOnly? DueDate, string? Note);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result<BillRow>> Handle(Guid id, Command cmd, CancellationToken ct)
        {
            var note = cmd.Note?.Trim() ?? "";
            var v = new Validator()
                .Must("dueDate", cmd.DueDate is not null, "Son ödeme tarihini seçin.")
                .MaxLength("note", note, 300);
            if (Money.Check(cmd.Amount) is { } money) v.AddError("amount", money);
            if (!v.IsValid) return v.ToFailure<BillRow>();

            var bill = await db.Bills.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (bill is null) return Error.NotFound("Fatura bulunamadı.");
            if (bill.Status == BillStatus.Paid) return Error.Conflict("Ödenmiş fatura güncellenemez. Önce Giderler sayfasından ödemesini iptal edin.");
            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == bill.PeriodId, ct);
            if (PeriodRules.RequireOpen(period, "Fatura güncelleme") is { } closed) return closed;

            var before = new { bill.Amount, bill.DueDate, bill.Note, bill.AwaitingInvoice };
            bill.Amount = cmd.Amount;
            bill.DueDate = cmd.DueDate!.Value;
            bill.Note = note.Length == 0 ? null : note;
            bill.AwaitingInvoice = false;

            audit.Add("bill.update", "bill", bill.Id, bill.PeriodId, before: before,
                after: new { bill.Amount, bill.DueDate, bill.Note, bill.AwaitingInvoice });
            await db.SaveChangesAsync(ct);
            return BillRules.ToRow(bill, period.Name, TurkeyClock.Today);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/bills/{id:guid}", async (Guid id, Command cmd, Handler h, CancellationToken ct) => (await h.Handle(id, cmd, ct)).ToOk());
    }
}

/// <summary>
/// Fatura ödemesi: "Faturalar" sistem kategorisine gider + hesap çıkışı yazılır, fatura "ödendi" olur.
/// Gider, faturanın kendi dönemine yazılır (önceki dönemden kalan fatura bugün ödense de) — bu yüzden kapalı dönemde de yapılabilir.
/// </summary>
public static class PayBill
{
    public record Command(Guid AccountId, DateOnly? Date);

    public class Handler(AppDbContext db, CashBook cashBook, ExpenseWriter writer, IdempotencyGuard idempotency, AuditWriter audit)
    {
        public async Task<Result<Guid>> Handle(Guid id, Command cmd, Guid adminId, Guid? key, CancellationToken ct)
        {
            if (cmd.Date is null) return Error.Field("date", "Ödeme tarihini seçin.");
            if (PeriodRules.NotInFuture(cmd.Date.Value, "date") is { } future) return future;

            var bill = await db.Bills.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (bill is null) return Error.NotFound("Fatura bulunamadı.");
            if (bill.Status == BillStatus.Paid) return Error.Conflict("Bu fatura zaten ödenmiş.");
            if (bill.AwaitingInvoice) return Error.Conflict("Gelen faturanın tutarını ve son ödeme tarihini girin, sonra ödeyin.");

            var category = await db.ExpenseCategories.AsNoTracking().FirstOrDefaultAsync(x => x.SystemKey == ExpenseCategoryKeys.Bills, ct);
            if (category is null) return Error.NotFound("Fatura gider kategorisi bulunamadı.");

            var account = await cashBook.UsableAsync(cmd.AccountId, "accountId", ct);
            if (!account.IsSuccess) return account.Error!;

            if (await idempotency.BeginAsync(key, "bill.pay", adminId, ct) is { } dup) return dup;

            var description = $"{BillRules.Label(bill.Kind)} faturası ({bill.Month})";
            var expense = writer.Add(bill.PeriodId, category.Id, bill.Amount, cmd.Date.Value, cmd.AccountId, description, bill.Id, adminId);
            bill.Status = BillStatus.Paid;
            bill.PaidAt = cmd.Date;
            bill.ExpenseId = expense.Id;

            audit.Add("bill.pay", "bill", bill.Id, bill.PeriodId, before: new { status = BillStatus.Unpaid },
                after: new { status = BillStatus.Paid, date = cmd.Date, account = account.Value!.Name, expenseId = expense.Id });
            await db.SaveChangesAsync(ct);
            return expense.Id;
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/bills/{id:guid}/pay", async (Guid id, Command cmd, [FromHeader(Name = IdempotencyGuard.Header)] Guid? key,
                    ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(id, cmd, user.GetUserId(), key, ct)).ToHttp(expenseId => Results.Ok(new { expenseId })));
    }
}
