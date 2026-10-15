using MazlumApart.Domain.Entities;

namespace MazlumApart.Features.AdminUsers;

/// <summary>Frontend "Yöneticiler" sayfasının satırı: { id, name, email, active, createdAt, lastLoginAt }</summary>
public record AdminUserDto(Guid Id, string Name, string Email, bool Active, DateTime CreatedAt, DateTime? LastLoginAt)
{
    public static AdminUserDto From(AdminUser x) => new(x.Id, x.FullName, x.Email, x.IsActive, x.CreatedAt, x.LastLoginAt);
}

/// <summary>Yeni hesap / şifre sıfırlama sonucu: ilk şifre YALNIZCA bu yanıtta görünür, bir daha gösterilmez</summary>
public record AdminUserWithPassword(AdminUserDto Admin, string InitialPassword);
