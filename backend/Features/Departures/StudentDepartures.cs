using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.Presence;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Departures;

/// <summary>
/// Öğrenci portalı: "Çıkış & Ayrılış" (madde 18). Yalnızca token'daki öğrencinin kendi kaydı; kayıt kimliği istekten ALINMAZ,
/// öğrencinin güncel kaydı sunucuda seçilir (portalın diğer sayfalarıyla aynı kural).
///  GET    /api/student/departures                  → güncel kaydın çıkış + ayrılış bilgisi
///  POST   /api/student/departures/exit             → "Çıkış Yaptım" (tarih boşsa bugün)
///  PUT    /api/student/departures/exit             → onaylanana kadar tarihi / notu düzelt
///  DELETE /api/student/departures/exit             → onaylanana kadar bildirimi geri al
///  POST   /api/student/departures/leaves           → "Geçici Ayrılış Bildir"
///  PUT    /api/student/departures/leaves/{id}      → planlanan dönüşü (ve notu) güncelle
///  POST   /api/student/departures/leaves/{id}/return → "Dönüş Yaptım" (bugün)
///  DELETE /api/student/departures/leaves/{id}      → henüz başlamamış ayrılışı iptal et
/// Her bildirim yöneticilere anlık bildirim gönderir ve işlem geçmişine yazılır.
/// </summary>
public static class StudentDepartures
{
    public record ExitCommand(DateOnly? ExitDate, string? Note);

    public record LeaveCommand(DateOnly LeaveDate, DateOnly PlannedReturnDate, string? Note);

    public record LeaveUpdateCommand(DateOnly? LeaveDate, DateOnly? PlannedReturnDate, string? Note);

    /// <summary>CanReport: kayıt aktif/onaylı ve dönem açık (kapalıysa ekran yalnızca gösterir)</summary>
    public record View(Guid EnrollmentId, Guid PeriodId, string PeriodName, EnrollmentStatus Status, DateOnly EntryDate, DateOnly LastDay, DateOnly Today,
        bool CanReport, StayState State, ExitDto? Exit, List<LeaveDto> Leaves);

    public class Handler(AppDbContext db, PresenceReader reader)
    {
        /// <summary>Öğrencinin güncel kaydı: önce bugünü kapsayan dönem, sonra aktif dönem, sonra en yeni (portalın diğer sayfalarıyla aynı sıra)</summary>
        public async Task<Result<DepartureContext>> CurrentAsync(Guid studentId, CancellationToken ct)
        {
            var today = TurkeyClock.Today;
            var pick = await db.Enrollments.AsNoTracking()
                .Where(x => x.StudentId == studentId)
                .Join(db.Periods, e => e.PeriodId, p => p.Id, (e, p) => new { e, p })
                .OrderBy(x => x.e.Status != EnrollmentStatus.Cancelled && x.p.StartDate <= today && x.p.EndDate >= today ? 0 : 1)
                .ThenBy(x => x.p.Status == PeriodStatus.Active ? 0 : 1).ThenByDescending(x => x.p.StartDate)
                .FirstOrDefaultAsync(ct);
            if (pick is null) return Error.NotFound("Kayıtlı bir döneminiz yok.");
            return new DepartureContext(pick.e, pick.p);
        }

        public async Task<Result<View>> GetAsync(Guid studentId, CancellationToken ct)
        {
            var context = await CurrentAsync(studentId, ct);
            if (!context.IsSuccess) return context.Error!;

            var c = context.Value!;
            var summary = await reader.SummaryAsync(c.Enrollment.Id, ct);
            return new View(c.Enrollment.Id, c.Period.Id, c.Period.Name, c.Enrollment.Status, c.Enrollment.EntryDate, DepartureWriter.LastDay(c),
                TurkeyClock.Today, DepartureWriter.CheckWritable(c) is null, summary.State, summary.Exit, summary.Leaves);
        }
    }

    public class Endpoint : IEndpoint
    {
        private static async Task<IResult> OnCurrent(Handler handler, ClaimsPrincipal user, Func<DepartureContext, Task<IResult>> action, CancellationToken ct)
        {
            var context = await handler.CurrentAsync(user.GetUserId(), ct);
            return context.IsSuccess ? await action(context.Value!) : context.Error!.ToProblem();
        }

        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/student/departures").RequireAuthorization(AppPolicies.Student);

            group.MapGet("", async (ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                (await handler.GetAsync(user.GetUserId(), ct)).ToOk());

            group.MapPost("/exit", (ExitCommand cmd, ClaimsPrincipal user, Handler handler, DepartureWriter writer, CancellationToken ct) =>
                    OnCurrent(handler, user, async c =>
                        (await writer.ReportExitAsync(c, cmd.ExitDate, cmd.Note, DepartureActor.From(user), false, ct)).ToOk(), ct))
                .RequireRateLimiting(RatePolicies.StudentWrite);

            group.MapPut("/exit", (ExitCommand cmd, ClaimsPrincipal user, Handler handler, DepartureWriter writer, CancellationToken ct) =>
                    OnCurrent(handler, user, async c =>
                        (await writer.UpdateExitAsync(c, cmd.ExitDate, cmd.Note, DepartureActor.From(user), ct)).ToOk(), ct))
                .RequireRateLimiting(RatePolicies.StudentWrite);

            group.MapDelete("/exit", (ClaimsPrincipal user, Handler handler, DepartureWriter writer, CancellationToken ct) =>
                    OnCurrent(handler, user, async c =>
                        (await writer.DeleteExitAsync(c, DepartureActor.From(user), ct)).ToNoContent(), ct))
                .RequireRateLimiting(RatePolicies.StudentWrite);

            group.MapPost("/leaves", (LeaveCommand cmd, ClaimsPrincipal user, Handler handler, DepartureWriter writer, CancellationToken ct) =>
                    OnCurrent(handler, user, async c =>
                        (await writer.CreateLeaveAsync(c, cmd.LeaveDate, cmd.PlannedReturnDate, cmd.Note, DepartureActor.From(user), ct)).ToOk(), ct))
                .RequireRateLimiting(RatePolicies.StudentWrite);

            // Sahiplik (başkasının ayrılışı) DepartureWriter içinde, token'daki öğrenci kimliğiyle denetlenir
            group.MapPut("/leaves/{id:guid}", async (Guid id, LeaveUpdateCommand cmd, ClaimsPrincipal user, DepartureWriter writer, CancellationToken ct) =>
                    (await writer.UpdateLeaveAsync(id, user.GetUserId(), new LeaveEdit(cmd.LeaveDate, cmd.PlannedReturnDate, cmd.Note), DepartureActor.From(user), ct)).ToOk())
                .RequireRateLimiting(RatePolicies.StudentWrite);

            group.MapPost("/leaves/{id:guid}/return", async (Guid id, ClaimsPrincipal user, DepartureWriter writer, CancellationToken ct) =>
                    (await writer.MarkReturnedAsync(id, user.GetUserId(), null, DepartureActor.From(user), ct)).ToOk())
                .RequireRateLimiting(RatePolicies.StudentWrite);

            group.MapDelete("/leaves/{id:guid}", async (Guid id, ClaimsPrincipal user, DepartureWriter writer, CancellationToken ct) =>
                    (await writer.DeleteLeaveAsync(id, user.GetUserId(), DepartureActor.From(user), ct)).ToNoContent())
                .RequireRateLimiting(RatePolicies.StudentWrite);
        }
    }
}
