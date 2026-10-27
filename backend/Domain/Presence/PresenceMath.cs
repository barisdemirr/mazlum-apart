using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Presence;

/// <summary>
/// Öğrencinin seçilen gündeki durumu (frontend renkleri: yeşil / sarı / turuncu / gri):
///   active = aktif konaklama · temporary_away = geçici ayrılış · exit_reported = çıkış bildirildi · exit_confirmed = çıkış onaylandı
/// </summary>
public enum StayState { Active, TemporaryAway, ExitReported, ExitConfirmed }

/// <summary>
/// Dairenin seçilen gündeki durumu (yerleşimi olan öğrencilerin durumlarından türetilir):
///   unoccupied        = o gün kimse yerleşik değil
///   occupied          = herkes aktif
///   partially_empty   = bazıları ayrıldı (kısmen geçici boş)
///   temporarily_empty = hepsi fiilen ayrıldı, en az biri geçici ayrılışta (geçici olarak tamamen boş)
///   exit_pending      = hepsi ayrıldı, hepsinin çıkışı bildirildi ama onaylanmamış
///   fully_vacated     = hepsinin çıkışı onaylandı (tamamen boşaldı)
/// </summary>
public enum ApartmentPresenceState { Unoccupied, Occupied, PartiallyEmpty, TemporarilyEmpty, ExitPending, FullyVacated }

public sealed record ExitFact(DateOnly ExitDate, bool Confirmed);

public sealed record LeaveFact(DateOnly LeaveDate, DateOnly PlannedReturn, DateOnly? ReturnedOn);

/// <summary>
/// Saf hesaplar (veritabanına dokunmaz). "today" gerçek bugündür; "day" bakılan gündür (geçmiş ya da gelecek olabilir).
/// İleri tarihli bildirim bugünden itibaren kimseyi ayrılmış göstermez: yalnızca kendi tarihi geldiğinde etki eder.
/// </summary>
public static class PresenceMath
{
    /// <summary>
    /// Öğrencinin odaya döndüğü ilk gün. Gerçek dönüş bildirildiyse o; yoksa planlanan gün. Planlanan gün geçtiği halde dönüş
    /// bildirilmediyse bugün hâlâ ayrılış sayılır (yarın dönmüş varsayılır): "dönüşü gecikti".
    /// </summary>
    public static DateOnly AwayUntil(LeaveFact leave, DateOnly today) =>
        leave.ReturnedOn ?? (leave.PlannedReturn > today ? leave.PlannedReturn : today.AddDays(1));

    public static bool IsAway(LeaveFact leave, DateOnly day, DateOnly today) =>
        day >= leave.LeaveDate && day < AwayUntil(leave, today);

    /// <summary>Dönüş bildirilmemiş, ayrılış başlamış ve planlanan dönüş günü geçmiş</summary>
    public static bool IsOverdue(LeaveFact leave, DateOnly today) =>
        leave.ReturnedOn is null && leave.LeaveDate <= today && leave.PlannedReturn < today;

    public static StayState StateOf(ExitFact? exit, IEnumerable<LeaveFact> leaves, DateOnly day, DateOnly today)
    {
        if (exit is not null && exit.ExitDate <= day)
            return exit.Confirmed ? StayState.ExitConfirmed : StayState.ExitReported;

        return leaves.Any(l => IsAway(l, day, today)) ? StayState.TemporaryAway : StayState.Active;
    }

    public static ApartmentPresenceState ApartmentStateOf(IReadOnlyCollection<StayState> occupants)
    {
        if (occupants.Count == 0) return ApartmentPresenceState.Unoccupied;

        var gone = occupants.Count(s => s != StayState.Active);
        if (gone == 0) return ApartmentPresenceState.Occupied;
        if (gone < occupants.Count) return ApartmentPresenceState.PartiallyEmpty;
        if (occupants.All(s => s == StayState.ExitConfirmed)) return ApartmentPresenceState.FullyVacated;
        return occupants.Any(s => s == StayState.TemporaryAway) ? ApartmentPresenceState.TemporarilyEmpty : ApartmentPresenceState.ExitPending;
    }

    /// <summary>
    /// Hazırlık işareti, daire en son boşaldığı (son çıkış onayı) andan ÖNCE konduysa eskidir ve yok sayılır.
    /// Böylece geçen yıl "hazır" işaretlenen daire bu yıl boşalınca yeniden "temizlik bekliyor" akışına girer.
    /// </summary>
    public static ApartmentReadiness? EffectiveReadiness(ApartmentReadiness? readiness, DateTime? setAt, DateTime? lastConfirmedAt)
    {
        if (readiness is null) return null;
        if (lastConfirmedAt is { } confirmed && (setAt is null || setAt < confirmed)) return null;
        return readiness;
    }
}
