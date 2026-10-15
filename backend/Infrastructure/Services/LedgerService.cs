using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Infrastructure.Services;

/// <summary>
/// Bir kaydın (öğrencinin dönem hesabı) muhasebe defteri: kalemler, tahsilatlar, dağıtımlar bellekte tutulur.
/// Yeni satırlar hem buraya hem DbContext'e eklenir; böylece aynı işlem içinde hesaplar güncel kalır.
/// SaveChanges ÇAĞIRANA aittir (iş + denetim kaydı tek işlemde yazılır). Her değişiklik kaydın LedgerVersion'ını
/// artırır: aynı anda iki yazma olursa ikincisi eşzamanlılık hatası (409) alır.
/// </summary>
public sealed class EnrollmentLedger(AppDbContext db, Enrollment enrollment, List<Charge> charges, List<Payment> payments, List<PaymentAllocation> allocations)
{
    public Enrollment Enrollment { get; } = enrollment;
    public List<Charge> Charges { get; } = charges;
    public List<Payment> Payments { get; } = payments;
    public List<PaymentAllocation> Allocations { get; } = allocations;

    public List<LedgerItem> Items() => LedgerMath.ComputeItems(Charges, Allocations);

    public EnrollmentSummary Summary(DateOnly today) => LedgerMath.Summarize(Charges, Payments, Allocations, today);

    private void Touch() => Enrollment.LedgerVersion++;

    public Charge AddCharge(ChargeKind kind, string month, decimal amount, DateOnly dueDate, string? note, Guid? by, Guid? reversalOf = null)
    {
        var charge = new Charge
        {
            PeriodId = Enrollment.PeriodId,
            EnrollmentId = Enrollment.Id,
            Kind = kind,
            Month = month,
            Amount = LedgerMath.Round(amount),
            DueDate = dueDate,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
            ReversalOfId = reversalOf,
            CreatedById = by,
            CreatedAt = DateTime.UtcNow
        };
        Charges.Add(charge);
        db.Charges.Add(charge);
        Touch();
        return charge;
    }

    public PaymentAllocation AddAllocation(Guid paymentId, Guid chargeId, decimal amount, bool auto, bool reversal = false)
    {
        var row = new PaymentAllocation
        {
            PeriodId = Enrollment.PeriodId,
            EnrollmentId = Enrollment.Id,
            PaymentId = paymentId,
            ChargeId = chargeId,
            Amount = LedgerMath.Round(amount),
            IsAuto = auto,
            IsReversal = reversal,
            CreatedAt = DateTime.UtcNow
        };
        Allocations.Add(row);
        db.PaymentAllocations.Add(row);
        Touch();
        return row;
    }

    /// <summary>Serbest (dağıtılmamış) tahsilat parasını açık kalemlere otomatik mahsup eder (vadesi en eski olandan)</summary>
    public void AutoAllocate()
    {
        foreach (var payment in Payments.Where(p => p.Kind == PaymentKind.Collection && p.CancelledAt is null).OrderBy(p => p.Date).ThenBy(p => p.CreatedAt))
        {
            var used = LedgerMath.Round(Allocations.Where(a => a.PaymentId == payment.Id).Sum(a => a.Amount));
            var free = LedgerMath.Round(payment.Amount - used);
            if (free <= 0) continue;

            var (lines, _) = LedgerMath.PlanFifo(free, Items());
            foreach (var (chargeId, amount) in lines) AddAllocation(payment.Id, chargeId, amount, auto: true);
        }
    }

    /// <summary>
    /// Kalem iptali (ters kayıt): kalemin kalan net tutarı kadar eksi kalem yazılır. Ödenmiş kısmı dağıtımdan çözülür
    /// (en son dağıtımdan başlayarak) ve AVANSA döner; sonra serbest para başka açık kaleme mahsup edilir.
    /// </summary>
    public Result<Charge> Reverse(Guid chargeId, string reason, Guid? by)
    {
        var charge = Charges.FirstOrDefault(c => c.Id == chargeId);
        if (charge is null) return Error.NotFound("Kalem bulunamadı.");
        if (charge.ReversalOfId is not null) return Error.Conflict("Ters kayıt tekrar iptal edilemez.");
        if (string.IsNullOrWhiteSpace(reason)) return Error.Field("reason", "İptal nedenini yazın.");

        var item = Items().FirstOrDefault(i => i.Id == chargeId);
        if (item is null || item.Net == 0) return Error.Conflict("Bu kalem zaten iptal edilmiş.");

        var reversal = AddCharge(charge.Kind, charge.Month, -item.Net, charge.DueDate, $"İptal: {reason.Trim()}", by, reversalOf: chargeId);

        var toRelease = item.Allocated;
        foreach (var row in Allocations.Where(a => a.ChargeId == chargeId && a.Amount > 0).OrderByDescending(a => a.CreatedAt).ToList())
        {
            if (toRelease <= 0) break;
            var give = LedgerMath.Round(Math.Min(toRelease, row.Amount));
            AddAllocation(row.PaymentId, chargeId, -give, auto: false, reversal: true);
            toRelease = LedgerMath.Round(toRelease - give);
        }

        AutoAllocate();
        return reversal;
    }
}

public class LedgerService(AppDbContext db)
{
    /// <summary>Kaydın defterini yükler (kayıt nesnesi takip edilir; LedgerVersion eşzamanlılık belirtecidir)</summary>
    public async Task<EnrollmentLedger?> LoadAsync(Guid enrollmentId, CancellationToken ct)
    {
        var enrollment = await db.Enrollments.FirstOrDefaultAsync(x => x.Id == enrollmentId, ct);
        if (enrollment is null) return null;

        var charges = await db.Charges.Where(x => x.EnrollmentId == enrollmentId).ToListAsync(ct);
        var payments = await db.Payments.Where(x => x.EnrollmentId == enrollmentId).ToListAsync(ct);
        var allocations = await db.PaymentAllocations.Where(x => x.EnrollmentId == enrollmentId).ToListAsync(ct);
        return new EnrollmentLedger(db, enrollment, charges, payments, allocations);
    }

    /// <summary>Birden çok kaydın özetini tek seferde hesaplar (listeler ve panolar için; takip yok)</summary>
    public async Task<Dictionary<Guid, EnrollmentSummary>> SummariesAsync(IReadOnlyCollection<Guid> enrollmentIds, DateOnly today, CancellationToken ct)
    {
        if (enrollmentIds.Count == 0) return new Dictionary<Guid, EnrollmentSummary>();

        var charges = await db.Charges.AsNoTracking().Where(x => enrollmentIds.Contains(x.EnrollmentId)).ToListAsync(ct);
        var payments = await db.Payments.AsNoTracking().Where(x => enrollmentIds.Contains(x.EnrollmentId)).ToListAsync(ct);
        var allocations = await db.PaymentAllocations.AsNoTracking().Where(x => enrollmentIds.Contains(x.EnrollmentId)).ToListAsync(ct);

        var c = charges.ToLookup(x => x.EnrollmentId);
        var p = payments.ToLookup(x => x.EnrollmentId);
        var a = allocations.ToLookup(x => x.EnrollmentId);

        return enrollmentIds.ToDictionary(id => id, id => LedgerMath.Summarize(c[id].ToList(), p[id].ToList(), a[id].ToList(), today));
    }
}
