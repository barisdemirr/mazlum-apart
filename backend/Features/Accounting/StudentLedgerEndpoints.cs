using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Features.Enrollments;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Accounting;

/*
 * ÖĞRENCİ CARİ HESABI (frontend lib/admin/domain/ledger.js ile aynı kurallar)
 *  - Tahsilat: tutar kira tutarına bağlı değildir; FIFO ya da elle dağıtılır, fazlası avans olur. Kapalı dönemde de alınabilir.
 *  - Avans iadesi: yalnızca serbest avans kadar. Kapalı dönemde de yapılabilir.
 *  - Kalem ekleme / kalem iptali / tahsilat iptali: kapalı dönemde YAPILAMAZ.
 *  - Hiçbir satır düzenlenmez ya da silinmez; hata ters kayıtla düzeltilir.
 *  - Para yaratan komutlar (tahsilat, iade, kalem) Idempotency-Key başlığı ister: çift tıklama iki kayıt açmaz.
 *  - Her yazma kaydın LedgerVersion'ını artırır: iki yönetici aynı hesaba aynı anda yazarsa ikincisi 409 alır.
 */

public record AllocationLine(Guid ChargeId, decimal Amount);

public record PaymentRow(
    Guid Id, PaymentKind Kind, decimal Amount, DateOnly Date, PaymentMethod Method, Guid AccountId, string AccountName, string? Note,
    DateTime CreatedAt, string? CreatedBy, DateTime? CancelledAt, string? CancelReason, string? CancelledBy, List<AllocationLine> Allocations);

public record StatementItem(
    Guid Id, ChargeKind Kind, string Month, DateOnly DueDate, string? Note, decimal Amount, decimal Net, decimal Allocated,
    decimal Discounted, decimal Remaining, bool Reversed, string? ReversalNote, DateTime CreatedAt, DateOnly Deadline);

public record HistoryRow(Guid Id, DateTime At, string By, string Action, string? Note);

public record PeriodBrief(Guid Id, string Name, PeriodStatus Status, DateOnly Start, DateOnly End);

/// <summary>Hesap ekstresi: özet + kalemler + tahsilat/iadeler (dağıtımlarıyla) + işlem geçmişi</summary>
public static class GetStudentAccount
{
    public record Response(EnrollmentRow Enrollment, PeriodBrief Period, List<StatementItem> Items, List<PaymentRow> Payments, List<HistoryRow> History);

    public class Handler(AppDbContext db, EnrollmentQueryHandler reader, FinanceQueryHandler finance)
    {
        public async Task<Result<Response>> Handle(Guid enrollmentId, CancellationToken ct)
        {
            var enrollment = await db.Enrollments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == enrollmentId, ct);
            if (enrollment is null) return Error.NotFound("Kayıt bulunamadı.");
            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == enrollment.PeriodId, ct);

            var (row, ledger) = (await reader.LoadAsync(db.Enrollments.Where(x => x.Id == enrollmentId), EnrollmentQueryHandler.DayIn(period), ct)).Single();

            var charges = await db.Charges.AsNoTracking().Where(x => x.EnrollmentId == enrollmentId).ToListAsync(ct);
            var payments = await db.Payments.AsNoTracking().Where(x => x.EnrollmentId == enrollmentId)
                .OrderByDescending(x => x.Date).ThenByDescending(x => x.CreatedAt).ToListAsync(ct);
            var allocations = await db.PaymentAllocations.AsNoTracking().Where(x => x.EnrollmentId == enrollmentId).ToListAsync(ct);
            var accounts = await db.Accounts.AsNoTracking().IgnoreQueryFilters().ToDictionaryAsync(x => x.Id, x => x.Name, ct);
            var names = await finance.AdminNamesAsync(ct);

            var reversalNotes = charges.Where(c => c.ReversalOfId is not null)
                .GroupBy(c => c.ReversalOfId!.Value)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(c => c.CreatedAt).First().Note);

            var items = ledger.Items.Select(i => new StatementItem(
                i.Id, i.Kind, i.Month, i.DueDate, i.Note, i.Amount, i.Net, i.Allocated, i.Discounted, i.Remaining, i.Reversed,
                reversalNotes.GetValueOrDefault(i.Id), i.CreatedAt, i.Deadline)).ToList();

            var paymentRows = payments.Select(p => new PaymentRow(
                p.Id, p.Kind, p.Amount, p.Date, p.Method, p.AccountId, accounts.GetValueOrDefault(p.AccountId, ""), p.Note,
                p.CreatedAt, names.NameOf(p.CreatedById), p.CancelledAt, p.CancelReason, names.NameOf(p.CancelledById),
                allocations.Where(a => a.PaymentId == p.Id)
                    .GroupBy(a => a.ChargeId)
                    .Select(g => new AllocationLine(g.Key, LedgerMath.Round(g.Sum(a => a.Amount))))
                    .Where(a => a.Amount > 0)
                    .ToList())).ToList();

            // İşlem geçmişi: bu kayda, kalemlerine ve tahsilatlarına ait denetim kayıtları
            var ids = charges.Select(c => c.Id.ToString())
                .Concat(payments.Select(p => p.Id.ToString()))
                .Append(enrollmentId.ToString())
                .ToList();
            var history = await db.AuditLogs.AsNoTracking()
                .Where(x => x.EntityId != null && ids.Contains(x.EntityId) && (x.Entity == "payment" || x.Entity == "charge" || x.Entity == "enrollment"))
                .OrderByDescending(x => x.CreatedAt).Take(50)
                .Select(x => new HistoryRow(x.Id, x.CreatedAt, x.ActorName, x.Action, x.Note))
                .ToListAsync(ct);

            return new Response(row, new PeriodBrief(period.Id, period.Name, period.Status, period.StartDate, period.EndDate), items, paymentRows, history);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/enrollments/{id:guid}/account", async (Guid id, Handler h, CancellationToken ct) => (await h.Handle(id, ct)).ToOk());
    }
}

/// <summary>
/// Tahsilat. allocations verilmezse vadesi en eski kalemden başlayarak dağıtılır (FIFO); verilirse (elle dağıtım)
/// toplamı tutarı aşamaz, artan tutar avans olarak kalır. Nakit → kasa hesabı; havale/EFT ve POS → banka hesabı.
/// </summary>
public static class RecordPayment
{
    public record Command(decimal Amount, DateOnly? Date, PaymentMethod? Method, Guid AccountId, string? Note, List<AllocationLine>? Allocations);

    public record Response(Guid PaymentId, List<AllocationLine> Lines, decimal Advance);

    public class Handler(AppDbContext db, LedgerService ledgers, CashBook cashBook, IdempotencyGuard idempotency, AuditWriter audit)
    {
        public async Task<Result<Response>> Handle(Guid enrollmentId, Command cmd, Guid adminId, Guid? key, CancellationToken ct)
        {
            var note = cmd.Note?.Trim() ?? "";
            var v = new Validator()
                .Must("date", cmd.Date is not null, "Tahsilat tarihini seçin.")
                .Must("method", cmd.Method is not null, "Ödeme yöntemini seçin.")
                .MaxLength("note", note, 500);
            if (Money.Check(cmd.Amount) is { } money) v.AddError("amount", money);
            if (!v.IsValid) return v.ToFailure<Response>();
            if (PeriodRules.NotInFuture(cmd.Date!.Value, "date") is { } future) return future;

            var ledger = await ledgers.LoadAsync(enrollmentId, ct);
            if (ledger is null) return Error.NotFound("Kayıt bulunamadı.");

            var found = await cashBook.UsableAsync(cmd.AccountId, "accountId", ct);
            if (!found.IsSuccess) return found.Error!;
            var account = found.Value!;
            if (cmd.Method == PaymentMethod.Cash && account.Type != AccountType.Cash)
                return Error.Field("accountId", "Nakit tahsilat bir kasa hesabına yazılmalı.");
            if (cmd.Method is PaymentMethod.Transfer or PaymentMethod.Pos && account.Type != AccountType.Bank)
                return Error.Field("accountId", "Havale/EFT ve POS tahsilatı bir banka hesabına yazılmalı.");

            List<(Guid ChargeId, decimal Amount)> lines;
            var manual = cmd.Allocations is not null;
            if (manual)
            {
                var checkedLines = ledger.CheckManualLines(cmd.Amount, cmd.Allocations!.Select(a => (a.ChargeId, a.Amount)));
                if (!checkedLines.IsSuccess) return checkedLines.Error!;
                lines = checkedLines.Value!;
            }
            else lines = LedgerMath.PlanFifo(cmd.Amount, ledger.Items()).Lines;

            if (await idempotency.BeginAsync(key, "payment.create", adminId, ct) is { } dup) return dup;

            var payment = ledger.AddPayment(PaymentKind.Collection, cmd.Amount, cmd.Date.Value, cmd.Method!.Value, account.Id, note, adminId);
            foreach (var (chargeId, amount) in lines) ledger.AddAllocation(payment.Id, chargeId, amount, auto: !manual);

            cashBook.Add(payment.PeriodId, account.Id, payment.Date, TransactionDirection.In, payment.Amount, TransactionSource.Payment, payment.Id, "Öğrenci tahsilatı", adminId);

            var result = lines.Select(l => new AllocationLine(l.ChargeId, l.Amount)).ToList();
            var advance = Math.Max(0m, LedgerMath.Round(cmd.Amount - lines.Sum(l => l.Amount)));
            audit.Add("payment.create", "payment", payment.Id, payment.PeriodId,
                after: new { amount = payment.Amount, method = payment.Method, account = account.Name, manual, lines = result, advance });
            await db.SaveChangesAsync(ct);

            return new Response(payment.Id, result, advance);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/enrollments/{id:guid}/payments", async (Guid id, Command cmd, [FromHeader(Name = IdempotencyGuard.Header)] Guid? key,
                    ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(id, cmd, user.GetUserId(), key, ct)).ToOk());
    }
}

/// <summary>Tahsilat iptali: dağıtımlar geri alınır, ters kasa/banka hareketi (çıkış) yazılır; tahsilat "iptal edildi" olarak kalır</summary>
public static class CancelPayment
{
    public record Command(string? Reason);

    public class Handler(AppDbContext db, LedgerService ledgers, CashBook cashBook, AuditWriter audit)
    {
        public async Task<Result<Guid>> Handle(Guid paymentId, Command cmd, Guid adminId, CancellationToken ct)
        {
            var reason = cmd.Reason?.Trim() ?? "";
            var v = new Validator().Required("reason", reason, "İptal nedenini yazın.").MaxLength("reason", reason, 500);
            if (!v.IsValid) return v.ToFailure<Guid>();

            var target = await db.Payments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == paymentId, ct);
            if (target is null) return Error.NotFound("Tahsilat bulunamadı.");
            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == target.PeriodId, ct);
            if (PeriodRules.RequireOpen(period, "Tahsilat iptali") is { } closed) return closed;

            var ledger = await ledgers.LoadAsync(target.EnrollmentId, ct);
            if (ledger is null) return Error.NotFound("Kayıt bulunamadı.");

            var cancelled = ledger.CancelPayment(paymentId, reason, adminId, TurkeyClock.Today);
            if (!cancelled.IsSuccess) return cancelled.Error!;
            var payment = cancelled.Value!;

            cashBook.Add(payment.PeriodId, payment.AccountId, TurkeyClock.Today, TransactionDirection.Out, payment.Amount,
                TransactionSource.PaymentCancel, payment.Id, $"Tahsilat iptali: {reason}", adminId);
            audit.Add("payment.cancel", "payment", payment.Id, payment.PeriodId,
                before: new { amount = payment.Amount, date = payment.Date, method = payment.Method }, note: reason);
            await db.SaveChangesAsync(ct);
            return payment.Id;
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/payments/{id:guid}/cancel", async (Guid id, Command cmd, ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(id, cmd, user.GetUserId(), ct)).ToHttp(_ => Results.NoContent()));
    }
}

/// <summary>Avans iadesi: öğrencinin serbest avansı kasa/bankadan çıkış olarak ödenir</summary>
public static class RefundAdvance
{
    public record Command(decimal Amount, DateOnly? Date, Guid AccountId, string? Note);

    public class Handler(AppDbContext db, LedgerService ledgers, CashBook cashBook, IdempotencyGuard idempotency, AuditWriter audit)
    {
        public async Task<Result<Guid>> Handle(Guid enrollmentId, Command cmd, Guid adminId, Guid? key, CancellationToken ct)
        {
            var note = cmd.Note?.Trim() ?? "";
            var v = new Validator()
                .Must("date", cmd.Date is not null, "İade tarihini seçin.")
                .MaxLength("note", note, 500);
            if (Money.Check(cmd.Amount) is { } money) v.AddError("amount", money);
            if (!v.IsValid) return v.ToFailure<Guid>();
            if (PeriodRules.NotInFuture(cmd.Date!.Value, "date") is { } future) return future;

            var ledger = await ledgers.LoadAsync(enrollmentId, ct);
            if (ledger is null) return Error.NotFound("Kayıt bulunamadı.");

            var found = await cashBook.UsableAsync(cmd.AccountId, "accountId", ct);
            if (!found.IsSuccess) return found.Error!;
            var account = found.Value!;

            var advance = ledger.Summary(TurkeyClock.Today).Advance;
            if (cmd.Amount > advance) return Error.Conflict($"İade edilebilecek avans {advance:N2} ₺; daha fazlası iade edilemez.");

            if (await idempotency.BeginAsync(key, "payment.refund", adminId, ct) is { } dup) return dup;

            var method = account.Type == AccountType.Cash ? PaymentMethod.Cash : PaymentMethod.Transfer;
            var refund = ledger.AddPayment(PaymentKind.Refund, cmd.Amount, cmd.Date.Value, method, account.Id, note, adminId);
            cashBook.Add(refund.PeriodId, account.Id, refund.Date, TransactionDirection.Out, refund.Amount, TransactionSource.Refund, refund.Id, "Avans iadesi", adminId);
            audit.Add("payment.refund", "payment", refund.Id, refund.PeriodId, after: new { amount = refund.Amount, account = account.Name });
            await db.SaveChangesAsync(ct);
            return refund.Id;
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/enrollments/{id:guid}/refunds", async (Guid id, Command cmd, [FromHeader(Name = IdempotencyGuard.Header)] Guid? key,
                    ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(id, cmd, user.GetUserId(), key, ct)).ToHttp(refundId => Results.Ok(new { id = refundId })));
    }
}

/// <summary>
/// Elle borç kalemi: ek konaklama (bütünleme — fiyat elle), yaz, diğer, indirim (pozitif yazılır, eksi kaydedilir), kira, depozito.
/// Öğrencinin serbest avansı varsa yeni kaleme otomatik mahsup edilir.
/// </summary>
public static class AddCharge
{
    public record Command(ChargeKind? Kind, string? Month, decimal Amount, DateOnly? DueDate, string? Note);

    public class Handler(AppDbContext db, LedgerService ledgers, IdempotencyGuard idempotency, AuditWriter audit)
    {
        public async Task<Result<StatementItem>> Handle(Guid enrollmentId, Command cmd, Guid adminId, Guid? key, CancellationToken ct)
        {
            var note = cmd.Note?.Trim() ?? "";
            var month = string.IsNullOrWhiteSpace(cmd.Month) ? null : cmd.Month.Trim();
            var v = new Validator()
                .Must("kind", cmd.Kind is not null, "Kalem türünü seçin.")
                .Must("dueDate", cmd.DueDate is not null, "Vade tarihini seçin.")
                .Must("month", month is null || Money.IsMonth(month), "Ay YYYY-AA biçiminde olmalı.")
                .MaxLength("note", note, 300);
            if (Money.Check(cmd.Amount) is { } money) v.AddError("amount", money);
            if (cmd.Kind == ChargeKind.Discount && note.Length == 0) v.AddError("note", "İndirim için açıklama yazın.");
            if (!v.IsValid) return v.ToFailure<StatementItem>();

            var ledger = await ledgers.LoadAsync(enrollmentId, ct);
            if (ledger is null) return Error.NotFound("Kayıt bulunamadı.");
            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == ledger.Enrollment.PeriodId, ct);
            if (PeriodRules.RequireOpen(period, "Kalem ekleme") is { } closed) return closed;

            if (await idempotency.BeginAsync(key, "charge.create", adminId, ct) is { } dup) return dup;

            var kind = cmd.Kind!.Value;
            var amount = kind == ChargeKind.Discount ? -cmd.Amount : cmd.Amount;
            var charge = ledger.AddCharge(kind, month ?? Money.MonthOf(cmd.DueDate!.Value), amount, cmd.DueDate!.Value, note, adminId);
            ledger.AutoAllocate();

            audit.Add(kind == ChargeKind.Discount ? "charge.discount" : "charge.create", "charge", charge.Id, charge.PeriodId,
                after: new { kind, month = charge.Month, amount = charge.Amount, dueDate = charge.DueDate, note = charge.Note });
            await db.SaveChangesAsync(ct);

            var item = ledger.Items().First(i => i.Id == charge.Id);
            return new StatementItem(item.Id, item.Kind, item.Month, item.DueDate, item.Note, item.Amount, item.Net, item.Allocated,
                item.Discounted, item.Remaining, item.Reversed, null, item.CreatedAt, item.Deadline);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/enrollments/{id:guid}/charges", async (Guid id, Command cmd, [FromHeader(Name = IdempotencyGuard.Header)] Guid? key,
                    ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(id, cmd, user.GetUserId(), key, ct)).ToOk());
    }
}

/// <summary>
/// Kalem iptali (ters kayıt): kalemin kalan net tutarı kadar eksi kalem yazılır. Ödenmiş kısmı dağıtımdan çözülür ve avansa döner;
/// serbest kalan para varsa başka açık kaleme mahsup edilir.
/// </summary>
public static class ReverseCharge
{
    public record Command(string? Reason);

    public class Handler(AppDbContext db, LedgerService ledgers, AuditWriter audit)
    {
        public async Task<Result<Guid>> Handle(Guid chargeId, Command cmd, Guid adminId, CancellationToken ct)
        {
            var reason = cmd.Reason?.Trim() ?? "";
            var v = new Validator().Required("reason", reason, "İptal nedenini yazın.").MaxLength("reason", reason, 300);
            if (!v.IsValid) return v.ToFailure<Guid>();

            var target = await db.Charges.AsNoTracking().FirstOrDefaultAsync(x => x.Id == chargeId, ct);
            if (target is null) return Error.NotFound("Kalem bulunamadı.");
            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == target.PeriodId, ct);
            if (PeriodRules.RequireOpen(period, "Kalem iptali") is { } closed) return closed;

            var ledger = await ledgers.LoadAsync(target.EnrollmentId, ct);
            if (ledger is null) return Error.NotFound("Kayıt bulunamadı.");

            var before = ledger.Items().FirstOrDefault(i => i.Id == chargeId);
            var reversed = ledger.Reverse(chargeId, reason, adminId);
            if (!reversed.IsSuccess) return reversed.Error!;

            audit.Add("charge.reverse", "charge", chargeId, target.PeriodId,
                before: before is null ? null : new { before.Kind, before.Month, before.Net, before.Allocated, before.Remaining },
                after: new { reversal = reversed.Value!.Amount }, note: reason);
            await db.SaveChangesAsync(ct);
            return reversed.Value!.Id;
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/charges/{id:guid}/reverse", async (Guid id, Command cmd, ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(id, cmd, user.GetUserId(), ct)).ToHttp(reversalId => Results.Ok(new { id = reversalId })));
    }
}

/// <summary>
/// Kalem tutarını değiştirme (ör. 12 ay kaydında yaz kirası, sonradan anlaşılan fiyat): kalemler değişmez kayıt olduğu için
/// eski kalem ters kayıtla kapanır, aynı tür / ay / vade ile yeni tutarda kalem açılır. Ödenmiş kısmı avansa döner ve
/// otomatik yeniden dağıtılır. İndirim ve ters kayıt kalemleri değiştirilemez (iptal edip yenisi eklenir).
/// </summary>
public static class AmendCharge
{
    public record Command(decimal Amount, string? Reason);

    public class Handler(AppDbContext db, LedgerService ledgers, AuditWriter audit)
    {
        public async Task<Result<Guid>> Handle(Guid chargeId, Command cmd, Guid adminId, CancellationToken ct)
        {
            var reason = cmd.Reason?.Trim() ?? "";
            var v = new Validator().Required("reason", reason, "Değişiklik nedenini yazın.").MaxLength("reason", reason, 300);
            if (Money.Check(cmd.Amount) is { } money) v.AddError("amount", money);
            if (!v.IsValid) return v.ToFailure<Guid>();

            var target = await db.Charges.AsNoTracking().FirstOrDefaultAsync(x => x.Id == chargeId, ct);
            if (target is null) return Error.NotFound("Kalem bulunamadı.");
            if (target.ReversalOfId is not null || target.Kind == ChargeKind.Discount || target.Amount <= 0)
                return Error.Conflict("Yalnızca borç kalemlerinin tutarı değiştirilebilir. İndirimi iptal edip yenisini ekleyin.");

            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == target.PeriodId, ct);
            if (PeriodRules.RequireOpen(period, "Tutar değişikliği") is { } closed) return closed;

            var ledger = await ledgers.LoadAsync(target.EnrollmentId, ct);
            if (ledger is null) return Error.NotFound("Kayıt bulunamadı.");

            var before = ledger.Items().FirstOrDefault(i => i.Id == chargeId);
            if (before is null || before.Net == 0) return Error.Conflict("Bu kalem iptal edilmiş; tutarı değiştirilemez.");

            var amount = decimal.Round(cmd.Amount, 2);
            if (amount == before.Net) return Error.Field("amount", "Yeni tutar mevcut tutarla aynı.");

            var reversed = ledger.Reverse(chargeId, $"Tutar değişikliği: {reason}", adminId);
            if (!reversed.IsSuccess) return reversed.Error!;

            var charge = ledger.AddCharge(target.Kind, target.Month, amount, target.DueDate,
                string.IsNullOrWhiteSpace(target.Note) ? reason : target.Note, adminId);
            ledger.AutoAllocate();

            audit.Add("charge.amend", "charge", chargeId, target.PeriodId,
                before: new { before.Kind, before.Month, amount = before.Net, before.Allocated },
                after: new { chargeId = charge.Id, amount }, note: reason);
            await db.SaveChangesAsync(ct);
            return charge.Id;
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/charges/{id:guid}/amend", async (Guid id, Command cmd, ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(id, cmd, user.GetUserId(), ct)).ToHttp(newId => Results.Ok(new { id = newId })));
    }
}

/// <summary>Tahsilatlar sayfası: seçili dönemin tüm tahsilat ve iadeleri (iptal edilenler dahil) + dönem toplamları</summary>
public static class GetPayments
{
    public record Row(
        Guid Id, PaymentKind Kind, decimal Amount, DateOnly Date, PaymentMethod Method, Guid AccountId, string AccountName,
        Guid EnrollmentId, StudentRef Student, string? Note, DateTime CreatedAt, string? CreatedBy, DateTime? CancelledAt, string? CancelReason);

    public record Response(List<Row> Items, PeriodTotals Totals);

    public class Handler(AppDbContext db, FinanceQueryHandler finance)
    {
        public async Task<Result<Response>> Handle(Guid periodId, CancellationToken ct)
        {
            if (!await db.Periods.AnyAsync(x => x.Id == periodId, ct)) return Error.NotFound("Dönem bulunamadı.");

            var payments = await db.Payments.AsNoTracking()
                .Where(x => x.PeriodId == periodId)
                .OrderByDescending(x => x.Date).ThenByDescending(x => x.CreatedAt)
                .ToListAsync(ct);

            var enrollmentIds = payments.Select(p => p.EnrollmentId).Distinct().ToList();
            var students = await db.Enrollments.AsNoTracking().IgnoreQueryFilters()
                .Where(x => enrollmentIds.Contains(x.Id))
                .Select(x => new { x.Id, x.StudentId, x.Student!.FirstName, x.Student.LastName, x.Student.Phone, x.Student.Tc })
                .ToDictionaryAsync(x => x.Id, ct);
            var accounts = await db.Accounts.AsNoTracking().IgnoreQueryFilters().ToDictionaryAsync(x => x.Id, x => x.Name, ct);
            var names = await finance.AdminNamesAsync(ct);
            var (totals, _) = await finance.PeriodAsync(periodId, ct);

            var rows = payments.Select(p =>
            {
                var s = students.GetValueOrDefault(p.EnrollmentId);
                var student = s is null ? new StudentRef(Guid.Empty, "", "", "", "") : new StudentRef(s.StudentId, s.FirstName, s.LastName, s.Phone, s.Tc);
                return new Row(p.Id, p.Kind, p.Amount, p.Date, p.Method, p.AccountId, accounts.GetValueOrDefault(p.AccountId, ""),
                    p.EnrollmentId, student, p.Note, p.CreatedAt, names.NameOf(p.CreatedById), p.CancelledAt, p.CancelReason);
            }).ToList();

            return new Response(rows, totals);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/payments", async (Guid periodId, Handler h, CancellationToken ct) => (await h.Handle(periodId, ct)).ToOk());
    }
}
