using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Entities;

/*
 * ÇIKIŞ, GEÇİCİ AYRILIŞ VE DAİRE DURUMU (madde 18).
 * Bu üç tablo kayıt, yerleşim, borç ve tahsilata DOKUNMAZ: öğrenci çıkış yapsa da yerleşimi yerinde durur,
 * yatak sayıları değişmez, oda yeni başvurulara açılmaz. Durumlar (aktif / geçici ayrıldı / çıkış bildirildi / onaylandı,
 * daire boş mu) saklanmaz; seçilen güne göre PresenceMath ile hesaplanır.
 */

/// <summary>
/// Dönem sonu KESİN ÇIKIŞ. Bir kayıt için en fazla bir (silinmemiş) çıkış olur.
/// Bildirim tarihi ve saati CreatedAt'tir. Öğrenci ya da yönetici girer; onayı yalnızca yönetici verir.
/// Hatalı kayıt silinir (soft delete) ya da onayı geri alınıp düzeltilir; işlem geçmişine her adım yazılır.
/// </summary>
public class EnrollmentExit : BaseEntity
{
    public Guid PeriodId { get; set; }
    public Guid EnrollmentId { get; set; }

    /// <summary>Odayı boşalttığı gün. Bu günden itibaren öğrenci "çıkış yaptı" sayılır; ileri tarihli çıkış o güne kadar öğrenciyi aktif bırakır.</summary>
    public DateOnly ExitDate { get; set; }
    public string? Note { get; set; }

    public ActorType ReportedByType { get; set; }
    public Guid? ReportedById { get; set; }
    public string ReportedByName { get; set; } = "";

    /// <summary>Yönetici onayı. Boşsa "çıkış bildirildi", doluysa "çıkış onaylandı".</summary>
    public DateTime? ConfirmedAt { get; set; }
    public Guid? ConfirmedById { get; set; }
    public string? ConfirmedByName { get; set; }
}

/// <summary>
/// GEÇİCİ AYRILIŞ (ara tatil gibi). Oda hakkını ve konaklama kaydını sonlandırmaz, oda yeni başvurulara açılmaz.
/// Aralık [LeaveDate, dönüş) şeklindedir: PlannedReturnDate öğrencinin odaya döneceği ilk gündür.
/// ReturnedOn öğrencinin gerçekten döndüğü gündür (boşsa henüz dönmedi). Dönüş bildirilmemişse ve planlanan gün geçmişse "dönüşü gecikti".
/// </summary>
public class TemporaryLeave : BaseEntity
{
    public Guid PeriodId { get; set; }
    public Guid EnrollmentId { get; set; }

    public DateOnly LeaveDate { get; set; }
    public DateOnly PlannedReturnDate { get; set; }
    public DateOnly? ReturnedOn { get; set; }
    public string? Note { get; set; }

    public ActorType ReportedByType { get; set; }
    public Guid? ReportedById { get; set; }
    public string ReportedByName { get; set; } = "";
}

/// <summary>
/// Dairenin yönetici tarafından işaretlenen durumu: hazırlık (temizlik / tadilat / hazır) ve kombi. Daire başına tek satır.
/// Readiness yalnızca işaretlendiği andan SONRA geçerlidir: daire sonradan yeniden boşalırsa (yeni bir çıkış onayı gelirse)
/// eski "hazır" işareti kendiliğinden geçersiz sayılır (PresenceMath.EffectiveReadiness).
/// </summary>
public class ApartmentStatus : BaseEntity
{
    public Guid ApartmentId { get; set; }

    public ApartmentReadiness? Readiness { get; set; }
    public DateTime? ReadinessSetAt { get; set; }
    public string? Note { get; set; }

    /// <summary>Kombi açık mı. Varsayılan açık; tamamen boş dairelerde enerji tasarrufu için kapatıldı olarak işaretlenir.</summary>
    public bool BoilerOn { get; set; } = true;
}
