using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.StudentPortal;

/// <summary>
/// Öğrenci portalı "Ödemeler" (frontend services/payments.js getStudentPayments). Yalnızca token'daki öğrencinin kendi kayıtları.
/// Hesaplar backend'de yapılır (yöneticinin gördüğüyle birebir aynı): kalem başına ödenen/kalan/durum, avans, karşılanan süre.
///  - İptal edilmiş (ters kaydı alınmış) kalemler ve indirim satırları listede görünmez; indirim, kalemin "ödenen"ine katılır.
///  - Tahsilat açıklamaları (yöneticinin iç notları) gösterilmez; iptal edilen tahsilatlar gösterilmez.
///  - Banka bilgisi yalnızca site ayarlarında IBAN tanımlıysa döner.
/// enrollmentId verilmezse aktif dönemdeki kayıt, yoksa en son kayıt seçilir; öğrencinin diğer dönemleri Enrollments'ta listelenir.
/// </summary>
public static class GetStudentPayments
{
    public record PeriodInfo(Guid Id, string Name, DateOnly Start, DateOnly End);

    public record EnrollmentOption(Guid Id, Guid PeriodId, string PeriodName, EnrollmentStatus Status, decimal Remaining);

    /// <summary>status: paid | overdue | partial | upcoming (frontend lib/ledger.js)</summary>
    public record ChargeRow(Guid Id, ChargeKind Kind, string Month, DateOnly DueDate, string? Note, decimal Amount, decimal Paid, decimal Remaining, string Status, int DaysUntilDue);

    public record PaymentRow(Guid Id, PaymentKind Kind, DateOnly Date, decimal Amount, PaymentMethod Method);

    public record Totals(decimal Total, decimal Paid, decimal Remaining, decimal Overdue, decimal Credit, decimal Progress, int RentCount, int RentsPaid);

    public record Bank(string? Holder, string Iban);

    public record Response(
        Guid EnrollmentId, PeriodInfo Period, string Currency, List<EnrollmentOption> Enrollments, Totals Totals,
        ChargeRow? Next, CoveredPeriod Covered, List<ChargeRow> Charges, List<PaymentRow> Payments, Bank? Bank);

    public class Handler(AppDbContext db, LedgerService ledgers)
    {
        public async Task<Result<Response>> Handle(Guid studentId, Guid? enrollmentId, CancellationToken ct)
        {
            var mine = await db.Enrollments.AsNoTracking()
                .Where(x => x.StudentId == studentId)
                .Join(db.Periods, e => e.PeriodId, p => p.Id, (e, p) => new { e, p })
                .OrderBy(x => x.p.Status == PeriodStatus.Active ? 0 : 1).ThenByDescending(x => x.p.StartDate)
                .ToListAsync(ct);
            if (mine.Count == 0) return Error.NotFound("Kayıtlı bir döneminiz yok.");

            var selected = enrollmentId is { } id ? mine.FirstOrDefault(x => x.e.Id == id) : mine[0];
            if (selected is null) return Error.NotFound("Kayıt bulunamadı."); // başka öğrencinin kaydı da "bulunamadı" döner

            var today = TurkeyClock.Today;
            var summaries = await ledgers.SummariesAsync(mine.Select(x => x.e.Id).ToList(), today, ct);
            var summary = summaries[selected.e.Id];

            var charges = summary.Items
                .Where(i => i.Net > 0)
                .Select(i =>
                {
                    var amount = i.Net;
                    var paid = LedgerMath.Round(i.Allocated + i.Discounted);
                    var daysUntilDue = i.DueDate.DayNumber - today.DayNumber;
                    var status = i.Remaining <= 0 ? "paid" : daysUntilDue < 0 ? "overdue" : paid > 0 ? "partial" : "upcoming";
                    var note = i.Kind is ChargeKind.ExtraStay or ChargeKind.Summer or ChargeKind.Other ? i.Note : null;
                    return new ChargeRow(i.Id, i.Kind, i.Month, i.DueDate, note, amount, paid, i.Remaining, status, daysUntilDue);
                })
                .ToList();

            var payments = await db.Payments.AsNoTracking()
                .Where(x => x.EnrollmentId == selected.e.Id && x.CancelledAt == null)
                .OrderByDescending(x => x.Date).ThenByDescending(x => x.CreatedAt)
                .Select(x => new PaymentRow(x.Id, x.Kind, x.Date, x.Amount, x.Method))
                .ToListAsync(ct);

            var total = LedgerMath.Round(charges.Sum(c => c.Amount));
            var paidTotal = LedgerMath.Round(charges.Sum(c => c.Paid));
            var rents = charges.Where(c => c.Kind == ChargeKind.Rent).ToList();
            var totals = new Totals(
                total, paidTotal, summary.Remaining, summary.Overdue, summary.Advance,
                total > 0 ? Math.Min(1m, decimal.Round(paidTotal / total, 4)) : 0m,
                rents.Count, rents.Count(r => r.Status == "paid"));

            var settings = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == SiteSetting.SingletonId, ct);
            var bank = string.IsNullOrWhiteSpace(settings?.Iban) ? null : new Bank(settings!.IbanHolder, settings.Iban!);

            return new Response(
                selected.e.Id,
                new PeriodInfo(selected.p.Id, selected.p.Name, selected.p.StartDate, selected.p.EndDate),
                "TRY",
                mine.Select(x => new EnrollmentOption(x.e.Id, x.p.Id, x.p.Name, x.e.Status, summaries[x.e.Id].Remaining)).ToList(),
                totals,
                charges.FirstOrDefault(c => c.Remaining > 0),
                summary.Covered,
                charges,
                payments,
                bank);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/student/payments", async (Guid? enrollmentId, ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                    (await handler.Handle(user.GetUserId(), enrollmentId, ct)).ToOk())
                .RequireAuthorization(AppPolicies.Student);
    }
}
