using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Enrollments;

public record StudentRef(Guid Id, string FirstName, string LastName, string Phone, string Tc);

public record RoomRef(Guid PlacementId, Guid RoomId, Guid ApartmentId, string Label, DateOnly Start, DateOnly End);

public record NextItem(Guid Id, ChargeKind Kind, string Month, DateOnly DueDate, decimal Remaining);

/// <summary>Hesap özeti (frontend summarizeEnrollment): kalan, geciken, avans, durum, sıradaki kalem, karşılanan süre</summary>
public record SummaryDto(decimal Charged, decimal Collected, decimal Refunded, decimal Remaining, decimal Overdue, decimal Advance,
    string Status, NextItem? Next, CoveredPeriod Covered)
{
    public static SummaryDto From(EnrollmentSummary s) => new(s.Charged, s.Collected, s.Refunded, s.Remaining, s.Overdue, s.Advance, s.Status,
        s.Next is null ? null : new NextItem(s.Next.Id, s.Next.Kind, s.Next.Month, s.Next.DueDate, s.Next.Remaining), s.Covered);
}

/// <summary>Öğrenciler listesinin satırı: kayıt + öğrenci + oda tipi + güncel oda + hesap özeti</summary>
public record EnrollmentRow(
    Guid Id, Guid PeriodId, EnrollmentStatus Status, DateOnly EntryDate, PayWindow PayWindow, StayTerm Term,
    decimal MonthlyPrice, decimal DepositPrice, DateOnly? EndedAt, string? EndReason,
    StudentRef Student, Guid RoomTypeId, string RoomTypeName, RoomRef? Room, SummaryDto Summary);

/// <summary>Kayıt listeleri ve detayları için ortak okuma (takip yok)</summary>
public class EnrollmentQueryHandler(AppDbContext db, LedgerService ledgers)
{
    /// <summary>Seçili dönem için "bugün": dönem içindeyse bugün, değilse dönemin ilk/son günü</summary>
    public static DateOnly DayIn(Period period)
    {
        var today = TurkeyClock.Today;
        return today < period.StartDate ? period.StartDate : today > period.EndDate ? period.EndDate : today;
    }

    public async Task<List<EnrollmentRow>> RowsAsync(IQueryable<Enrollment> query, DateOnly day, CancellationToken ct)
    {
        var enrollments = await query.AsNoTracking().Include(x => x.Student).Include(x => x.RoomType)
            .IgnoreQueryFilters().Where(x => x.DeletedAt == null)
            .ToListAsync(ct);
        var ids = enrollments.Select(e => e.Id).ToList();

        var placements = await db.Placements.AsNoTracking().Include(x => x.Room).ThenInclude(r => r!.Apartment)
            .IgnoreQueryFilters().Where(x => ids.Contains(x.EnrollmentId) && x.DeletedAt == null)
            .ToListAsync(ct);
        var byEnrollment = placements.ToLookup(p => p.EnrollmentId);

        var summaries = await ledgers.SummariesAsync(ids, TurkeyClock.Today, ct);

        return enrollments.Select(e => new EnrollmentRow(
            e.Id, e.PeriodId, e.Status, e.EntryDate, e.PayWindow, e.Term, e.MonthlyPrice, e.DepositPrice, e.EndedAt, e.EndReason,
            new StudentRef(e.StudentId, e.Student?.FirstName ?? "", e.Student?.LastName ?? "", e.Student?.Phone ?? "", e.Student?.Tc ?? ""),
            e.RoomTypeId, e.RoomType?.Name.Tr ?? "",
            CurrentRoom(byEnrollment[e.Id], day),
            SummaryDto.From(summaries[e.Id]))).ToList();
    }

    /// <summary>Verilen gündeki yerleşim; yoksa en son yerleşim</summary>
    public static RoomRef? CurrentRoom(IEnumerable<Placement> placements, DateOnly day)
    {
        var list = placements.OrderByDescending(p => p.StartDate).ToList();
        var p = list.FirstOrDefault(x => x.StartDate <= day && x.EndDate >= day) ?? list.FirstOrDefault();
        return p is null ? null : ToRef(p);
    }

    public static RoomRef ToRef(Placement p) =>
        new(p.Id, p.RoomId, p.Room?.ApartmentId ?? Guid.Empty, $"{p.Room?.Apartment?.Name} · {p.Room?.Name}", p.StartDate, p.EndDate);
}
