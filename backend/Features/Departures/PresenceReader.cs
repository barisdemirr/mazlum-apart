using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.Presence;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Departures;

public record ExitDto(Guid Id, DateOnly ExitDate, DateTime ReportedAt, ActorType ReportedBy, string ReportedByName, string? Note,
    bool Confirmed, DateTime? ConfirmedAt, string? ConfirmedByName)
{
    public static ExitDto From(EnrollmentExit x) =>
        new(x.Id, x.ExitDate, x.CreatedAt, x.ReportedByType, x.ReportedByName, x.Note, x.ConfirmedAt is not null, x.ConfirmedAt, x.ConfirmedByName);
}

/// <summary>
/// Away: bakılan günde ayrılışta mı · Started: ayrılış tarihi geldi mi · Overdue: dönüşü gecikti mi
/// ReturnInDays: dönüş bildirilmemişse bugünden planlanan dönüşe gün sayısı (eksi = geciken gün sayısı)
/// </summary>
public record LeaveDto(Guid Id, DateOnly LeaveDate, DateOnly PlannedReturnDate, DateOnly? ReturnedOn, string? Note,
    ActorType ReportedBy, string ReportedByName, DateTime ReportedAt, bool Away, bool Started, bool Overdue, int? ReturnInDays)
{
    public static LeaveDto From(TemporaryLeave x, DateOnly day, DateOnly today)
    {
        var fact = new LeaveFact(x.LeaveDate, x.PlannedReturnDate, x.ReturnedOn);
        return new LeaveDto(x.Id, x.LeaveDate, x.PlannedReturnDate, x.ReturnedOn, x.Note, x.ReportedByType, x.ReportedByName, x.CreatedAt,
            PresenceMath.IsAway(fact, day, today), x.LeaveDate <= today, PresenceMath.IsOverdue(fact, today),
            x.ReturnedOn is null ? x.PlannedReturnDate.DayNumber - today.DayNumber : null);
    }
}

/// <summary>Doluluk ekranında öğrencinin satırı: durum + (varsa) çıkış kaydı + ilgili geçici ayrılış</summary>
public record OccupantPresence(StayState State, ExitDto? Exit, LeaveDto? Leave);

/// <summary>Doluluk ekranında dairenin kartı. Readiness yalnızca State = fully_vacated iken anlamlıdır (boşsa işaretlenmemiş).</summary>
public record ApartmentPresence(ApartmentPresenceState State, int Occupants, int Gone, ApartmentReadiness? Readiness, string? ReadinessNote, bool BoilerOn);

/// <summary>Bir kaydın çıkış + geçici ayrılış bilgisinin tamamı (öğrenci detayı ve öğrenci portalı)</summary>
public record DepartureSummary(Guid EnrollmentId, StayState State, ExitDto? Exit, List<LeaveDto> Leaves);

/// <summary>İşlemi yapan: öğrenci ya da yönetici (işlem geçmişi ve "kim girdi" alanları için)</summary>
public record DepartureActor(ActorType Type, Guid Id, string Name)
{
    public bool IsStudent => Type == ActorType.Student;

    public static DepartureActor From(ClaimsPrincipal user) =>
        new(user.IsStudent() ? ActorType.Student : ActorType.Admin, user.GetUserId(), user.GetDisplayName());
}

/// <summary>Çıkış ve geçici ayrılış kayıtlarından seçilen günün durumunu okur (saklanmış durum yoktur, her seferinde hesaplanır)</summary>
public sealed class PresenceReader(AppDbContext db)
{
    public async Task<Dictionary<Guid, OccupantPresence>> ForEnrollmentsAsync(IReadOnlyCollection<Guid> enrollmentIds, DateOnly day, CancellationToken ct)
    {
        var result = new Dictionary<Guid, OccupantPresence>();
        if (enrollmentIds.Count == 0) return result;

        var today = TurkeyClock.Today;
        var exits = (await db.EnrollmentExits.AsNoTracking().Where(x => enrollmentIds.Contains(x.EnrollmentId)).ToListAsync(ct))
            .ToDictionary(x => x.EnrollmentId);
        var leaves = (await db.TemporaryLeaves.AsNoTracking().Where(x => enrollmentIds.Contains(x.EnrollmentId)).ToListAsync(ct))
            .ToLookup(x => x.EnrollmentId);

        foreach (var id in enrollmentIds)
        {
            exits.TryGetValue(id, out var exit);
            result[id] = Build(exit, leaves[id].ToList(), day, today);
        }
        return result;
    }

    /// <summary>Tek kaydın tüm çıkış / ayrılış bilgisi (bugüne göre)</summary>
    public async Task<DepartureSummary> SummaryAsync(Guid enrollmentId, CancellationToken ct)
    {
        var today = TurkeyClock.Today;
        var exit = await db.EnrollmentExits.AsNoTracking().FirstOrDefaultAsync(x => x.EnrollmentId == enrollmentId, ct);
        var leaves = await db.TemporaryLeaves.AsNoTracking().Where(x => x.EnrollmentId == enrollmentId)
            .OrderByDescending(x => x.LeaveDate).ToListAsync(ct);

        var state = PresenceMath.StateOf(ExitFactOf(exit), leaves.Select(LeaveFactOf), today, today);
        return new DepartureSummary(enrollmentId, state, exit is null ? null : ExitDto.From(exit), leaves.Select(l => LeaveDto.From(l, today, today)).ToList());
    }

    /// <summary>Tüm dairelerin işaretli durumu (daire sayısı azdır, tek sorguda okunur)</summary>
    public async Task<Dictionary<Guid, ApartmentStatus>> StatusesAsync(CancellationToken ct) =>
        (await db.ApartmentStatuses.AsNoTracking().ToListAsync(ct)).ToDictionary(x => x.ApartmentId);

    /// <summary>Dairenin kartı: öğrencilerin durumundan daire durumu + işaretli hazırlık ve kombi</summary>
    public static ApartmentPresence ApartmentOf(IReadOnlyCollection<OccupantPresence> occupants, ApartmentStatus? status)
    {
        var state = PresenceMath.ApartmentStateOf(occupants.Select(o => o.State).ToList());
        var lastConfirmed = occupants.Where(o => o.State == StayState.ExitConfirmed).Select(o => o.Exit?.ConfirmedAt).Max();
        var readiness = PresenceMath.EffectiveReadiness(status?.Readiness, status?.ReadinessSetAt, lastConfirmed);
        return new ApartmentPresence(state, occupants.Count, occupants.Count(o => o.State != StayState.Active),
            readiness, readiness is null ? null : status?.Note, status?.BoilerOn ?? true);
    }

    public static ExitFact? ExitFactOf(EnrollmentExit? x) => x is null ? null : new ExitFact(x.ExitDate, x.ConfirmedAt is not null);

    public static LeaveFact LeaveFactOf(TemporaryLeave x) => new(x.LeaveDate, x.PlannedReturnDate, x.ReturnedOn);

    private static OccupantPresence Build(EnrollmentExit? exit, List<TemporaryLeave> leaves, DateOnly day, DateOnly today)
    {
        var state = PresenceMath.StateOf(ExitFactOf(exit), leaves.Select(LeaveFactOf), day, today);

        // Gösterilecek ayrılış: o gün ayrılışta olan; yoksa başlamamış en yakın ayrılış (dönüşü yaklaşan / planlanmış)
        var leave = leaves.FirstOrDefault(l => PresenceMath.IsAway(LeaveFactOf(l), day, today))
                    ?? leaves.Where(l => l.ReturnedOn is null && l.LeaveDate > day).OrderBy(l => l.LeaveDate).FirstOrDefault();

        return new OccupantPresence(state, exit is null ? null : ExitDto.From(exit), leave is null ? null : LeaveDto.From(leave, day, today));
    }
}
