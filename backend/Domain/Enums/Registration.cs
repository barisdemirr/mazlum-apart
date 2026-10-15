namespace MazlumApart.Domain.Enums;

/// <summary>Başvuru kaynağı: web sitesi formu ya da ofiste yönetici girişi</summary>
public enum ApplicationSource { Online, Office }

public enum ApplicationStatus { Pending, Approved, Rejected }

/// <summary>
/// Kayıt durumu (frontend lib/admin/labels.js ENROLLMENT_STATUS):
///   approved  = onaylı kayıt (ödeme planı var, henüz odaya yerleşmedi)
///   active    = aktif konaklama (odaya yerleşti)
///   cancelled = iptal · left = ayrıldı
/// </summary>
public enum EnrollmentStatus { Approved, Active, Cancelled, Left }

/// <summary>Kira ödeme günü: ayın 1–5'i (vade 5) ya da 15–20'si (vade 20)</summary>
public enum PayWindow { Early, Mid }

/// <summary>Kayıt süresi: tam dönem; yarım dönem açıksa 1. ya da 2. yarı</summary>
public enum StayTerm { Full, First, Second }
