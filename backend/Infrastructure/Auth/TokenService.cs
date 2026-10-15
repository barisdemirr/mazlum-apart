using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MazlumApart.Domain.Entities;
using MazlumApart.Shared;

namespace MazlumApart.Infrastructure.Auth;

/// <summary>
/// JWT üretir. Claim'ler: sub (kullanıcı id), typ (admin | student), name, stamp (SecurityStamp), jti.
/// Frontend token'ı httpOnly çerezde saklar ve "typ" alanına bakarak rolü ayırır (lib/auth/token.js).
/// </summary>
public class TokenService(IOptions<JwtOptions> options)
{
    public (string Token, DateTime ExpiresAt) CreateForAdmin(AdminUser user) =>
        Create(user.Id, AppRoles.Admin, user.FullName, user.SecurityStamp, TimeSpan.FromMinutes(options.Value.AdminExpiresMinutes),
            [new Claim("email", user.Email)]);

    public (string Token, DateTime ExpiresAt) CreateForStudent(Student student, bool remember)
    {
        var o = options.Value;
        var lifetime = remember ? TimeSpan.FromDays(o.StudentRememberDays) : TimeSpan.FromMinutes(o.StudentExpiresMinutes);
        return Create(student.Id, AppRoles.Student, student.FullName, student.SecurityStamp, lifetime, []);
    }

    private (string Token, DateTime ExpiresAt) Create(Guid id, string role, string name, Guid stamp, TimeSpan lifetime, IEnumerable<Claim> extra)
    {
        var o = options.Value;
        var expiresAt = DateTime.UtcNow.Add(lifetime);

        var claims = new List<Claim>
        {
            new(AppClaims.Subject, id.ToString()),
            new(AppClaims.Role, role),
            new(AppClaims.Name, name),
            new(AppClaims.Stamp, stamp.ToString("N")),
            new("jti", Guid.NewGuid().ToString("N"))
        };
        claims.AddRange(extra);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(o.Key));
        var token = new JwtSecurityToken(
            issuer: o.Issuer,
            audience: o.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
