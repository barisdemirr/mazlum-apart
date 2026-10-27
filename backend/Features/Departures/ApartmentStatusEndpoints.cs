using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Departures;

/// <summary>
/// Dairenin yönetici tarafından işaretlenen durumu (Yerleşim &amp; Doluluk ekranı, dairenin üstündeki ayar simgesi):
///  PUT /api/admin/apartments/{id}/readiness → hazırlık: needs_cleaning | needs_repair | ready (readiness boşsa işaret kalkar)
///  PUT /api/admin/apartments/{id}/boiler    → kombi açık / kapalı
/// Hazırlık işareti, daire en son boşaldığı andan önce konduysa eski sayılır (bkz. PresenceMath.EffectiveReadiness).
/// Her değişiklik işlem geçmişine yazılır; kayıt, yerleşim ve muhasebeye dokunulmaz.
/// </summary>
public static class ApartmentStatusEndpoints
{
    public record ReadinessCommand(ApartmentReadiness? Readiness, string? Note);

    public record BoilerCommand(bool BoilerOn);

    public record StatusDto(Guid ApartmentId, ApartmentReadiness? Readiness, string? Note, DateTime? ReadinessSetAt, bool BoilerOn);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public Task<Result<StatusDto>> SetReadiness(Guid apartmentId, ReadinessCommand cmd, CancellationToken ct) =>
            Save(apartmentId, "apartment.readiness", status =>
            {
                var note = string.IsNullOrWhiteSpace(cmd.Note) ? null : cmd.Note.Trim();
                var v = new Validator()
                    .Must("readiness", cmd.Readiness is null || Enum.IsDefined(cmd.Readiness.Value), "Hazırlık durumu geçersiz.")
                    .MaxLength("note", note, 300);
                if (!v.IsValid) return v.ToFailure();

                status.Readiness = cmd.Readiness;
                status.ReadinessSetAt = cmd.Readiness is null ? null : DateTime.UtcNow; // her işaretleme "şimdi" geçerlidir
                status.Note = cmd.Readiness is null ? null : note;
                return Result.Success();
            }, ct);

        public Task<Result<StatusDto>> SetBoiler(Guid apartmentId, BoilerCommand cmd, CancellationToken ct) =>
            Save(apartmentId, "apartment.boiler", status =>
            {
                status.BoilerOn = cmd.BoilerOn;
                return Result.Success();
            }, ct);

        private async Task<Result<StatusDto>> Save(Guid apartmentId, string action, Func<ApartmentStatus, Result> apply, CancellationToken ct)
        {
            if (!await db.Apartments.AnyAsync(x => x.Id == apartmentId, ct)) return Error.NotFound("Daire bulunamadı.");

            var status = await db.ApartmentStatuses.FirstOrDefaultAsync(x => x.ApartmentId == apartmentId, ct);
            if (status is null)
            {
                status = new ApartmentStatus { ApartmentId = apartmentId };
                db.ApartmentStatuses.Add(status);
            }

            var before = new { status.Readiness, status.Note, status.BoilerOn };
            var applied = apply(status);
            if (!applied.IsSuccess)
            {
                db.ChangeTracker.Clear();
                return applied.Error!;
            }

            audit.Add(action, "apartment", apartmentId, before: before, after: new { status.Readiness, status.Note, status.BoilerOn });
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                db.ChangeTracker.Clear();
                return Error.Conflict("Daire durumu aynı anda başka bir işlemle değişti. Sayfayı yenileyip tekrar deneyin.");
            }

            return new StatusDto(apartmentId, status.Readiness, status.Note, status.ReadinessSetAt, status.BoilerOn);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPut("/api/admin/apartments/{id:guid}/readiness", async (Guid id, ReadinessCommand cmd, Handler h, CancellationToken ct) =>
                (await h.SetReadiness(id, cmd, ct)).ToOk());

            app.MapPut("/api/admin/apartments/{id:guid}/boiler", async (Guid id, BoilerCommand cmd, Handler h, CancellationToken ct) =>
                (await h.SetBoiler(id, cmd, ct)).ToOk());
        }
    }
}
