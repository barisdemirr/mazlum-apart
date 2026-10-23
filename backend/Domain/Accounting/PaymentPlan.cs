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

    /// <summary>12 aylık kaydın bitişi: akademik dönemin bittiği yılın 31 Ağustos'u</summary>
    public static DateOnly SummerEnd(DateOnly academicEnd) =>
        academicEnd.Month <= 8 ? new DateOnly(academicEnd.Year, 8, 31) : academicEnd;

    /// <summary>
    /// Konaklama türüne göre plan: akademik ve sadece yaz = normal plan (planEnd: dönem ya da yarı sonu);
    /// 12 ay = normal plan + dönem sonundan 31 Ağustos'a kadar her ay için "yaz" kalemi (yaz fiyatı, seçilen ödeme gününde).
    /// Depozito her durumda planEnd ayının (Haziran) kirası yerine sayılır.
    /// </summary>
    public static List<ChargeDraft> ForStay(StayPlan plan, DateOnly entryDate, PayWindow window, decimal monthly, decimal deposit, DateOnly planEnd, decimal? summerMonthly, DateOnly? rentFrom = null)
    {
        var drafts = Generate(entryDate, window, monthly, deposit, planEnd, rentFrom);
        if (plan != StayPlan.Yearly) return drafts;

        var dueDay = DueDay(window);
        var last = SummerEnd(planEnd);
        for (var cursor = new DateOnly(planEnd.Year, planEnd.Month, 1).AddMonths(1); cursor <= last; cursor = cursor.AddMonths(1))
        {
            var due = new DateOnly(cursor.Year, cursor.Month, Math.Min(dueDay, DateTime.DaysInMonth(cursor.Year, cursor.Month)));
            drafts.Add(new ChargeDraft(ChargeKind.Summer, MonthKey(cursor), summerMonthly ?? monthly, due, "Yaz konaklaması (12 ay)"));
        }
        return drafts;
    }

    /// <summary>
    /// rentFrom: kiranın başlayabileceği ilk gün (9 aylık dönemde Ekim). Giriş bundan önceyse ilk kira o aya kayar;
    /// depozito ve ilk ay kirası yine kayıt tarihinde (peşin) vadelidir, aradaki ay için kira kalemi oluşmaz.
    /// </summary>
    public static List<ChargeDraft> Generate(DateOnly entryDate, PayWindow window, decimal monthly, decimal deposit, DateOnly periodEnd, DateOnly? rentFrom = null)
    {
        var drafts = new List<ChargeDraft>
        {
            new(ChargeKind.Deposit, MonthKey(entryDate), deposit, entryDate, "Depozito (son ay kirası yerine)")
        };

        var cursor = new DateOnly(entryDate.Year, entryDate.Month, 1);
        if (rentFrom is { } rf && new DateOnly(rf.Year, rf.Month, 1) is var firstRent && firstRent > cursor) cursor = firstRent;
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
