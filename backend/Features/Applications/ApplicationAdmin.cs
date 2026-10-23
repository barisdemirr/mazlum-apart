using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Infrastructure.Auth;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Applications;

public record ApplicationRow(
    Guid Id, string No, ApplicationSource Source, ApplicationStatus Status, DateTime CreatedAt,
    string FullName, string Tc, string Phone, Guid RoomTypeId, string RoomTypeName, string? PreferredRoom,
    DateOnly EntryDate, PayWindow PayWindow, StayTerm Term, decimal PriceMonthly, decimal PriceDeposit, Guid? EnrollmentId,
    StayPlan StayPlan, decimal? PriceSummerMonthly, string? DiscountCode = null, decimal? ListPriceMonthly = null,
    string? DocumentName = null, long? DocumentSize = null);

public record PlanLine(ChargeKind Kind, string Month, decimal Amount, DateOnly DueDate, string Note);

/// <summary>Başvuru detayı: form bilgilerinin tamamı + onayda oluşacak ödeme planının önizlemesi</summary>
public record ApplicationDetail(
    ApplicationRow Application, ApplicantInfo Applicant, string? Note, string? RejectReason, DateTime? DecidedAt,
    decimal DueAtRegistration, decimal PeriodTotal, List<PlanLine> Plan);

public static class ApplicationQueries
{
    public static async Task<List<ApplicationRow>> RowsAsync(AppDbContext db, IQueryable<Application> query, CancellationToken ct)
    {
        var apps = await query.ToListAsync(ct);
        var typeIds = apps.Select(a => a.RoomTypeId).Distinct().ToList();
        var roomIds = apps.Where(a => a.PreferredRoomId != null).Select(a => a.PreferredRoomId!.Value).Distinct().ToList();

        var types = await db.RoomTypes.IgnoreQueryFilters().AsNoTracking().Where(x => typeIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
        var rooms = await db.Rooms.IgnoreQueryFilters().AsNoTracking().Include(x => x.Apartment)
            .Where(x => roomIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);

        return apps.Select(a => new ApplicationRow(
            a.Id, a.No, a.Source, a.Status, a.CreatedAt, a.FullName, a.Tc, a.Phone, a.RoomTypeId,
            types.TryGetValue(a.RoomTypeId, out var t) ? t.Name.Tr : "",
            a.PreferredRoomId is { } r && rooms.TryGetValue(r, out var room) ? $"{room.Apartment?.Name} · {room.Name}" : null,
            a.EntryDate, a.PayWindow, a.Term, a.PriceMonthly, a.PriceDeposit, a.EnrollmentId, a.StayPlan, a.PriceSummerMonthly, a.DiscountCodeText, a.ListPriceMonthly, a.DocumentPath is null ? null : a.DocumentName, a.DocumentSize)).ToList();
    }

    /// <summary>Başvurunun dönem sonu: 1. yarı kaydında yarının bitişi, diğerlerinde dönem sonu</summary>
    public static DateOnly PlanEnd(Period period, StayTerm term) =>
        term == StayTerm.First && period.HalfTermFirstEnd is { } firstEnd ? firstEnd : period.EndDate;

    /// <summary>Başvurunun ödeme planı (önizleme ve onay aynı hesabı kullanır): konaklama türüne göre 12 ayda yaz ayları eklenir</summary>
    public static List<ChargeDraft> Plan(Application app, Period period) =>
        PaymentPlan.ForStay(app.StayPlan, app.EntryDate, app.PayWindow, app.PriceMonthly, app.PriceDeposit, PlanEnd(period, app.Term), app.PriceSummerMonthly, period.RentStart);
}

public static class GetApplications
{
    public class Handler(AppDbContext db)
    {
        public async Task<PagedResult<ApplicationRow>> Handle(Guid? periodId, ApplicationStatus? status, string? q, int page, int size, CancellationToken ct)
        {
            var query = db.Applications.AsNoTracking();
            if (periodId is not null) query = query.Where(x => x.PeriodId == periodId);
            if (status is not null) query = query.Where(x => x.Status == status);
            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim();
                query = query.Where(x => x.FullName.Contains(term) || x.Tc.StartsWith(term) || x.Phone.Contains(term) || x.No.Contains(term));
            }

            var total = await query.CountAsync(ct);
            var rows = await ApplicationQueries.RowsAsync(db,
                query.OrderByDescending(x => x.CreatedAt).Skip((page - 1) * size).Take(size), ct);
            return new PagedResult<ApplicationRow>(rows, total, page, size);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/applications", async (Guid? periodId, string? status, string? q, int? page, int? pageSize, Handler handler, CancellationToken ct) =>
            {
                ApplicationStatus? parsed = null;
                if (!string.IsNullOrWhiteSpace(status))
                {
                    if (!QueryParsing.TryParseEnum<ApplicationStatus>(status, out var s)) return Error.Field("status", "status: pending | approved | rejected").ToProblem();
                    parsed = s;
                }
                var (p, size) = Paging.Normalize(page, pageSize, 50, 200);
                return Results.Ok(await handler.Handle(periodId, parsed, q, p, size, ct));
            });
    }
}

public static class GetApplication
{
    public class Handler(AppDbContext db)
    {
        public async Task<Result<ApplicationDetail>> Handle(Guid id, CancellationToken ct)
        {
            var app = await db.Applications.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (app is null) return Error.NotFound("Başvuru bulunamadı.");

            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == app.PeriodId, ct);
            var row = (await ApplicationQueries.RowsAsync(db, db.Applications.AsNoTracking().Where(x => x.Id == id), ct)).Single();
            var plan = ApplicationQueries.Plan(app, period)
                .Select(d => new PlanLine(d.Kind, d.Month, d.Amount, d.DueDate, d.Note)).ToList();

            return new ApplicationDetail(row, app.Applicant, app.Note, app.RejectReason, app.DecidedAt,
                plan.Where(l => l.DueDate == app.EntryDate).Sum(l => l.Amount), plan.Sum(l => l.Amount), plan);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/applications/{id:guid}", async (Guid id, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, ct)).ToOk());
    }
}

/// <summary>Ofiste alınan kayıt: web başvurusuyla AYNI alanlar ve AYNI akış (önce başvuru olur, sonra onaylanır)</summary>
public static class CreateOfficeApplication
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/applications", async (ApplicationInput input, HttpContext http, ApplicationCreateHandler handler, GetApplication.Handler reader, CancellationToken ct) =>
            {
                if (input.PeriodId is null) return Error.Field("periodId", "Dönemi seçin.").ToProblem();
                var created = await handler.Create(input, ApplicationSource.Office, ClientIp.Get(http), ct);
                return created.IsSuccess ? (await reader.Handle(created.Value!.Id, ct)).ToOk() : created.Error!.ToProblem();
            });
    }
}

public static class RejectApplication
{
    public record Command(string? Reason);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result> Handle(Guid id, Guid adminId, Command cmd, CancellationToken ct)
        {
            var app = await db.Applications.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (app is null) return Error.NotFound("Başvuru bulunamadı.");
            if (app.Status != ApplicationStatus.Pending) return Error.Conflict("Yalnızca bekleyen başvuru reddedilebilir.");

            var reason = cmd.Reason?.Trim() ?? "";
            if (reason.Length == 0) return Error.Field("reason", "Ret nedenini yazın.");
            if (reason.Length > 500) return Error.Field("reason", "Ret nedeni en fazla 500 karakter olabilir.");

            // Reddedilen başvuru kodun kullanım hakkını geri verir
            if (app.DiscountCodeId is { } codeId && await db.DiscountCodes.FirstOrDefaultAsync(x => x.Id == codeId, ct) is { } code && code.UsedCount > 0)
                code.UsedCount--;

            app.Status = ApplicationStatus.Rejected;
            app.RejectReason = reason;
            app.DecidedAt = DateTime.UtcNow;
            app.DecidedById = adminId;

            audit.Add("application.reject", "application", app.Id, app.PeriodId, before: new { status = "pending" }, after: new { status = "rejected" }, note: reason);
            await db.SaveChangesAsync(ct);
            return Result.Success();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/applications/{id:guid}/reject", async (Guid id, Command cmd, ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, user.GetUserId(), cmd, ct)).ToNoContent());
    }
}

/// <summary>
/// Onay: öğrenci kimliği (T.C. ile eşleşir ya da yeni açılır; bilgileri başvurudakiyle güncellenir) + kayıt + dönemin TÜM ödeme planı.
/// Öğrencinin portal şifresi yoksa üretilir ve YALNIZCA bu yanıtta döner (initialPassword); öğrenciye WhatsApp/SMS ile iletilir.
/// </summary>
public static class ApproveApplication
{
    public record Response(Guid EnrollmentId, Guid StudentId, string Phone, string? InitialPassword, int Charges);

    public class Handler(AppDbContext db, IPasswordHasher<Student> hasher, AuditWriter audit)
    {
        public async Task<Result<Response>> Handle(Guid id, Guid adminId, CancellationToken ct)
        {
            var app = await db.Applications.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (app is null) return Error.NotFound("Başvuru bulunamadı.");
            if (app.Status != ApplicationStatus.Pending) return Error.Conflict("Yalnızca bekleyen başvuru onaylanabilir.");

            var period = await db.Periods.FirstAsync(x => x.Id == app.PeriodId, ct);
            if (period.Status == PeriodStatus.Closed) return Error.Conflict("Kapalı dönemde başvuru onaylanamaz.");

            var a = app.Applicant;
            var student = await db.Students.Include(x => x.Guardians).FirstOrDefaultAsync(x => x.Tc == a.Tc, ct);

            if (await db.Students.AnyAsync(x => x.Phone == a.Phone && x.Tc != a.Tc, ct))
                return Error.Conflict("Bu telefon numarası başka bir öğrencinin portal girişinde kullanılıyor. Başvurudaki telefonu kontrol edin.");

            if (student is not null && await db.Enrollments.AnyAsync(
                    x => x.PeriodId == app.PeriodId && x.StudentId == student.Id && x.Status != EnrollmentStatus.Cancelled, ct))
                return Error.Conflict("Bu öğrencinin bu dönemde zaten bir kaydı var.");

            await using var tx = await db.Database.BeginTransactionAsync(ct);

            if (student is null)
            {
                student = new Student();
                db.Students.Add(student);
            }
            else
            {
                db.StudentGuardians.RemoveRange(student.Guardians); // soft delete; güncel veliler aşağıda eklenir
                student.Guardians = [];
            }

            student.Tc = a.Tc;
            student.FirstName = a.FirstName;
            student.LastName = a.LastName;
            student.BirthDate = a.BirthDate;
            student.Phone = a.Phone;
            student.Address = a.Address;
            student.ProvinceId = a.ProvinceId;
            student.Province = a.Province;
            student.District = a.District;
            student.School = a.School;
            student.Faculty = a.Faculty;
            student.Department = a.Department;
            student.Grade = a.Grade;
            student.Guardians = a.Guardians.Select((g, i) => new StudentGuardian { StudentId = student.Id, Name = g.Name, Phone = g.Phone, OrderIndex = i }).ToList();

            string? initialPassword = null;
            if (student.PasswordHash is null)
            {
                initialPassword = PasswordGenerator.Create(8);
                student.PasswordHash = hasher.HashPassword(student, initialPassword);
                student.SecurityStamp = Guid.NewGuid();
            }

            var enrollment = new Enrollment
            {
                PeriodId = app.PeriodId,
                StudentId = student.Id,
                ApplicationId = app.Id,
                RoomTypeId = app.RoomTypeId,
                Status = EnrollmentStatus.Approved,
                PayWindow = app.PayWindow,
                Term = app.Term,
                StayPlan = app.StayPlan,
                EntryDate = app.EntryDate,
                MonthlyPrice = app.PriceMonthly,
                DepositPrice = app.PriceDeposit,
                SummerMonthlyPrice = app.PriceSummerMonthly
            };
            db.Enrollments.Add(enrollment);

            var ledger = new EnrollmentLedger(db, enrollment, [], [], []);
            var drafts = ApplicationQueries.Plan(app, period);
            foreach (var d in drafts) ledger.AddCharge(d.Kind, d.Month, d.Amount, d.DueDate, d.Note, adminId);

            app.Status = ApplicationStatus.Approved;
            app.DecidedAt = DateTime.UtcNow;
            app.DecidedById = adminId;
            app.EnrollmentId = enrollment.Id;

            audit.Add("application.approve", "application", app.Id, app.PeriodId,
                before: new { status = "pending" }, after: new { status = "approved", enrollmentId = enrollment.Id, charges = drafts.Count });
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return new Response(enrollment.Id, student.Id, student.Phone, initialPassword, drafts.Count);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/applications/{id:guid}/approve", async (Guid id, ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, user.GetUserId(), ct)).ToOk());
    }
}
