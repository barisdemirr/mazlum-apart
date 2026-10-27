using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Enrollments;

/// <summary>
/// Dönem bazlı giriş ve işlem takibi: giriş yaptı (+ giriş tarihi), parmak izi, WhatsApp grubu, apart sözleşmesi.
/// Kayıt dönemseldir; işaretler yalnızca bu kaydı etkiler (eski/yeni dönem kayıtları birbirini değiştirmez). Yönetici elle işaretler.
/// </summary>
public static class SaveEnrollmentTracking
{
    public record Command(bool MovedIn, DateOnly? MovedInDate, bool FingerprintTaken, bool WhatsAppGroupAdded, bool ContractSigned);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result<bool>> Handle(Guid id, Command cmd, CancellationToken ct)
        {
            var enrollment = await db.Enrollments.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (enrollment is null) return Error.NotFound("Kayıt bulunamadı.");
            if (enrollment.Status == EnrollmentStatus.Cancelled) return Error.Conflict("İptal edilmiş kaydın takibi değiştirilemez.");

            var movedInDate = cmd.MovedIn ? cmd.MovedInDate ?? TurkeyClock.Today : (DateOnly?)null;

            var before = new { enrollment.MovedIn, enrollment.MovedInDate, enrollment.FingerprintTaken, enrollment.WhatsAppGroupAdded, enrollment.ContractSigned };
            enrollment.MovedIn = cmd.MovedIn;
            enrollment.MovedInDate = movedInDate;
            enrollment.FingerprintTaken = cmd.FingerprintTaken;
            enrollment.WhatsAppGroupAdded = cmd.WhatsAppGroupAdded;
            enrollment.ContractSigned = cmd.ContractSigned;

            audit.Add("enrollment.tracking", "enrollment", id, enrollment.PeriodId, before: before,
                after: new { cmd.MovedIn, MovedInDate = movedInDate, cmd.FingerprintTaken, cmd.WhatsAppGroupAdded, cmd.ContractSigned });
            await db.SaveChangesAsync(ct);
            return true;
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/enrollments/{id:guid}/tracking", async (Guid id, Command cmd, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, cmd, ct)).ToOk());
    }
}
