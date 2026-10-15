using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Infrastructure.Services;

/// <summary>
/// Kasa/banka hareketlerini yazar. Hareketler hiçbir zaman düzenlenmez ya da silinmez; düzeltme ters hareketle yapılır.
/// SaveChanges ÇAĞIRANA aittir (iş + hareket + denetim kaydı tek işlemde yazılır).
/// </summary>
public class CashBook(AppDbContext db)
{
    public AccountTransaction Add(Guid periodId, Guid accountId, DateOnly date, TransactionDirection direction, decimal amount,
        TransactionSource source, Guid? sourceId, string? note, Guid? by)
    {
        var row = new AccountTransaction
        {
            PeriodId = periodId,
            AccountId = accountId,
            Date = date,
            Direction = direction,
            Amount = amount,
            Source = source,
            SourceId = sourceId,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim()[..Math.Min(note.Trim().Length, 500)],
            CreatedById = by
        };
        db.AccountTransactions.Add(row);
        return row;
    }

    /// <summary>Yeni hareket için kullanılabilir hesap: var ve aktif olmalı</summary>
    public async Task<Result<Account>> UsableAsync(Guid accountId, string field, CancellationToken ct)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(x => x.Id == accountId, ct);
        if (account is null) return Error.Field(field, "Kasa/banka hesabı bulunamadı.");
        if (!account.IsActive) return Error.Field(field, "Bu hesap pasif; yeni hareket yazılamaz.");
        return account;
    }
}

/// <summary>Dönem kuralları: kapalı dönemde yalnızca tahsilat, avans iadesi ve eski fatura ödemesi yapılabilir</summary>
public static class PeriodRules
{
    public static Error? RequireOpen(Period period, string what) =>
        period.Status == PeriodStatus.Closed ? Error.Conflict($"{what} kapalı dönemde yapılamaz.") : null;

    /// <summary>İleri tarihli para hareketi girilemez (yazım hatasına karşı)</summary>
    public static Error? NotInFuture(DateOnly date, string field) =>
        date > TurkeyClock.Today ? Error.Field(field, "İleri bir tarih seçilemez.") : null;
}
