using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Accounting;

/// <summary>
/// Bir borç kaleminin hesaplanmış durumu (ters kayıtlar hariç; her kalem tek satır).
/// DueDate = planlanan vade; Deadline = kısmi ödeme oranına göre uzayan "son ödeme günü" (ReminderMath). Gecikme ve "vade" gösterimi Deadline'a göredir.
/// </summary>
public sealed record LedgerItem(
    Guid Id,
    ChargeKind Kind,
    string Month,
    DateOnly DueDate,
    string? Note,
    decimal Amount,
    decimal Net,
    decimal Allocated,
    decimal Discounted,
    decimal Remaining,
    bool Reversed,
    DateTime CreatedAt,
    DateOnly Deadline);

/// <summary>"Ödemesi karşılanan süre": Eylül–Kasım tam ödendi, Aralık kirasının 5.000'i ödendi gibi</summary>
public sealed record CoveredPeriod(string? FullThrough, PartialMonth? Partial);
public sealed record PartialMonth(string Month, decimal Paid, decimal Remaining);

/// <summary>Kayıt (öğrencinin dönem hesabı) özeti. status: paid | ok | overdue | empty</summary>
public sealed record EnrollmentSummary(
    List<LedgerItem> Items,
    decimal Charged,
    decimal Collected,
    decimal Refunded,
    decimal Allocated,
    decimal Remaining,
    decimal Overdue,
    decimal Advance,
    LedgerItem? Next,
    CoveredPeriod Covered,
    string Status);

/// <summary>
/// MUHASEBE ÇEKİRDEĞİ — saf fonksiyonlar (veritabanı yok). Frontend lib/admin/domain/accounting.js ile BİREBİR aynı sonuçları üretir.
///
///  1. Borç kalemi, tahsilat, dağıtım ve hesap hareketi ASLA düzenlenmez ya da silinmez; hata ters kayıtla düzeltilir.
///  2. Bakiyeler saklanmaz; hareketlerden HESAPLANIR.
///  3. Kalem iptali = eksi tutarlı yeni kalem (ReversalOfId). Orijinal görünür kalır.
///  4. Dağıtım iptali = eksi tutarlı yeni dağıtım. Serbest kalan para avansa döner.
///
///   net borç = kalem + ters kayıtları · dağıtılan = kaleme yazılan dağıtımlar · kalan = max(0, net − dağıtılan − indirim payı)
///   avans    = (iptal edilmemiş tahsilatlar − dağıtılanlar) − iadeler
/// </summary>
public static class LedgerMath
{
    public static decimal Round(decimal value) => decimal.Round(value, 2, MidpointRounding.AwayFromZero);

    /// <summary>Kalemlerin durumu: ters kayıtlar işlenir, dağıtımlar toplanır, indirimler açık kalemlerden (vadesi en eski) düşülür</summary>
    public static List<LedgerItem> ComputeItems(IReadOnlyCollection<Charge> charges, IReadOnlyCollection<PaymentAllocation> allocations)
    {
        var reversals = charges.Where(c => c.ReversalOfId is not null)
            .GroupBy(c => c.ReversalOfId!.Value)
            .ToDictionary(g => g.Key, g => Round(g.Sum(c => c.Amount)));

        var allocated = allocations
            .GroupBy(a => a.ChargeId)
            .ToDictionary(g => g.Key, g => Round(g.Sum(a => a.Amount)));

        var items = charges
            .Where(c => c.ReversalOfId is null)
            .Select(c =>
            {
                var net = Round(c.Amount + reversals.GetValueOrDefault(c.Id));
                var paid = allocated.GetValueOrDefault(c.Id);
                return new LedgerItem(c.Id, c.Kind, c.Month, c.DueDate, c.Note, c.Amount, net, paid, 0m,
                    Math.Max(0m, Round(net - paid)), net == 0m && c.Amount != 0m, c.CreatedAt, c.DueDate);
            })
            .OrderBy(i => i.DueDate).ThenBy(i => i.CreatedAt)
            .ToList();

        // İndirim (eksi kalem) açık kalemlerden, vadesi en eski olandan başlayarak düşülür; ödenmiş kalemlere dokunmaz
        var credit = Round(-items.Where(i => i.Net < 0).Sum(i => i.Net));
        for (var k = 0; k < items.Count && credit > 0; k++)
        {
            var item = items[k];
            if (item.Net <= 0 || item.Remaining <= 0) continue;
            var take = Round(Math.Min(credit, item.Remaining));
            items[k] = item with { Discounted = take, Remaining = Round(item.Remaining - take) };
            credit = Round(credit - take);
        }

        // Kısmi ödeme oranına göre son ödeme günü (indirim dağıtımı bittikten sonra, kalanlar kesinleşince hesaplanır)
        for (var k = 0; k < items.Count; k++)
            items[k] = items[k] with { Deadline = ReminderMath.Deadline(items[k], items) };

        return items;
    }

    /// <summary>Tutarı vadesi en eski açık kalemden başlayarak dağıtır (FIFO). Fazlası Leftover (avans).</summary>
    public static (List<(Guid ChargeId, decimal Amount)> Lines, decimal Leftover) PlanFifo(decimal amount, IEnumerable<LedgerItem> items)
    {
        var left = Round(amount);
        var lines = new List<(Guid, decimal)>();
        foreach (var item in items)
        {
            if (left <= 0) break;
            if (item.Remaining <= 0 || item.Net <= 0) continue; // indirime para dağıtılmaz
            var take = Round(Math.Min(left, item.Remaining));
            lines.Add((item.Id, take));
            left = Round(left - take);
        }
        return (lines, left);
    }

    public static EnrollmentSummary Summarize(
        IReadOnlyCollection<Charge> charges, IReadOnlyCollection<Payment> payments, IReadOnlyCollection<PaymentAllocation> allocations, DateOnly today)
    {
        var items = ComputeItems(charges, allocations);
        var active = payments.Where(p => p.Kind == PaymentKind.Collection && p.CancelledAt is null).ToList();
        var refunds = payments.Where(p => p.Kind == PaymentKind.Refund && p.CancelledAt is null).ToList();

        var activeIds = active.Select(p => p.Id).ToHashSet();
        var liveAllocated = Round(allocations.Where(a => activeIds.Contains(a.PaymentId)).Sum(a => a.Amount));

        var totalNet = Round(items.Where(i => i.Net > 0).Sum(i => i.Net));
        var discounts = Round(items.Where(i => i.Net < 0).Sum(i => i.Net));
        var collected = Round(active.Sum(p => p.Amount));
        var refunded = Round(refunds.Sum(p => p.Amount));
        var advance = Math.Max(0m, Round(collected - liveAllocated - refunded));
        var remaining = Round(items.Sum(i => i.Remaining));

        var open = items.Where(i => i.Remaining > 0).ToList();
        var overdue = Round(open.Where(i => i.Deadline < today).Sum(i => i.Remaining));

        var status = remaining == 0 ? (items.Count > 0 ? "paid" : "empty") : overdue > 0 ? "overdue" : "ok";

        return new EnrollmentSummary(items, Round(totalNet + discounts), collected, refunded, liveAllocated, remaining, overdue, advance,
            open.FirstOrDefault(), Covered(items), status);
    }

    public static CoveredPeriod Covered(IEnumerable<LedgerItem> items)
    {
        string? fullThrough = null;
        PartialMonth? partial = null;
        foreach (var rent in items.Where(i => i.Kind == ChargeKind.Rent && i.Net > 0).OrderBy(i => i.Month, StringComparer.Ordinal))
        {
            if (rent.Remaining == 0) fullThrough = rent.Month;
            else
            {
                if (rent.Allocated > 0) partial = new PartialMonth(rent.Month, rent.Allocated, rent.Remaining);
                break;
            }
        }
        return new CoveredPeriod(fullThrough, partial);
    }
}
