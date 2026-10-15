using System.Security.Claims;

namespace MazlumApart.Shared;

public static class ClaimsExtensions
{
    /// <summary>Token'daki kullanıcı kimliği (sub). Yönetici için AdminUser.Id, öğrenci için Student.Id.</summary>
    public static Guid GetUserId(this ClaimsPrincipal user) => Guid.Parse(user.FindFirstValue(AppClaims.Subject)!);

    public static string? GetRole(this ClaimsPrincipal user) => user.FindFirstValue(AppClaims.Role);

    public static string GetDisplayName(this ClaimsPrincipal user) => user.FindFirstValue(AppClaims.Name) ?? "";

    public static bool IsAdmin(this ClaimsPrincipal user) => user.GetRole() == AppRoles.Admin;
    public static bool IsStudent(this ClaimsPrincipal user) => user.GetRole() == AppRoles.Student;
}
