using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Accounting;

public sealed record ChargeDraft(ChargeKind Kind, string Month, decimal Amount, DateOnly DueDate, string Note);

/// <summary>
/// Ödeme planı (frontend lib/admin/domain/plan.js ile aynı). Kayıt onaylanınca dönemin TAMAMI için baştan üretilir.
///  - Depozito = 1 aylık kira (dönem fiyatı). Kayıt tarihinde vadelidir ve SON AYIN kirası yerine sayılır:
///    dönemin son ayı için ayrıca kira kalemi yoktur (öğrenci o ay ödeme yapmaz).
///  - İlk ayın kirası kayıt tarihinde vadelidir (peşin): kayıtta 1 depozito + 1 kira.
///  - Sonraki aylar seçilen ödeme gününe göre: ayın 5'i (1–5) ya da 20'si (15–20).
///  - Tek aylık kayıtta (giriş son aydaysa) kira alınır.
/// </summary>
public static class PaymentPlan
{
    public static int DueDay(PayWindow window) => window == PayWindow.Mid ? 20 : 5;

    public static string MonthKey(DateOnly date) => $"{date.Year:D4}-{date.Month:D2}";

    public static List<ChargeDraft> Generate(DateOnly entryDate, PayWindow window, decimal monthly, decimal deposit, DateOnly periodEnd)
    {
        var drafts = new List<ChargeDraft>
        {
            new(ChargeKind.Deposit, MonthKey(entryDate), deposit, entryDate, "Depozito (son ay kirası yerine)")
        };

        var cursor = new DateOnly(entryDate.Year, entryDate.Month, 1);
        var last = new DateOnly(periodEnd.Year, periodEnd.Month, 1);
        var lastRent = cursor < last ? last.AddMonths(-1) : last;
        var dueDay = DueDay(window);

        for (var index = 0; cursor <= lastRent; index++, cursor = cursor.AddMonths(1))
        {
            var first = index == 0;
            var due = first ? entryDate : new DateOnly(cursor.Year, cursor.Month, Math.Min(dueDay, DateTime.DaysInMonth(cursor.Year, cursor.Month)));
            drafts.Add(new ChargeDraft(ChargeKind.Rent, MonthKey(cursor), monthly, due, first ? "İlk ay kirası (peşin)" : ""));
        }

        return drafts;
    }
}
