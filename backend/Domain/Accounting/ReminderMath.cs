using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Accounting;

/// <summary>
/// Otomatik ödeme hatırlatması için "gecikti mi?" kuralları — saf fonksiyonlar (veritabanı yok).
///
/// KISMİ ÖDEME ORANLAMASI: Öğrenci bir ayın kirasının bir kısmını ödediyse, ödediği oran kadar süre "karşılanmış" sayılır
/// ve hatırlatma ancak o süre dolunca başlar. Örnek: kira 12.500 TL, vade 5 Kasım, 10.000 TL ödendi → 4/5.
/// Vadeden bir sonraki vadeye kadar 30 gün var → 30 × 4/5 = 24 gün karşılanır → son tarih 5 + 24 = 29 Kasım.
/// Öğrenci 29 Kasım'dan SONRA (30 Kasım) hâlâ kalanı ödemediyse gecikmiş sayılır. Hiç ödeme yoksa son tarih vadenin kendisidir
/// (muhasebedeki "vadesi geçmiş" tanımıyla aynı: vade günü geçince gecikmiş).
/// Oranlama yalnızca KİRA kalemleri içindir; depozito ve diğer kalemler tek parça ödenir, vadesinde gecikmiş sayılır.
/// İndirim de "karşılanmış" kısım sayılır (ödenen + indirim) / net.
/// </summary>
public static class ReminderMath
{
    /// <summary>
    /// Kalemin SON ÖDEME GÜNÜ (bu günden SONRA gecikmiş sayılır). Kira kaleminde ödenen oran kadar süre uzar; süre, bu kalemin vadesinden
    /// bir sonraki kira vadesine kadar olan gündür (sonraki kira yoksa bir ay). Örnek: ilk ay kirası 16 Ekim'de vadeli, sonraki kira 5 Kasım (20 gün),
    /// 12.500 TL'nin 11.380 TL'si ödendi → 20 × 0,91 = 18 gün → son gün 3 Kasım.
    /// </summary>
    public static DateOnly Deadline(LedgerItem item, IReadOnlyList<LedgerItem> all)
    {
        if (item.Kind != ChargeKind.Rent || item.Net <= 0m || item.Remaining <= 0m) return item.DueDate;

        var covered = LedgerMath.Round(item.Net - item.Remaining);
        if (covered <= 0m) return item.DueDate;

        var share = covered / item.Net;
        var nextDue = all.Where(i => i.Kind == ChargeKind.Rent && i.Net > 0m && i.DueDate > item.DueDate)
            .Select(i => (DateOnly?)i.DueDate).Min();
        var cycleDays = (nextDue ?? item.DueDate.AddMonths(1)).DayNumber - item.DueDate.DayNumber;
        return item.DueDate.AddDays((int)Math.Floor(share * cycleDays));
    }

    /// <summary>Açık borcu olan ve (oranlanmış) son günü geçmiş kalem mi?</summary>
    public static bool IsOverdue(LedgerItem item, DateOnly today) =>
        item.Net > 0m && item.Remaining > 0m && item.Deadline < today;

    /// <summary>
    /// Son otomatik SMS'ten bu yana yeterince gün geçti mi? interval=3: 1. gün gönderilir, 2. ve 3. gün beklenir, 4. gün tekrar gönderilir.
    /// </summary>
    public static bool CooldownPassed(DateOnly? lastSentDay, DateOnly today, int intervalDays) =>
        lastSentDay is null || today.DayNumber - lastSentDay.Value.DayNumber >= Math.Max(1, intervalDays);
}
