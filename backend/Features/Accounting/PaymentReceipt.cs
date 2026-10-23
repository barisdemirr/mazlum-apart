using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Enums;
using MazlumApart.Features.Enrollments;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Accounting;

/// <summary>Makbuz satırı: tahsilatın hangi kaleme (kira ayı, depozito...) ne kadar sayıldığı</summary>
public record ReceiptLine(ChargeKind Kind, string Month, decimal Amount);

public record ReceiptDto(
    Guid PaymentId, string No, DateOnly Date, decimal Amount, PaymentMethod Method, string AccountName, string? Note,
    string StudentName, string? Room, string PeriodName, List<ReceiptLine> Lines, decimal Advance, bool Cancelled, string? ReceivedBy);

/// <summary>
/// Tahsilat makbuzu verisi. Yalnızca tahsilat için üretilir (iade için makbuz yok). Makbuz numarası tahsilattan türetilir
/// (tarih + kimliğin ilk 6 hanesi): ayrı bir sütun gerekmez, aynı tahsilat her zaman aynı numarayı verir.
/// Satırlar, tahsilatın dağıtımlarından gelir; hiçbir kaleme dağıtılmayan kısım "avans" olarak gösterilir.
/// </summary>
public static class GetPaymentReceipt
{
    public class Handler(AppDbContext db, EnrollmentQueryHandler reader, FinanceQueryHandler finance)
    {
        public async Task<Result<ReceiptDto>> Handle(Guid paymentId, CancellationToken ct)
        {
            var payment = await db.Payments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == paymentId, ct);
            if (payment is null) return Error.NotFound("Tahsilat bulunamadı.");
            if (payment.Kind != PaymentKind.Collection) return Error.Field("id", "İade için makbuz düzenlenmez.");

            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == payment.PeriodId, ct);
            var rows = await reader.RowsAsync(db.Enrollments.Where(x => x.Id == payment.EnrollmentId), EnrollmentQueryHandler.DayIn(period), ct);
            var row = rows.SingleOrDefault();
            if (row is null) return Error.NotFound("Kayıt bulunamadı.");

            var allocations = await db.PaymentAllocations.AsNoTracking().Where(x => x.PaymentId == paymentId).ToListAsync(ct);
            var chargeIds = allocations.Select(a => a.ChargeId).Distinct().ToList();
            var charges = await db.Charges.AsNoTracking().Where(c => chargeIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, ct);

            var lines = allocations
                .GroupBy(a => a.ChargeId)
                .Select(g => (Charge: charges[g.Key], Amount: LedgerMath.Round(g.Sum(a => a.Amount))))
                .Where(x => x.Amount > 0)
                .OrderBy(x => x.Charge.Month).ThenBy(x => x.Charge.Kind)
                .Select(x => new ReceiptLine(x.Charge.Kind, x.Charge.Month, x.Amount))
                .ToList();
            var advance = Math.Max(0m, LedgerMath.Round(payment.Amount - lines.Sum(l => l.Amount)));

            var accountName = await db.Accounts.AsNoTracking().IgnoreQueryFilters()
                .Where(x => x.Id == payment.AccountId).Select(x => x.Name).FirstOrDefaultAsync(ct) ?? "";
            var names = await finance.AdminNamesAsync(ct);

            return new ReceiptDto(
                payment.Id, $"MKB-{payment.Date:yyyyMMdd}-{payment.Id.ToString("N")[..6].ToUpperInvariant()}", payment.Date, payment.Amount,
                payment.Method, accountName, payment.Note, $"{row.Student.FirstName} {row.Student.LastName}", row.Room?.Label, period.Name,
                lines, advance, payment.CancelledAt is not null, names.NameOf(payment.CreatedById));
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/payments/{id:guid}/receipt", async (Guid id, Handler h, CancellationToken ct) => (await h.Handle(id, ct)).ToOk());
    }
}
