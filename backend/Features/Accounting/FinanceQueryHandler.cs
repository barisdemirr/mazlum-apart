using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;

namespace MazlumApart.Features.Accounting;

public record MethodTotals(decimal Cash, decimal Transfer, decimal Pos);

/// <summary>
/// Dönemin tahsilat/gider/net durumu (frontend periodTotals). Transferler gelir ya da gider SAYILMAZ.
/// Çapraz kontrol: açılış + tahsilat − iade − gider = kasa + banka bakiyeleri toplamı (Consistent).
/// </summary>
public record PeriodTotals(
    decimal Collected, decimal Refunded, decimal Spent, decimal Net, MethodTotals ByMethod, decimal InCash, decimal InBank,
    decimal OpeningTotal, decimal TotalBalance, decimal Expected, bool Consistent);

/// <summary>Bir hesabın seçili dönemdeki durumu: açılış, girişler (açılış hariç), çıkışlar, bakiye</summary>
public record AccountBalance(Guid Id, AccountType Type, string Name, string? Iban, bool Active, decimal Opening, decimal Inflow, decimal Outflow, decimal Balance);

/// <summary>Dönem toplamları ve hesap bakiyeleri — hepsi hareketlerden HESAPLANIR, hiçbir bakiye saklanmaz</summary>
public class FinanceQueryHandler(AppDbContext db)
{
    public async Task<(PeriodTotals Totals, List<AccountBalance> Balances)> PeriodAsync(Guid periodId, CancellationToken ct)
    {
        var accounts = await db.Accounts.AsNoTracking().OrderBy(x => x.Type).ThenBy(x => x.OrderIndex).ThenBy(x => x.Name).ToListAsync(ct);
        var typeOf = accounts.ToDictionary(a => a.Id, a => a.Type);

        var payments = await db.Payments.AsNoTracking()
            .Where(x => x.PeriodId == periodId && x.CancelledAt == null)
            .GroupBy(x => new { x.Kind, x.Method, x.AccountId })
            .Select(g => new { g.Key.Kind, g.Key.Method, g.Key.AccountId, Amount = g.Sum(x => x.Amount) })
            .ToListAsync(ct);

        var spent = await db.Expenses.AsNoTracking()
            .Where(x => x.PeriodId == periodId && x.CancelledAt == null)
            .SumAsync(x => (decimal?)x.Amount, ct) ?? 0m;

        var tx = await db.AccountTransactions.AsNoTracking()
            .Where(x => x.PeriodId == periodId)
            .GroupBy(x => new { x.AccountId, x.Direction, x.Source })
            .Select(g => new { g.Key.AccountId, g.Key.Direction, g.Key.Source, Amount = g.Sum(x => x.Amount) })
            .ToListAsync(ct);

        var collections = payments.Where(p => p.Kind == PaymentKind.Collection).ToList();
        static decimal Total<T>(IEnumerable<T> list, Func<T, decimal> pick) => LedgerMath.Round(list.Sum(pick));

        var collected = Total(collections, p => p.Amount);
        var refunded = Total(payments.Where(p => p.Kind == PaymentKind.Refund), p => p.Amount);
        spent = LedgerMath.Round(spent);

        var byMethod = new MethodTotals(
            Total(collections.Where(p => p.Method == PaymentMethod.Cash), p => p.Amount),
            Total(collections.Where(p => p.Method == PaymentMethod.Transfer), p => p.Amount),
            Total(collections.Where(p => p.Method == PaymentMethod.Pos), p => p.Amount));

        var inCash = Total(collections.Where(p => typeOf.TryGetValue(p.AccountId, out var t) && t == AccountType.Cash), p => p.Amount);
        var inBank = Total(collections.Where(p => typeOf.TryGetValue(p.AccountId, out var t) && t == AccountType.Bank), p => p.Amount);

        var balances = accounts.Select(a =>
        {
            var mine = tx.Where(t => t.AccountId == a.Id).ToList();
            var opening = Total(mine.Where(t => t.Source == TransactionSource.Opening), t => t.Amount);
            var inflow = Total(mine.Where(t => t.Direction == TransactionDirection.In && t.Source != TransactionSource.Opening), t => t.Amount);
            var outflow = Total(mine.Where(t => t.Direction == TransactionDirection.Out), t => t.Amount);
            return new AccountBalance(a.Id, a.Type, a.Name, a.Iban, a.IsActive, opening, inflow, outflow, LedgerMath.Round(opening + inflow - outflow));
        }).ToList();

        var openingTotal = Total(balances, b => b.Opening);
        var totalBalance = Total(balances, b => b.Balance);
        var expected = LedgerMath.Round(openingTotal + collected - refunded - spent);

        var totals = new PeriodTotals(collected, refunded, spent, LedgerMath.Round(collected - refunded - spent), byMethod, inCash, inBank,
            openingTotal, totalBalance, expected, expected == totalBalance);

        return (totals, balances);
    }

    /// <summary>Yönetici adları (kim girdi / kim iptal etti); silinmiş yöneticiler de dahil</summary>
    public async Task<Dictionary<Guid, string>> AdminNamesAsync(CancellationToken ct) =>
        await db.AdminUsers.AsNoTracking().IgnoreQueryFilters().ToDictionaryAsync(x => x.Id, x => x.FullName, ct);
}

public static class NameLookup
{
    public static string? NameOf(this IReadOnlyDictionary<Guid, string> names, Guid? id) =>
        id is { } value && names.TryGetValue(value, out var name) ? name : null;
}
