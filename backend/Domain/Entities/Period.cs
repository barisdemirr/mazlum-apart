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
}
