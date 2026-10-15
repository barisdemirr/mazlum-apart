using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Enrollments;

public static class GetEnrollments
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/enrollments", async (Guid periodId, string? status, string? q, AppDbContext db, EnrollmentQueryHandler reader, CancellationToken ct) =>
            {
                var period = await db.Periods.AsNoTracking().FirstOrDefaultAsync(x => x.Id == periodId, ct);
                if (period is null) return Error.NotFound("Dönem bulunamadı.").ToProblem();

                var query = db.Enrollments.Where(x => x.PeriodId == periodId);
                if (!string.IsNullOrWhiteSpace(status))
                {
                    if (!QueryParsing.TryParseEnum<EnrollmentStatus>(status, out var s))
                        return Error.Field("status", "status: approved | active | cancelled | left").ToProblem();
                    query = query.Where(x => x.Status == s);
                }
                if (!string.IsNullOrWhiteSpace(q))
                {
                    var term = q.Trim();
                    query = query.Where(x => (x.Student!.FirstName + " " + x.Student.LastName).Contains(term) || x.Student.Phone.Contains(term) || x.Student.Tc.StartsWith(term));
                }

                var rows = await reader.RowsAsync(query.OrderBy(x => x.Student!.FirstName).ThenBy(x => x.Student!.LastName), EnrollmentQueryHandler.DayIn(period), ct);
                return Results.Ok(rows);
            });
    }
}

public record GuardianDto(string Name, string Phone);

public record StudentProfileDto(
    Guid Id, string Tc, string FirstName, string LastName, DateOnly BirthDate, string Phone, string Address, int ProvinceId, string Province,
    string District, string School, string Faculty, string Department, string Grade, List<GuardianDto> Guardians, bool HasPortalAccess, DateTime? LastLoginAt);

public record ApplicationRef(Guid Id, string No, ApplicationSource Source, DateTime CreatedAt);

/// <summary>Öğrenci detay sayfası: kayıt + öğrenci profili + başvuru + yerleşim geçmişi + kalem kalem hesap</summary>
public record EnrollmentDetail(EnrollmentRow Enrollment, StudentProfileDto Student, ApplicationRef? Application, List<RoomRef> Placements, List<LedgerItem> Items);

public static class GetEnrollment
{
    public class Handler(AppDbContext db, EnrollmentQueryHandler reader, LedgerService ledgers)
    {
        public async Task<Result<EnrollmentDetail>> Handle(Guid id, CancellationToken ct)
        {
            var enrollment = await db.Enrollments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (enrollment is null) return Error.NotFound("Kayıt bulunamadı.");
            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == enrollment.PeriodId, ct);

            var row = (await reader.RowsAsync(db.Enrollments.Where(x => x.Id == id), EnrollmentQueryHandler.DayIn(period), ct)).Single();
            var s = await db.Students.AsNoTracking().IgnoreQueryFilters().Include(x => x.Guardians.Where(g => g.DeletedAt == null))
                .FirstAsync(x => x.Id == enrollment.StudentId, ct);
            var app = await db.Applications.AsNoTracking().Where(x => x.Id == enrollment.ApplicationId)
                .Select(x => new ApplicationRef(x.Id, x.No, x.Source, x.CreatedAt)).FirstOrDefaultAsync(ct);
            var placements = await db.Placements.AsNoTracking().Include(x => x.Room).ThenInclude(r => r!.Apartment)
                .IgnoreQueryFilters().Where(x => x.EnrollmentId == id && x.DeletedAt == null)
                .OrderBy(x => x.StartDate).ToListAsync(ct);
            var ledger = (await ledgers.SummariesAsync([id], TurkeyClock.Today, ct))[id];

            var profile = new StudentProfileDto(s.Id, s.Tc, s.FirstName, s.LastName, s.BirthDate, s.Phone, s.Address, s.ProvinceId, s.Province,
                s.District, s.School, s.Faculty, s.Department, s.Grade,
                s.Guardians.OrderBy(g => g.OrderIndex).Select(g => new GuardianDto(g.Name, g.Phone)).ToList(),
                s.PasswordHash is not null, s.LastLoginAt);

            return new EnrollmentDetail(row, profile, app, placements.Select(EnrollmentQueryHandler.ToRef).ToList(), ledger.Items);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/enrollments/{id:guid}", async (Guid id, Handler handler, CancellationToken ct) => (await handler.Handle(id, ct)).ToOk());
    }
}
