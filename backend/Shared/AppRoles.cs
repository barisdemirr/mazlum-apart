namespace MazlumApart.Shared;

/// <summary>
/// İki rol vardır ve token'daki "typ" claim'i bunları ayırır (frontend lib/auth/token.js de aynı alana bakar).
///   admin   -> yönetim paneli (AdminUsers tablosu)
///   student -> öğrenci portalı (Students tablosu)
/// Bir öğrenci token'ı yönetici uçlarına, yönetici token'ı öğrenci uçlarına giremez.
/// </summary>
public static class AppRoles
{
    public const string Admin = "admin";
    public const string Student = "student";
}

/// <summary>Yetkilendirme politikaları. Varsayılan (fallback) politika = Admin: açıkça işaretlenmeyen her uç yalnızca yöneticiye açıktır.</summary>
public static class AppPolicies
{
    public const string Admin = "AdminOnly";
    public const string Student = "StudentOnly";
}

/// <summary>Token claim adları (kısa ve frontend ile uyumlu)</summary>
public static class AppClaims
{
    public const string Subject = "sub";
    public const string Role = "typ";
    public const string Name = "name";
    public const string Stamp = "stamp"; // şifre değişince / hesap kapanınca eski token'lar geçersiz olur
}
