using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Accounting;

public record ExpenseCategoryDto(Guid Id, string Name, string? SystemKey, bool Active, int Order);

/// <summary>
/// Gider kategorileri. Sistem kategorisi ("Faturalar") yeniden adlandırılabilir ama silinemez/pasife alınamaz.
/// Kullanılmış kategori silinemez; pasife alınır (eski giderlerde görünmeye devam eder, yeni giderde seçilemez).
/// </summary>
public static class ExpenseCategoryAdmin
{
    public record SaveCommand(string? Name, bool? Active);

    private static ExpenseCategoryDto ToDto(ExpenseCategory c) => new(c.Id, c.Name, c.SystemKey, c.IsActive, c.OrderIndex);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<List<ExpenseCategoryDto>> List(CancellationToken ct) =>
            (await db.ExpenseCategories.AsNoTracking().OrderBy(x => x.OrderIndex).ThenBy(x => x.Name).ToListAsync(ct)).Select(ToDto).ToList();

        private static Validator Check(string name) =>
            new Validator().Required("name", name, "Kategori adını yazın.").MaxLength("name", name, 60);

        public async Task<Result<ExpenseCategoryDto>> Create(SaveCommand cmd, CancellationToken ct)
        {
            var name = cmd.Name?.Trim() ?? "";
            var v = Check(name);
            if (!v.IsValid) return v.ToFailure<ExpenseCategoryDto>();
            if (await db.ExpenseCategories.AnyAsync(x => x.Name == name, ct)) return Error.Conflict("Bu adda bir kategori zaten var.");

            var order = (await db.ExpenseCategories.MaxAsync(x => (int?)x.OrderIndex, ct) ?? 0) + 1;
            var category = new ExpenseCategory { Name = name, OrderIndex = order };
            db.ExpenseCategories.Add(category);
            audit.Add("expense_category.create", "expense_category", category.Id, after: new { name });
            await db.SaveChangesAsync(ct);
            return ToDto(category);
        }

        public async Task<Result<ExpenseCategoryDto>> Update(Guid id, SaveCommand cmd, CancellationToken ct)
        {
            var category = await db.ExpenseCategories.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (category is null) return Error.NotFound("Kategori bulunamadı.");

            var name = cmd.Name?.Trim() ?? "";
            var v = Check(name);
            if (!v.IsValid) return v.ToFailure<ExpenseCategoryDto>();
            if (await db.ExpenseCategories.AnyAsync(x => x.Id != id && x.Name == name, ct)) return Error.Conflict("Bu adda bir kategori zaten var.");

            var active = cmd.Active ?? category.IsActive;
            if (!active && category.SystemKey is not null) return Error.Conflict("Sistem kategorisi pasife alınamaz.");

            var before = ToDto(category);
            category.Name = name;
            category.IsActive = active;
            audit.Add("expense_category.update", "expense_category", id, before: before, after: ToDto(category));
            await db.SaveChangesAsync(ct);
            return ToDto(category);
        }

        public async Task<Result> Delete(Guid id, CancellationToken ct)
        {
            var category = await db.ExpenseCategories.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (category is null) return Error.NotFound("Kategori bulunamadı.");
            if (category.SystemKey is not null) return Error.Conflict("Sistem kategorisi silinemez.");
            if (await db.Expenses.AnyAsync(x => x.CategoryId == id, ct))
                return Error.Conflict("Bu kategoride gider kaydı var; silinemez. Kullanılmayacaksa pasife alın.");

            db.ExpenseCategories.Remove(category);
            audit.Add("expense_category.delete", "expense_category", id, before: ToDto(category));
            await db.SaveChangesAsync(ct);
            return Result.Success();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/admin/expense-categories");
            group.MapGet("", async (Handler h, CancellationToken ct) => Results.Ok(await h.List(ct)));
            group.MapPost("", async (SaveCommand cmd, Handler h, CancellationToken ct) => (await h.Create(cmd, ct)).ToOk());
            group.MapPut("/{id:guid}", async (Guid id, SaveCommand cmd, Handler h, CancellationToken ct) => (await h.Update(id, cmd, ct)).ToOk());
            group.MapDelete("/{id:guid}", async (Guid id, Handler h, CancellationToken ct) => (await h.Delete(id, ct)).ToNoContent());
        }
    }
}

/// <summary>Gider yazımı: gider + kasa/banka çıkış hareketi. Fatura ödemesi de buradan geçer (BillId).</summary>
public class ExpenseWriter(AppDbContext db, CashBook cashBook)
{
    public Expense Add(Guid periodId, Guid categoryId, decimal amount, DateOnly date, Guid accountId, string description, Guid? billId, Guid by)
    {
        var expense = new Expense
        {
            PeriodId = periodId,
            CategoryId = categoryId,
            Amount = amount,
            Date = date,
            AccountId = accountId,
            Description = description,
            BillId = billId,
            CreatedById = by
        };
        db.Expenses.Add(expense);
        cashBook.Add(periodId, accountId, date, TransactionDirection.Out, amount, TransactionSource.Expense, expense.Id, description, by);
        return expense;
    }
}

public static class CreateExpense
{
    public record Command(Guid PeriodId, Guid CategoryId, decimal Amount, DateOnly? Date, Guid AccountId, string? Description);

    public class Handler(AppDbContext db, CashBook cashBook, ExpenseWriter writer, IdempotencyGuard idempotency, AuditWriter audit)
    {
        public async Task<Result<Guid>> Handle(Command cmd, Guid adminId, Guid? key, CancellationToken ct)
        {
            var description = cmd.Description?.Trim() ?? "";
            var v = new Validator()
                .Must("date", cmd.Date is not null, "Tarihi seçin.")
                .Required("description", description, "Açıklama yazın.")
                .MaxLength("description", description, 300);
            if (Money.Check(cmd.Amount) is { } money) v.AddError("amount", money);
            if (!v.IsValid) return v.ToFailure<Guid>();
            if (PeriodRules.NotInFuture(cmd.Date!.Value, "date") is { } future) return future;

            var period = await db.Periods.AsNoTracking().FirstOrDefaultAsync(x => x.Id == cmd.PeriodId, ct);
            if (period is null) return Error.NotFound("Dönem bulunamadı.");
            if (PeriodRules.RequireOpen(period, "Gider girişi") is { } closed) return closed;

            var category = await db.ExpenseCategories.AsNoTracking().FirstOrDefaultAsync(x => x.Id == cmd.CategoryId, ct);
            if (category is null || !category.IsActive) return Error.Field("categoryId", "Gider kategorisini seçin.");
            if (category.SystemKey == ExpenseCategoryKeys.Bills) return Error.Field("categoryId", "Faturalar için Faturalar sayfasını kullanın.");

            var account = await cashBook.UsableAsync(cmd.AccountId, "accountId", ct);
            if (!account.IsSuccess) return account.Error!;

            if (await idempotency.BeginAsync(key, "expense.create", adminId, ct) is { } dup) return dup;

            var expense = writer.Add(period.Id, category.Id, cmd.Amount, cmd.Date.Value, cmd.AccountId, description, null, adminId);
            audit.Add("expense.create", "expense", expense.Id, period.Id,
                after: new { category = category.Name, amount = cmd.Amount, date = cmd.Date, account = account.Value!.Name, description });
            await db.SaveChangesAsync(ct);
            return expense.Id;
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/expenses", async (Command cmd, [FromHeader(Name = IdempotencyGuard.Header)] Guid? key,
                    ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(cmd, user.GetUserId(), key, ct)).ToHttp(id => Results.Ok(new { id })));
    }
}

/// <summary>Gider iptali: ters hareket (giriş) yazılır; faturadan geldiyse fatura yeniden "ödenmedi" olur</summary>
public static class CancelExpense
{
    public record Command(string? Reason);

    public class Handler(AppDbContext db, CashBook cashBook, AuditWriter audit)
    {
        public async Task<Result<Guid>> Handle(Guid id, Command cmd, Guid adminId, CancellationToken ct)
        {
            var reason = cmd.Reason?.Trim() ?? "";
            var v = new Validator().Required("reason", reason, "İptal nedenini yazın.").MaxLength("reason", reason, 500);
            if (!v.IsValid) return v.ToFailure<Guid>();

            var expense = await db.Expenses.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (expense is null) return Error.NotFound("Gider bulunamadı.");
            if (expense.CancelledAt is not null) return Error.Conflict("Bu gider zaten iptal edilmiş.");
            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == expense.PeriodId, ct);
            if (PeriodRules.RequireOpen(period, "Gider iptali") is { } closed) return closed;

            expense.CancelledAt = DateTime.UtcNow;
            expense.CancelReason = reason;
            expense.CancelledById = adminId;
            cashBook.Add(expense.PeriodId, expense.AccountId, TurkeyClock.Today, TransactionDirection.In, expense.Amount,
                TransactionSource.ExpenseCancel, expense.Id, $"Gider iptali: {reason}", adminId);

            if (expense.BillId is { } billId && await db.Bills.FirstOrDefaultAsync(x => x.Id == billId, ct) is { } bill)
            {
                bill.Status = BillStatus.Unpaid;
                bill.PaidAt = null;
                bill.ExpenseId = null;
            }

            audit.Add("expense.cancel", "expense", id, expense.PeriodId,
                before: new { amount = expense.Amount, date = expense.Date, description = expense.Description }, note: reason);
            await db.SaveChangesAsync(ct);
            return id;
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/expenses/{id:guid}/cancel", async (Guid id, Command cmd, ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(id, cmd, user.GetUserId(), ct)).ToHttp(_ => Results.NoContent()));
    }
}

/// <summary>Giderler sayfası: dönemin giderleri (iptal edilenler dahil), toplam ve kategoriye göre dağılım</summary>
public static class GetExpenses
{
    public record Row(
        Guid Id, DateOnly Date, Guid CategoryId, string CategoryName, string Description, Guid AccountId, string AccountName, decimal Amount,
        Guid? BillId, DateTime CreatedAt, string? CreatedBy, DateTime? CancelledAt, string? CancelReason);

    public record CategoryTotal(Guid CategoryId, string Name, decimal Amount);

    public record Response(List<Row> Items, decimal Total, int LiveCount, List<CategoryTotal> ByCategory);

    public class Handler(AppDbContext db, FinanceQueryHandler finance)
    {
        public async Task<Result<Response>> Handle(Guid periodId, CancellationToken ct)
        {
            if (!await db.Periods.AnyAsync(x => x.Id == periodId, ct)) return Error.NotFound("Dönem bulunamadı.");

            var expenses = await db.Expenses.AsNoTracking().Where(x => x.PeriodId == periodId)
                .OrderByDescending(x => x.Date).ThenByDescending(x => x.CreatedAt).ToListAsync(ct);
            var categories = await db.ExpenseCategories.AsNoTracking().IgnoreQueryFilters().ToDictionaryAsync(x => x.Id, x => x.Name, ct);
            var accounts = await db.Accounts.AsNoTracking().IgnoreQueryFilters().ToDictionaryAsync(x => x.Id, x => x.Name, ct);
            var names = await finance.AdminNamesAsync(ct);

            var rows = expenses.Select(e => new Row(
                e.Id, e.Date, e.CategoryId, categories.GetValueOrDefault(e.CategoryId, ""), e.Description, e.AccountId,
                accounts.GetValueOrDefault(e.AccountId, ""), e.Amount, e.BillId, e.CreatedAt, names.NameOf(e.CreatedById),
                e.CancelledAt, e.CancelReason)).ToList();

            var live = expenses.Where(e => e.CancelledAt is null).ToList();
            var byCategory = live.GroupBy(e => e.CategoryId)
                .Select(g => new CategoryTotal(g.Key, categories.GetValueOrDefault(g.Key, ""), LedgerMath.Round(g.Sum(e => e.Amount))))
                .OrderByDescending(x => x.Amount).ToList();

            return new Response(rows, LedgerMath.Round(live.Sum(e => e.Amount)), live.Count, byCategory);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/expenses", async (Guid periodId, Handler h, CancellationToken ct) => (await h.Handle(periodId, ct)).ToOk());
    }
}
