using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Features.Enrollments;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.StudentPortal;

/// <summary>
/// Öğrenci portalı "Bilgilerim" (frontend services/student.js getStudentProfile ile aynı şekil).
/// Yalnızca token'daki öğrencinin kendi verisi döner. Kayıt: aktif dönemdeki kaydı, yoksa en son kaydı.
/// </summary>
public static class GetStudentMe
{
    public record StayRoom(LocalizedText TypeName, string? Flat, string? RoomName, int? FlatPeople);

    public record PeriodRef(Guid Id, string Name, DateOnly Start, DateOnly End);

    public record Response(
        Guid Id, string FirstName, string LastName, string Phone, string Tc, DateOnly BirthDate, int ProvinceId, string Province, string District,
        string Address, string School, string Faculty, string Department, string Grade, List<GuardianDto> Guardians,
        Guid? EnrollmentId, EnrollmentStatus? Status, StayTerm? Term, DateOnly? EntryDate, DateTime? RegisteredAt, PeriodRef? Period, StayRoom? Room);

    public class Handler(AppDbContext db)
    {
        public async Task<Result<Response>> Handle(Guid studentId, CancellationToken ct)
        {
            var s = await db.Students.AsNoTracking().Include(x => x.Guardians).FirstOrDefaultAsync(x => x.Id == studentId, ct);
            if (s is null) return Error.NotFound("Öğrenci bulunamadı.");

            var enrollment = await db.Enrollments.AsNoTracking()
                .Where(x => x.StudentId == studentId)
                .Join(db.Periods, e => e.PeriodId, p => p.Id, (e, p) => new { e, p })
                .OrderBy(x => x.p.Status == PeriodStatus.Active ? 0 : 1).ThenByDescending(x => x.p.StartDate)
                .FirstOrDefaultAsync(ct);

            StayRoom? room = null;
            if (enrollment is not null)
            {
                var day = EnrollmentQueryHandler.DayIn(enrollment.p);
                var placements = await db.Placements.AsNoTracking().Include(x => x.Room).ThenInclude(r => r!.Apartment)
                    .Where(x => x.EnrollmentId == enrollment.e.Id).ToListAsync(ct);
                var current = placements.OrderByDescending(p => p.StartDate).FirstOrDefault(p => p.StartDate <= day && p.EndDate >= day)
                              ?? placements.OrderByDescending(p => p.StartDate).FirstOrDefault();

                int? flatPeople = null;
                if (current?.Room?.ApartmentId is { } aptId)
                    flatPeople = await db.Rooms.Where(r => r.ApartmentId == aptId && r.Status == RoomStatus.Active).SumAsync(r => r.Beds, ct);

                var typeName = await db.RoomTypes.IgnoreQueryFilters().AsNoTracking()
                    .Where(x => x.Id == enrollment.e.RoomTypeId).Select(x => x.Name).FirstOrDefaultAsync(ct);
                room = new StayRoom(typeName ?? new LocalizedText(), current?.Room?.Apartment?.Name, current?.Room?.Name, flatPeople);
            }

            return new Response(
                s.Id, s.FirstName, s.LastName, s.Phone, s.Tc, s.BirthDate, s.ProvinceId, s.Province, s.District, s.Address,
                s.School, s.Faculty, s.Department, s.Grade,
                s.Guardians.OrderBy(g => g.OrderIndex).Select(g => new GuardianDto(g.Name, g.Phone)).ToList(),
                enrollment?.e.Id, enrollment?.e.Status, enrollment?.e.Term, enrollment?.e.EntryDate, enrollment?.e.CreatedAt,
                enrollment is null ? null : new PeriodRef(enrollment.p.Id, enrollment.p.Name, enrollment.p.StartDate, enrollment.p.EndDate),
                room);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/student/me", async (ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                    (await handler.Handle(user.GetUserId(), ct)).ToOk())
                .RequireAuthorization(AppPolicies.Student);
    }
}
