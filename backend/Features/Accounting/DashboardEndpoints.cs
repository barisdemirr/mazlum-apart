using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Enums;
using MazlumApart.Features.Enrollments;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Accounting;

public record DueItem(Guid Id, ChargeKind Kind, string Month, DateOnly DueDate, string? Note, decimal Remaining, int Days);

/// <summary>
/// Vade listesi satırı (geciken / yaklaşan). Days: gecikmede "kaç gün geçti", yaklaşanda "kaç gün kaldı".
/// LastContactAt: son WhatsApp / SMS / bildirim iletişimi.
/// </summary>
public record DueRow(Guid EnrollmentId, EnrollmentStatus Status, StudentRef Student, RoomRef? Room, string RoomTypeName, DueItem Item, DateTime? LastContactAt);

public record CarriedItem(string Kind, Guid PeriodId, string PeriodName, decimal Amount, Guid? EnrollmentId, StudentRef? Student, BillRow? Bill);

public record PendingApplication(Guid Id, string No, string FullName, Guid RoomTypeId, string RoomTypeName, ApplicationSource Source, DateTime CreatedAt);

public static class DueLists
{
    public const int UpcomingDays = 7;

    /// <summary>
    /// Yalnızca kalanı olan kalemler (frontend dueLists). Peşin ödeyen öğrenci, karşılanmayan ilk kalemin vadesi yaklaşana kadar görünmez.
    /// </summary>
    public static (List<DueRow> Overdue, List<DueRow> Upcoming) Build(IEnumerable<(EnrollmentRow Row, EnrollmentSummary Ledger)> rows, DateOnly today)
    {
        var overdue = new List<DueRow>();
        var upcoming = new List<DueRow>();
        foreach (var (row, ledger) in rows)
        {
            foreach (var item in ledger.Items.Where(i => i.Remaining > 0))
            {
                var diff = item.DueDate.DayNumber - today.DayNumber;
                if (diff < 0) overdue.Add(ToRow(row, item, -diff));
                else if (diff <= UpcomingDays) upcoming.Add(ToRow(row, item, diff));
            }
        }
        return (overdue.OrderByDescending(x => x.Item.Days).ToList(), upcoming.OrderBy(x => x.Item.Days).ToList());
    }

    private static DueRow ToRow(EnrollmentRow row, LedgerItem item, int days) =>
        new(row.Id, row.Status, row.Student, row.Room, row.RoomTypeName,
            new DueItem(item.Id, item.Kind, item.Month, item.DueDate, item.Note, item.Remaining, days), row.LastContactAt);
}

/// <summary>
/// Yönetim paneli ana sayfası (frontend periodView + carriedOver): kasa/banka, dönem tahsilatı/gideri, alacak, avans,
/// geciken ve yaklaşan ödemeler, vadesi yaklaşan faturalar, önceki dönemlerden açık kalanlar, bekleyen başvurular, açık arızalar.
/// Doluluk için /api/admin/occupancy kullanılır.
/// </summary>
public static class GetDashboard
{
    public record Response(
        PeriodBrief Period, decimal CashBalance, decimal BankBalance, List<AccountBalance> Balances, decimal WeekCash, PeriodTotals Totals,
        decimal Charged, decimal CollectionRate, decimal Receivable, decimal Advances, int Debtors, int ExpenseCount,
        List<DueRow> Overdue, List<DueRow> Upcoming, List<BillRow> DueBills, List<CarriedItem> CarriedOver,
        int PendingApplicationCount, List<PendingApplication> LatestApplications,
        int OpenMaintenanceCount, List<OpenMaintenanceRow> OpenMaintenance);

    public record OpenMaintenanceRow(Guid Id, string No, string Title, string RoomLabel, MaintenanceStatus Status, DateTime CreatedAt);

    public class Handler(AppDbContext db, EnrollmentQueryHandler reader, FinanceQueryHandler finance)
    {
        public async Task<Result<Response>> Handle(Guid periodId, CancellationToken ct)
        {
            var period = await db.Periods.AsNoTracking().FirstOrDefaultAsync(x => x.Id == periodId, ct);
            if (period is null) return Error.NotFound("Dönem bulunamadı.");
            var today = TurkeyClock.Today;

            var (totals, balances) = await finance.PeriodAsync(periodId, ct);
            var cash = LedgerMath.Round(balances.Where(b => b.Type == AccountType.Cash).Sum(b => b.Balance));
            var bank = LedgerMath.Round(balances.Where(b => b.Type == AccountType.Bank).Sum(b => b.Balance));

            // Son 7 günde kasaya net giren nakit
            var cashIds = balances.Where(b => b.Type == AccountType.Cash).Select(b => b.Id).ToList();
            var weekAgo = today.AddDays(-7);
            var weekRows = await db.AccountTransactions.AsNoTracking()
                .Where(x => x.PeriodId == periodId && cashIds.Contains(x.AccountId) && x.Date > weekAgo && x.Date <= today)
                .Select(x => new { x.Direction, x.Amount })
                .ToListAsync(ct);
            var weekCash = LedgerMath.Round(weekRows.Sum(x => x.Direction == TransactionDirection.In ? x.Amount : -x.Amount));

            // Öğrenci hesapları
            var rows = await reader.LoadAsync(db.Enrollments.Where(x => x.PeriodId == periodId), EnrollmentQueryHandler.DayIn(period), ct);
            var charged = LedgerMath.Round(rows.Sum(r => r.Ledger.Charged));
            var receivable = LedgerMath.Round(rows.Sum(r => r.Ledger.Remaining));
            var advances = LedgerMath.Round(rows.Sum(r => r.Ledger.Advance));
            var debtors = rows.Count(r => r.Ledger.Remaining > 0);
            var (overdue, upcoming) = DueLists.Build(rows, today);

            var expenseCount = await db.Expenses.CountAsync(x => x.PeriodId == periodId && x.CancelledAt == null, ct);

            var bills = await db.Bills.AsNoTracking().Where(x => x.PeriodId == periodId && x.Status == BillStatus.Unpaid)
                .OrderBy(x => x.DueDate).ToListAsync(ct);
            var dueBills = bills.Select(b => BillRules.ToRow(b, period.Name, today)).Where(b => b.State is "overdue" or "soon").ToList();

            // Önceki dönemlerden açık kalanlar: ödenmemiş öğrenci borçları ve faturalar (tahsilat o eski döneme yazılır)
            var olderPeriods = await db.Periods.AsNoTracking().Where(x => x.Id != periodId && x.StartDate < period.StartDate)
                .ToDictionaryAsync(x => x.Id, x => x.Name, ct);
            var carried = new List<CarriedItem>();
            if (olderPeriods.Count > 0)
            {
                var olderIds = olderPeriods.Keys.ToList();
                var olderRows = await reader.LoadAsync(db.Enrollments.Where(x => olderIds.Contains(x.PeriodId)), today, ct);
                carried.AddRange(olderRows.Where(r => r.Ledger.Remaining > 0).Select(r =>
                    new CarriedItem("student", r.Row.PeriodId, olderPeriods[r.Row.PeriodId], r.Ledger.Remaining, r.Row.Id, r.Row.Student, null)));

                var olderBills = await db.Bills.AsNoTracking().Where(x => olderIds.Contains(x.PeriodId) && x.Status == BillStatus.Unpaid)
                    .OrderBy(x => x.DueDate).ToListAsync(ct);
                carried.AddRange(olderBills.Select(b =>
                    new CarriedItem("bill", b.PeriodId, olderPeriods[b.PeriodId], b.Amount, null, null, BillRules.ToRow(b, olderPeriods[b.PeriodId], today))));
            }

            // Bekleyen başvurular
            var pending = db.Applications.AsNoTracking().Where(x => x.PeriodId == periodId && x.Status == ApplicationStatus.Pending);
            var pendingCount = await pending.CountAsync(ct);
            var latest = await pending.OrderByDescending(x => x.CreatedAt).Take(4)
                .Select(x => new { x.Id, x.No, x.FullName, x.RoomTypeId, x.Source, x.CreatedAt })
                .ToListAsync(ct);
            var typeIds = latest.Select(x => x.RoomTypeId).Distinct().ToList();
            var typeNames = (await db.RoomTypes.AsNoTracking().IgnoreQueryFilters().Where(x => typeIds.Contains(x.Id)).ToListAsync(ct))
                .ToDictionary(x => x.Id, x => x.Name.Tr);

            // Açık arızalar
            var openMaintenance = db.MaintenanceRequests.AsNoTracking().Where(x => x.PeriodId == periodId && x.Status != MaintenanceStatus.Done);
            var openMaintenanceCount = await openMaintenance.CountAsync(ct);
            var maintenance = await openMaintenance.OrderByDescending(x => x.CreatedAt).Take(3)
                .Select(x => new OpenMaintenanceRow(x.Id, x.No, x.Title, x.RoomLabel, x.Status, x.CreatedAt))
                .ToListAsync(ct);

            return new Response(
                new PeriodBrief(period.Id, period.Name, period.Status, period.StartDate, period.EndDate),
                cash, bank, balances, weekCash, totals,
                charged, charged > 0 ? LedgerMath.Round(totals.Collected / charged) : 0m, receivable, advances, debtors, expenseCount,
                overdue, upcoming, dueBills, carried,
                pendingCount,
                latest.Select(x => new PendingApplication(x.Id, x.No, x.FullName, x.RoomTypeId, typeNames.GetValueOrDefault(x.RoomTypeId, ""), x.Source, x.CreatedAt)).ToList(),
                openMaintenanceCount, maintenance);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/dashboard", async (Guid periodId, Handler h, CancellationToken ct) => (await h.Handle(periodId, ct)).ToOk());
    }
}

/// <summary>Menü sayaçları (kenar çubuğu rozetleri): bekleyen başvuru, açık arıza, vadesi geçmiş/yaklaşan fatura</summary>
public static class GetBadges
{
    public record Response(int NewApplications, int OpenMaintenance, int DueBills);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/badges", async (Guid periodId, AppDbContext db, CancellationToken ct) =>
            {
                var today = TurkeyClock.Today;
                var applications = await db.Applications.CountAsync(x => x.PeriodId == periodId && x.Status == ApplicationStatus.Pending, ct);
                var maintenance = await db.MaintenanceRequests.CountAsync(x => x.PeriodId == periodId && x.Status != MaintenanceStatus.Done, ct);
                var soonLimit = today.AddDays(BillRules.SoonDays);
                var bills = await db.Bills.CountAsync(x => x.PeriodId == periodId && x.Status == BillStatus.Unpaid && x.DueDate <= soonLimit, ct);
                return Results.Ok(new Response(applications, maintenance, bills));
            });
    }
}

/// <summary>
/// Raporlar: seçili dönemde, tarih aralığına göre tahsilat / iade / gider, yönteme–hesaba–kategoriye göre dağılım ve aylık tablo.
/// Transferler gelir ya da gider sayılmaz. from/to verilmezse tüm dönem.
/// </summary>
public static class GetFinanceReport
{
    public record MethodAmount(PaymentMethod Method, decimal Amount);
    public record AccountAmount(Guid AccountId, string Name, decimal Amount);
    public record MonthRow(string Month, decimal Collected, decimal Refunded, decimal Spent, decimal Net);

    public record Response(
        DateOnly From, DateOnly To, decimal Collected, decimal Refunded, decimal Spent, decimal Net, decimal Cash, decimal Bank,
        List<MethodAmount> ByMethod, List<AccountAmount> ByAccount, List<GetExpenses.CategoryTotal> ByCategory, List<MonthRow> Months);

    public class Handler(AppDbContext db)
    {
        public async Task<Result<Response>> Handle(Guid periodId, DateOnly? fromInput, DateOnly? toInput, CancellationToken ct)
        {
            var period = await db.Periods.AsNoTracking().FirstOrDefaultAsync(x => x.Id == periodId, ct);
            if (period is null) return Error.NotFound("Dönem bulunamadı.");

            var rangeFrom = fromInput ?? period.StartDate;
            var rangeTo = toInput ?? period.EndDate;
            if (rangeFrom > rangeTo) return Error.Field("from", "Başlangıç tarihi bitişten sonra olamaz.");

            var payments = await db.Payments.AsNoTracking()
                .Where(x => x.PeriodId == periodId && x.CancelledAt == null && x.Date >= rangeFrom && x.Date <= rangeTo)
                .Select(x => new { x.Kind, x.Method, x.AccountId, x.Date, x.Amount })
                .ToListAsync(ct);
            var expenses = await db.Expenses.AsNoTracking()
                .Where(x => x.PeriodId == periodId && x.CancelledAt == null && x.Date >= rangeFrom && x.Date <= rangeTo)
                .Select(x => new { x.CategoryId, x.Date, x.Amount })
                .ToListAsync(ct);
            var accounts = await db.Accounts.AsNoTracking().IgnoreQueryFilters().ToDictionaryAsync(x => x.Id, ct);
            var categories = await db.ExpenseCategories.AsNoTracking().IgnoreQueryFilters().ToDictionaryAsync(x => x.Id, x => x.Name, ct);

            var collections = payments.Where(p => p.Kind == PaymentKind.Collection).ToList();
            var refunds = payments.Where(p => p.Kind == PaymentKind.Refund).ToList();
            static decimal R(decimal v) => LedgerMath.Round(v);

            var collected = R(collections.Sum(p => p.Amount));
            var refunded = R(refunds.Sum(p => p.Amount));
            var spent = R(expenses.Sum(e => e.Amount));

            bool IsType(Guid accountId, AccountType type) => accounts.TryGetValue(accountId, out var a) && a.Type == type;

            var months = collections.Select(p => Money.MonthOf(p.Date))
                .Concat(refunds.Select(p => Money.MonthOf(p.Date)))
                .Concat(expenses.Select(e => Money.MonthOf(e.Date)))
                .Distinct().Order(StringComparer.Ordinal)
                .Select(m =>
                {
                    var c = R(collections.Where(p => Money.MonthOf(p.Date) == m).Sum(p => p.Amount));
                    var r = R(refunds.Where(p => Money.MonthOf(p.Date) == m).Sum(p => p.Amount));
                    var s = R(expenses.Where(e => Money.MonthOf(e.Date) == m).Sum(e => e.Amount));
                    return new MonthRow(m, c, r, s, R(c - r - s));
                }).ToList();

            return new Response(
                rangeFrom, rangeTo, collected, refunded, spent, R(collected - refunded - spent),
                R(collections.Where(p => IsType(p.AccountId, AccountType.Cash)).Sum(p => p.Amount)),
                R(collections.Where(p => IsType(p.AccountId, AccountType.Bank)).Sum(p => p.Amount)),
                Enum.GetValues<PaymentMethod>().Select(m => new MethodAmount(m, R(collections.Where(p => p.Method == m).Sum(p => p.Amount)))).ToList(),
                collections.GroupBy(p => p.AccountId)
                    .Select(g => new AccountAmount(g.Key, accounts.TryGetValue(g.Key, out var a) ? a.Name : "", R(g.Sum(p => p.Amount))))
                    .OrderByDescending(x => x.Amount).ToList(),
                expenses.GroupBy(e => e.CategoryId)
                    .Select(g => new GetExpenses.CategoryTotal(g.Key, categories.GetValueOrDefault(g.Key, ""), R(g.Sum(e => e.Amount))))
                    .OrderByDescending(x => x.Amount).ToList(),
                months);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/reports/finance", async (Guid periodId, DateOnly? from, DateOnly? to, Handler h, CancellationToken ct) =>
                (await h.Handle(periodId, from, to, ct)).ToOk());
    }
}
