using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Infrastructure.Services;

/// <summary>
/// İşlem geçmişine kayıt ekler. Kayıt, çağıranın SaveChanges'i ile AYNI işlemde yazılır:
/// iş başarısız olursa denetim kaydı da yazılmaz, iş başarılıysa denetim kaydı mutlaka vardır.
///   audit.Add("payment.create", "payment", payment.Id, periodId, after: new { amount });
/// </summary>
public class AuditWriter(AppDbContext db, IHttpContextAccessor accessor)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower) },
        ReferenceHandler = ReferenceHandler.IgnoreCycles
    };

    public AuditLog Add(string action, string entity, object? entityId, Guid? periodId = null,
        object? before = null, object? after = null, string? note = null)
    {
        var context = accessor.HttpContext;
        var user = context?.User;
        var (type, id, name) = Actor(user);

        var log = new AuditLog
        {
            ActorType = type,
            ActorId = id,
            ActorName = name,
            Action = action,
            Entity = entity,
            EntityId = entityId?.ToString(),
            PeriodId = periodId,
            Before = before is null ? null : JsonSerializer.Serialize(before, Json),
            After = after is null ? null : JsonSerializer.Serialize(after, Json),
            Note = string.IsNullOrWhiteSpace(note) ? null : Truncate(note.Trim(), 1000),
            Ip = context is null ? null : ClientIp.Get(context)
        };

        db.AuditLogs.Add(log);
        return log;
    }

    private static (ActorType, Guid?, string) Actor(ClaimsPrincipal? user)
    {
        if (user?.Identity?.IsAuthenticated != true) return (ActorType.Public, null, "Ziyaretçi");

        var id = Guid.TryParse(user.FindFirstValue(AppClaims.Subject), out var parsed) ? parsed : (Guid?)null;
        var name = user.GetDisplayName();
        return user.IsStudent() ? (ActorType.Student, id, name) : (ActorType.Admin, id, name);
    }

    private static string Truncate(string value, int max) => value.Length > max ? value[..max] : value;
}
