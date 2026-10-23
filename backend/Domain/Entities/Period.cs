using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// Dönem (örn. 2026–2027 Akademik: 1 Eylül – 30 Haziran). Her dönemin kaydı ve muhasebesi ayrıdır;
/// yeni dönem başlatılınca aktif dönem kapanır ve hiçbir kayıt kopyalanmaz (istenirse yalnızca fiyatlar).
/// Kapalı dönemde yeni başvuru / kayıt / yerleşim açılamaz; eski borç tahsilatı yine o döneme yazılır.
/// </summary>
public class Period : BaseEntity
{
    public string Name { get; set; } = "";
    public PeriodType Type { get; set; } = PeriodType.Academic;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public PeriodStatus Status { get; set; } = PeriodStatus.Active;
    public bool ApplicationsOpen { get; set; } = true;
    public DateTime? ClosedAt { get; set; }

    // Yarım dönem: varsayılan KAPALI. Kayıt döneminin sonunda boş oda fazlaysa yönetici açar (öncelik tam dönem).
    public bool HalfTermEnabled { get; set; }
    public DateOnly? HalfTermFirstEnd { get; set; }
    public DateOnly? HalfTermSecondStart { get; set; }

    // 9 aylık dönem: kayıt döneminde (Eylül sonuna kadar) odalar dolmazsa yönetici açar; Eylül kirası alınmaz,
    // kira ve giriş en erken başlangıç ayını izleyen ayın 1'inden başlar. Yalnızca akademik dönemde geçerlidir.
    public bool NineMonthTerm { get; set; }

    /// <summary>Kiranın (ve yeni kayıtlarda girişin) başlayabileceği ilk gün: 10 aylıkta dönem başı, 9 aylıkta ertesi ayın 1'i</summary>
    public DateOnly RentStart =>
        NineMonthTerm && Type == PeriodType.Academic ? new DateOnly(StartDate.Year, StartDate.Month, 1).AddMonths(1) : StartDate;
}
