using System.Security.Claims;
using MazlumApart.Shared;

namespace MazlumApart.Features.Departures;

/// <summary>
/// Yönetici: öğrenci adına çıkış / geçici ayrılış girer, düzeltir, onaylar (madde 18).
///  GET    /api/admin/enrollments/{id}/departures        → kaydın çıkış + ayrılış bilgisi (öğrenci detayı ve doluluk penceresi)
///  POST   /api/admin/enrollments/{id}/exit              → çıkış gir (confirm: true ise aynı anda onaylı)
///  PUT    /api/admin/enrollments/{id}/exit              → tarihi / notu düzelt (onaylıysa önce onayı geri al)
///  POST   /api/admin/enrollments/{id}/exit/confirm      → onayla
///  POST   /api/admin/enrollments/{id}/exit/unconfirm    → onayı geri al
///  DELETE /api/admin/enrollments/{id}/exit              → hatalı bildirimi sil (işlem geçmişinde kalır)
///  POST   /api/admin/enrollments/{id}/leaves            → geçici ayrılış ekle
///  PUT    /api/admin/leaves/{id}                        → ayrılışı düzenle (dönüş gününü gir / geri al dahil)
///  POST   /api/admin/leaves/{id}/return                 → "Döndü" (returnedOn boşsa bugün)
///  DELETE /api/admin/leaves/{id}                        → ayrılışı sil
/// Kayıt, yerleşim, borç ve tahsilata hiçbir durumda dokunulmaz.
/// </summary>
public static class AdminDepartures
{
    public record ExitCommand(DateOnly? ExitDate, string? Note, bool Confirm = false);

    public record LeaveCommand(DateOnly LeaveDate, DateOnly PlannedReturnDate, string? Note);

    public record LeaveUpdateCommand(DateOnly? LeaveDate, DateOnly? PlannedReturnDate, string? Note, DateOnly? ReturnedOn, bool ClearReturn = false);

    public record ReturnCommand(DateOnly? ReturnedOn);

    public class Endpoint : IEndpoint
    {
        private static async Task<IResult> OnEnrollment(DepartureWriter writer, Guid id, Func<DepartureContext, Task<IResult>> action, CancellationToken ct)
        {
            var context = await writer.LoadAsync(id, null, ct);
            return context.IsSuccess ? await action(context.Value!) : context.Error!.ToProblem();
        }

        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/admin/enrollments/{id:guid}/departures", (Guid id, DepartureWriter writer, PresenceReader reader, CancellationToken ct) =>
                OnEnrollment(writer, id, async _ => Results.Ok(await reader.SummaryAsync(id, ct)), ct));

            app.MapPost("/api/admin/enrollments/{id:guid}/exit", (Guid id, ExitCommand cmd, ClaimsPrincipal user, DepartureWriter writer, CancellationToken ct) =>
                OnEnrollment(writer, id, async c =>
                    (await writer.ReportExitAsync(c, cmd.ExitDate, cmd.Note, DepartureActor.From(user), cmd.Confirm, ct)).ToOk(), ct));

            app.MapPut("/api/admin/enrollments/{id:guid}/exit", (Guid id, ExitCommand cmd, ClaimsPrincipal user, DepartureWriter writer, CancellationToken ct) =>
                OnEnrollment(writer, id, async c =>
                    (await writer.UpdateExitAsync(c, cmd.ExitDate, cmd.Note, DepartureActor.From(user), ct)).ToOk(), ct));

            app.MapPost("/api/admin/enrollments/{id:guid}/exit/confirm", (Guid id, ClaimsPrincipal user, DepartureWriter writer, CancellationToken ct) =>
                OnEnrollment(writer, id, async c =>
                    (await writer.SetConfirmedAsync(c, true, DepartureActor.From(user), ct)).ToOk(), ct));

            app.MapPost("/api/admin/enrollments/{id:guid}/exit/unconfirm", (Guid id, ClaimsPrincipal user, DepartureWriter writer, CancellationToken ct) =>
                OnEnrollment(writer, id, async c =>
                    (await writer.SetConfirmedAsync(c, false, DepartureActor.From(user), ct)).ToOk(), ct));

            app.MapDelete("/api/admin/enrollments/{id:guid}/exit", (Guid id, ClaimsPrincipal user, DepartureWriter writer, CancellationToken ct) =>
                OnEnrollment(writer, id, async c =>
                    (await writer.DeleteExitAsync(c, DepartureActor.From(user), ct)).ToNoContent(), ct));

            app.MapPost("/api/admin/enrollments/{id:guid}/leaves", (Guid id, LeaveCommand cmd, ClaimsPrincipal user, DepartureWriter writer, CancellationToken ct) =>
                OnEnrollment(writer, id, async c =>
                    (await writer.CreateLeaveAsync(c, cmd.LeaveDate, cmd.PlannedReturnDate, cmd.Note, DepartureActor.From(user), ct)).ToOk(), ct));

            app.MapPut("/api/admin/leaves/{id:guid}", async (Guid id, LeaveUpdateCommand cmd, ClaimsPrincipal user, DepartureWriter writer, CancellationToken ct) =>
                (await writer.UpdateLeaveAsync(id, null,
                    new LeaveEdit(cmd.LeaveDate, cmd.PlannedReturnDate, cmd.Note, cmd.ClearReturn, cmd.ReturnedOn), DepartureActor.From(user), ct)).ToOk());

            app.MapPost("/api/admin/leaves/{id:guid}/return", async (Guid id, ReturnCommand? cmd, ClaimsPrincipal user, DepartureWriter writer, CancellationToken ct) =>
                (await writer.MarkReturnedAsync(id, null, cmd?.ReturnedOn, DepartureActor.From(user), ct)).ToOk());

            app.MapDelete("/api/admin/leaves/{id:guid}", async (Guid id, ClaimsPrincipal user, DepartureWriter writer, CancellationToken ct) =>
                (await writer.DeleteLeaveAsync(id, null, DepartureActor.From(user), ct)).ToNoContent());
        }
    }
}
