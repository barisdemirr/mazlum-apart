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

public record AccountDto(Guid Id, AccountType Type, string Name, string? Iban, bool Active);

/// <summary>Kasa / banka hesapları (dönemlerden bağımsız). Silinmez; kullanılmayacaksa pasife alınır.</summary>
public static class AccountAdmin
{
    public record CreateCommand(AccountType? Type, string? Name, string? Iban);
    public record UpdateCommand(string? Name, string? Iban, bool? Active);

    private static AccountDto ToDto(Account a) => new(a.Id, a.Type, a.Name, a.Iban, a.IsActive);

    /// <summary>IBAN boşlukları atılır, büyük harfe çevrilir; boşsa null</summary>
    private static string? CleanIban(string? iban)
    {
        var value = iban?.Replace(" ", "").Trim().ToUpperInvariant();
        return string.IsNullOrEmpty(value) ? null : value;
    }

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<List<AccountDto>> List(CancellationToken ct) =>
            (await db.Accounts.AsNoTracking().OrderBy(x => x.Type).ThenBy(x => x.OrderIndex).ThenBy(x => x.Name).ToListAsync(ct))
            .Select(ToDto).ToList();

        public async Task<Result<AccountDto>> Create(CreateCommand cmd, CancellationToken ct)
        {
            var name = cmd.Name?.Trim() ?? "";
            var iban = cmd.Type == AccountType.Bank ? CleanIban(cmd.Iban) : null;

            var v = new Validator()
                .Must("type", cmd.Type is not null, "Hesap türünü seçin.")
                .Required("name", name, "Hesap adını yazın.")
                .MaxLength("name", name, 80);
            if (iban is not null) v.Must("iban", TurkishFormats.IsValidIban(iban), "IBAN geçersiz.");
            if (!v.IsValid) return v.ToFailure<AccountDto>();

            if (await db.Accounts.AnyAsync(x => x.Name == name, ct)) return Error.Conflict("Bu adda bir hesap zaten var.");

            var account = new Account { Type = cmd.Type!.Value, Name = name, Iban = iban };
            db.Accounts.Add(account);
            audit.Add("account.create", "account", account.Id, after: new { account.Type, account.Name, account.Iban });
            await db.SaveChangesAsync(ct);
            return ToDto(account);
        }

        public async Task<Result<AccountDto>> Update(Guid id, UpdateCommand cmd, CancellationToken ct)
        {
            var account = await db.Accounts.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (account is null) return Error.NotFound("Hesap bulunamadı.");

            var name = cmd.Name?.Trim() ?? "";
            var iban = account.Type == AccountType.Bank ? CleanIban(cmd.Iban) : null;
            var v = new Validator().Required("name", name, "Hesap adını yazın.").MaxLength("name", name, 80);
            if (iban is not null) v.Must("iban", TurkishFormats.IsValidIban(iban), "IBAN geçersiz.");
            if (!v.IsValid) return v.ToFailure<AccountDto>();

            if (await db.Accounts.AnyAsync(x => x.Id != id && x.Name == name, ct)) return Error.Conflict("Bu adda bir hesap zaten var.");

            var active = cmd.Active ?? account.IsActive;
            if (!active && account.IsActive && account.Type == AccountType.Cash &&
                await db.Accounts.CountAsync(x => x.IsActive && x.Type == AccountType.Cash && x.Id != id, ct) == 0)
                return Error.Conflict("En az bir aktif nakit kasa kalmalı.");

            var before = ToDto(account);
            account.Name = name;
            account.Iban = iban;
            account.IsActive = active;
            audit.Add("account.update", "account", id, before: before, after: ToDto(account));
            await db.SaveChangesAsync(ct);
            return ToDto(account);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/admin/accounts");
            group.MapGet("", async (Handler h, CancellationToken ct) => Results.Ok(await h.List(ct)));
            group.MapPost("", async (CreateCommand cmd, Handler h, CancellationToken ct) => (await h.Create(cmd, ct)).ToOk());
            group.MapPut("/{id:guid}", async (Guid id, UpdateCommand cmd, Handler h, CancellationToken ct) => (await h.Update(id, cmd, ct)).ToOk());
        }
    }
}

/// <summary>Açılış bakiyesi: dönem başında hesapta bulunan tutar. Her hesap için dönem başına BİR kez girilir.</summary>
public static class AddOpeningBalance
{
    public record Command(Guid PeriodId, decimal Amount, DateOnly? Date);

    public class Handler(AppDbContext db, CashBook cashBook, AuditWriter audit)
    {
        public async Task<Result<Guid>> Handle(Guid accountId, Command cmd, Guid adminId, CancellationToken ct)
        {
            var period = await db.Periods.FirstOrDefaultAsync(x => x.Id == cmd.PeriodId, ct);
            if (period is null) return Error.NotFound("Dönem bulunamadı.");
            if (PeriodRules.RequireOpen(period, "Açılış bakiyesi") is { } closed) return closed;

            var account = await cashBook.UsableAsync(accountId, "accountId", ct);
            if (!account.IsSuccess) return account.Error!;

            if (Money.Check(cmd.Amount) is { } money) return Error.Field("amount", money);
            var date = cmd.Date ?? period.StartDate;
            if (date < period.StartDate || date > period.EndDate) return Error.Field("date", "Tarih dönem içinde olmalı.");

            if (await db.AccountTransactions.AnyAsync(x => x.PeriodId == period.Id && x.AccountId == accountId && x.Source == TransactionSource.Opening, ct))
                return Error.Conflict("Bu hesap için açılış bakiyesi zaten girilmiş. Düzeltme için transfer ya da ters kayıt kullanın.");

            var tx = cashBook.Add(period.Id, accountId, date, TransactionDirection.In, cmd.Amount, TransactionSource.Opening, null, "Açılış bakiyesi", adminId);
            audit.Add("account.opening", "transaction", tx.Id, period.Id, after: new { accountId, amount = cmd.Amount, date });
            await db.SaveChangesAsync(ct);
            return tx.Id;
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/accounts/{id:guid}/opening", async (Guid id, Command cmd, ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(id, cmd, user.GetUserId(), ct)).ToHttp(txId => Results.Ok(new { id = txId })));
    }
}

/// <summary>
/// Hesaplar arası transfer (kasa↔banka, banka↔banka): iki bacaklı hareket (çıkış + giriş, aynı SourceId).
/// Gelir ya da gider SAYILMAZ. Idempotency-Key başlığı zorunludur.
/// </summary>
public static class CreateTransfer
{
    public record Command(Guid PeriodId, Guid FromId, Guid ToId, decimal Amount, DateOnly? Date, string? Note);

    public class Handler(AppDbContext db, CashBook cashBook, IdempotencyGuard idempotency, AuditWriter audit)
    {
        public async Task<Result<Guid>> Handle(Command cmd, Guid adminId, Guid? key, CancellationToken ct)
        {
            var period = await db.Periods.FirstOrDefaultAsync(x => x.Id == cmd.PeriodId, ct);
            if (period is null) return Error.NotFound("Dönem bulunamadı.");
            if (PeriodRules.RequireOpen(period, "Transfer") is { } closed) return closed;

            var note = cmd.Note?.Trim() ?? "";
            var v = new Validator()
                .Must("toId", cmd.FromId != cmd.ToId, "Kaynak ve hedef hesap farklı olmalı.")
                .Must("date", cmd.Date is not null, "Tarihi seçin.")
                .MaxLength("note", note, 300);
            if (Money.Check(cmd.Amount) is { } money) v.AddError("amount", money);
            if (!v.IsValid) return v.ToFailure<Guid>();
            if (PeriodRules.NotInFuture(cmd.Date!.Value, "date") is { } future) return future;

            var source = await cashBook.UsableAsync(cmd.FromId, "fromId", ct);
            if (!source.IsSuccess) return source.Error!;
            var target = await cashBook.UsableAsync(cmd.ToId, "toId", ct);
            if (!target.IsSuccess) return target.Error!;

            if (await idempotency.BeginAsync(key, "transfer.create", adminId, ct) is { } dup) return dup;

            var transferId = Guid.CreateVersion7();
            var text = note.Length > 0 ? note : "Hesaplar arası transfer";
            cashBook.Add(period.Id, cmd.FromId, cmd.Date.Value, TransactionDirection.Out, cmd.Amount, TransactionSource.Transfer, transferId, text, adminId);
            cashBook.Add(period.Id, cmd.ToId, cmd.Date.Value, TransactionDirection.In, cmd.Amount, TransactionSource.Transfer, transferId, text, adminId);
            audit.Add("transfer.create", "transfer", transferId, period.Id,
                after: new { fromAccount = source.Value!.Name, toAccount = target.Value!.Name, amount = cmd.Amount, date = cmd.Date });
            await db.SaveChangesAsync(ct);
            return transferId;
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/transfers", async (Command cmd, [FromHeader(Name = IdempotencyGuard.Header)] Guid? key,
                    ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(cmd, user.GetUserId(), key, ct)).ToHttp(id => Results.Ok(new { id })));
    }
}

/// <summary>
/// Kasa & Banka sayfası: hesap kartları (açılış/giriş/çıkış/bakiye), tutarlılık kontrolü ve dönemin tüm hareketleri.
/// </summary>
public static class GetCashBank
{
    public record TransactionRow(
        Guid Id, DateOnly Date, Guid AccountId, string AccountName, TransactionDirection Direction, decimal Amount,
        TransactionSource Source, Guid? SourceId, string? Note, DateTime CreatedAt, string? CreatedBy);

    public record Response(
        List<AccountBalance> Accounts, decimal Cash, decimal Bank, PeriodTotals Totals, List<Guid> OpeningDone, List<TransactionRow> Transactions);

    public class Handler(AppDbContext db, FinanceQueryHandler finance)
    {
        public async Task<Result<Response>> Handle(Guid periodId, CancellationToken ct)
        {
            if (!await db.Periods.AnyAsync(x => x.Id == periodId, ct)) return Error.NotFound("Dönem bulunamadı.");

            var (totals, balances) = await finance.PeriodAsync(periodId, ct);
            var names = await finance.AdminNamesAsync(ct);
            var accountNames = balances.ToDictionary(b => b.Id, b => b.Name);

            var rows = await db.AccountTransactions.AsNoTracking()
                .Where(x => x.PeriodId == periodId)
                .OrderByDescending(x => x.Date).ThenByDescending(x => x.CreatedAt)
                .ToListAsync(ct);

            var transactions = rows.Select(x => new TransactionRow(
                x.Id, x.Date, x.AccountId, accountNames.GetValueOrDefault(x.AccountId, ""), x.Direction, x.Amount,
                x.Source, x.SourceId, x.Note, x.CreatedAt, names.NameOf(x.CreatedById))).ToList();

            var openingDone = rows.Where(x => x.Source == TransactionSource.Opening).Select(x => x.AccountId).Distinct().ToList();

            return new Response(
                balances,
                LedgerMath.Round(balances.Where(b => b.Type == AccountType.Cash).Sum(b => b.Balance)),
                LedgerMath.Round(balances.Where(b => b.Type == AccountType.Bank).Sum(b => b.Balance)),
                totals, openingDone, transactions);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/cash-bank", async (Guid periodId, Handler h, CancellationToken ct) => (await h.Handle(periodId, ct)).ToOk());
    }
}
