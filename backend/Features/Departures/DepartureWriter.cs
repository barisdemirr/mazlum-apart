using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Messaging;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Departures;

/// <summary>Bir kayıt ve dönemi (öğrenci portalı ve yönetici uçları aynı kuralları buradan kullanır)</summary>
public sealed record DepartureContext(Enrollment Enrollment, Period Period);

/// <summary>Ayrılış düzenleme: boş bırakılan tarih değişmez; Note her zaman yeni değerdir (boş = temizle). ClearReturn / ReturnedOn yalnızca yönetici içindir.</summary>
public sealed record LeaveEdit(DateOnly? LeaveDate, DateOnly? PlannedReturnDate, string? Note, bool ClearReturn = false, DateOnly? ReturnedOn = null);

/// <summary>
/// Çıkış ve geçici ayrılış yazma kuralları. Kayıt, yerleşim, borç ve tahsilata ASLA dokunmaz.
/// Her değişiklik işlem geçmişine (enrollment kaydı üzerine) yazılır; öğrenci bir şey bildirince yöneticilere anlık bildirim gider.
/// Kapalı dönemde, iptal edilmiş ya da ayrılmış kayıtta hiçbir şey değişmez.
/// </summary>
public sealed class DepartureWriter(AppDbContext db, AuditWriter audit, AdminAlerts alerts, ILogger<DepartureWriter> logger)
{
    private const int MaxNote = 500;

    public async Task<Result<DepartureContext>> LoadAsync(Guid enrollmentId, Guid? studentId, CancellationToken ct)
    {
        var enrollment = await db.Enrollments.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == enrollmentId && (studentId == null || x.StudentId == studentId), ct);
        if (enrollment is null) return Error.NotFound("Kayıt bulunamadı.");

        var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == enrollment.PeriodId, ct);
        return new DepartureContext(enrollment, period);
    }

    /// <summary>İşlem yapılabilir mi: kayıt aktif ya da onaylı olmalı, dönem açık olmalı</summary>
    public static Error? CheckWritable(DepartureContext c)
    {
        if (c.Enrollment.Status is not (EnrollmentStatus.Active or EnrollmentStatus.Approved))
            return Error.Conflict("İptal edilmiş ya da ayrılmış kayıt için çıkış / ayrılış işlemi yapılamaz.");
        return PeriodRules.RequireOpen(c.Period, "Çıkış / ayrılış işlemi");
    }

    /// <summary>Kaydın son günü: 12 aylıkta 31 Ağustos, diğerlerinde dönem sonu</summary>
    public static DateOnly LastDay(DepartureContext c) =>
        c.Enrollment.StayPlan == StayPlan.Yearly ? PaymentPlan.SummerEnd(c.Period.EndDate) : c.Period.EndDate;

    // ───────────────────────────── Kesin çıkış ─────────────────────────────

    /// <summary>Çıkış bildirimi. Tarih boşsa bugün. confirm yalnızca yönetici içindir (öğrencinin girdisi her zaman onaysız başlar).</summary>
    public async Task<Result<ExitDto>> ReportExitAsync(DepartureContext c, DateOnly? date, string? note, DepartureActor actor, bool confirm, CancellationToken ct)
    {
        if (CheckWritable(c) is { } blocked) return blocked;

        var exitDate = date ?? TurkeyClock.Today;
        var cleanNote = CleanNote(note);
        if (ValidateExit(c, exitDate, cleanNote, actor) is { } invalid) return invalid;

        if (await db.EnrollmentExits.AnyAsync(x => x.EnrollmentId == c.Enrollment.Id, ct))
            return Error.Conflict("Bu kayıt için çıkış bildirimi zaten var.");

        var exit = new EnrollmentExit
        {
            PeriodId = c.Period.Id,
            EnrollmentId = c.Enrollment.Id,
            ExitDate = exitDate,
            Note = cleanNote,
            ReportedByType = actor.Type,
            ReportedById = actor.Id,
            ReportedByName = actor.Name
        };
        if (confirm && !actor.IsStudent) MarkConfirmed(exit, actor);

        db.EnrollmentExits.Add(exit);
        audit.Add("exit.report", "enrollment", c.Enrollment.Id, c.Period.Id, after: new { exitDate, note = cleanNote, confirmed = exit.ConfirmedAt is not null });
        if (await SaveAsync(ct) is { } failed) return failed;

        Notify(actor, "Çıkış bildirimi", $"{actor.Name} odasını boşalttığını bildirdi ({Day(exitDate)}).", "exit", exit.Id);
        return ExitDto.From(exit);
    }

    /// <summary>Çıkış tarihini / notunu düzeltir. Onaylanmış çıkış değişmez: önce onay geri alınır.</summary>
    public async Task<Result<ExitDto>> UpdateExitAsync(DepartureContext c, DateOnly? date, string? note, DepartureActor actor, CancellationToken ct)
    {
        if (CheckWritable(c) is { } blocked) return blocked;

        var exit = await db.EnrollmentExits.FirstOrDefaultAsync(x => x.EnrollmentId == c.Enrollment.Id, ct);
        if (exit is null) return Error.NotFound("Çıkış bildirimi bulunamadı.");
        if (exit.ConfirmedAt is not null) return Error.Conflict("Onaylanmış çıkış değiştirilemez. Önce onayı geri alın.");

        var exitDate = date ?? exit.ExitDate;
        var cleanNote = CleanNote(note);
        if (ValidateExit(c, exitDate, cleanNote, actor) is { } invalid) return invalid;

        var before = new { exit.ExitDate, exit.Note };
        exit.ExitDate = exitDate;
        exit.Note = cleanNote;

        audit.Add("exit.update", "enrollment", c.Enrollment.Id, c.Period.Id, before: before, after: new { exitDate, note = cleanNote });
        if (await SaveAsync(ct) is { } failed) return failed;

        Notify(actor, "Çıkış bildirimi güncellendi", $"{actor.Name} çıkış tarihini güncelledi ({Day(exitDate)}).", "exit", exit.Id);
        return ExitDto.From(exit);
    }

    /// <summary>Yönetici: çıkışı onaylar ya da onayı geri alır</summary>
    public async Task<Result<ExitDto>> SetConfirmedAsync(DepartureContext c, bool confirmed, DepartureActor actor, CancellationToken ct)
    {
        if (CheckWritable(c) is { } blocked) return blocked;

        var exit = await db.EnrollmentExits.FirstOrDefaultAsync(x => x.EnrollmentId == c.Enrollment.Id, ct);
        if (exit is null) return Error.NotFound("Çıkış bildirimi bulunamadı.");
        if ((exit.ConfirmedAt is not null) == confirmed) return Error.Conflict(confirmed ? "Çıkış zaten onaylı." : "Çıkış zaten onaylı değil.");

        if (confirmed)
        {
            MarkConfirmed(exit, actor);
        }
        else
        {
            exit.ConfirmedAt = null;
            exit.ConfirmedById = null;
            exit.ConfirmedByName = null;
        }

        audit.Add(confirmed ? "exit.confirm" : "exit.unconfirm", "enrollment", c.Enrollment.Id, c.Period.Id, after: new { exit.ExitDate });
        if (await SaveAsync(ct) is { } failed) return failed;
        return ExitDto.From(exit);
    }

    /// <summary>Bildirimi geri alır / siler (soft delete: işlem geçmişinde kalır). Öğrenci yalnızca onaylanmamış bildirimini geri alabilir.</summary>
    public async Task<Result> DeleteExitAsync(DepartureContext c, DepartureActor actor, CancellationToken ct)
    {
        if (CheckWritable(c) is { } blocked) return blocked;

        var exit = await db.EnrollmentExits.FirstOrDefaultAsync(x => x.EnrollmentId == c.Enrollment.Id, ct);
        if (exit is null) return Error.NotFound("Çıkış bildirimi bulunamadı.");
        if (actor.IsStudent && exit.ConfirmedAt is not null)
            return Error.Conflict("Onaylanmış çıkış geri alınamaz. Lütfen yönetimle iletişime geçin.");

        db.EnrollmentExits.Remove(exit);
        audit.Add("exit.delete", "enrollment", c.Enrollment.Id, c.Period.Id, before: new { exit.ExitDate, exit.Note, confirmed = exit.ConfirmedAt is not null });
        if (await SaveAsync(ct) is { } failed) return failed;

        Notify(actor, "Çıkış bildirimi geri alındı", $"{actor.Name} çıkış bildirimini geri aldı.", "exit", exit.Id);
        return Result.Success();
    }

    // ───────────────────────────── Geçici ayrılış ─────────────────────────────

    public async Task<Result<LeaveDto>> CreateLeaveAsync(DepartureContext c, DateOnly leaveDate, DateOnly plannedReturn, string? note, DepartureActor actor, CancellationToken ct)
    {
        if (CheckWritable(c) is { } blocked) return blocked;

        var cleanNote = CleanNote(note);
        if (ValidateLeave(c, leaveDate, plannedReturn, cleanNote, actor, backdateCheck: true) is { } invalid) return invalid;

        if (await db.EnrollmentExits.AnyAsync(x => x.EnrollmentId == c.Enrollment.Id, ct))
            return Error.Conflict("Çıkış bildirimi bulunan kayıt için geçici ayrılış eklenemez. Önce çıkış bildirimini geri alın.");
        if (await OverlapsAsync(c.Enrollment.Id, leaveDate, plannedReturn, null, ct))
            return Error.Conflict("Bu tarihlerde zaten bir geçici ayrılış var.");

        var leave = new TemporaryLeave
        {
            PeriodId = c.Period.Id,
            EnrollmentId = c.Enrollment.Id,
            LeaveDate = leaveDate,
            PlannedReturnDate = plannedReturn,
            Note = cleanNote,
            ReportedByType = actor.Type,
            ReportedById = actor.Id,
            ReportedByName = actor.Name
        };
        db.TemporaryLeaves.Add(leave);
        audit.Add("leave.create", "enrollment", c.Enrollment.Id, c.Period.Id, after: new { leaveDate, plannedReturn, note = cleanNote });
        if (await SaveAsync(ct) is { } failed) return failed;

        Notify(actor, "Geçici ayrılış bildirimi", $"{actor.Name} {Day(leaveDate)} tarihinde ayrılıp {Day(plannedReturn)} tarihinde döneceğini bildirdi.", "leave", leave.Id);
        return LeaveDto.From(leave, TurkeyClock.Today, TurkeyClock.Today);
    }

    /// <summary>
    /// Ayrılışı düzeltir. Öğrenci: dönüşü bildirilmemiş ayrılışın planlanan dönüşünü ve notunu günceller; başlangıç tarihini yalnızca henüz başlamamışsa değiştirir.
    /// Yönetici hepsini değiştirebilir, dönüş gününü girebilir ya da dönüşü geri alabilir.
    /// </summary>
    public async Task<Result<LeaveDto>> UpdateLeaveAsync(Guid leaveId, Guid? studentId, LeaveEdit edit, DepartureActor actor, CancellationToken ct)
    {
        var loaded = await LoadLeaveAsync(leaveId, studentId, ct);
        if (!loaded.IsSuccess) return loaded.Error!;
        var (leave, c) = loaded.Value!;
        if (CheckWritable(c) is { } blocked) return blocked;

        var today = TurkeyClock.Today;
        var leaveDate = edit.LeaveDate ?? leave.LeaveDate;
        var planned = edit.PlannedReturnDate ?? leave.PlannedReturnDate;
        var returned = leave.ReturnedOn;

        if (actor.IsStudent)
        {
            if (leave.ReturnedOn is not null) return Error.Conflict("Dönüşü bildirilmiş ayrılış değiştirilemez.");
            if (leaveDate != leave.LeaveDate && leave.LeaveDate <= today)
                return Error.Conflict("Başlamış ayrılışın başlangıç tarihi değiştirilemez; yalnızca planlanan dönüş tarihi güncellenebilir.");
        }
        else
        {
            if (edit.ClearReturn) returned = null;
            else if (edit.ReturnedOn is { } r) returned = r;
        }

        var cleanNote = CleanNote(edit.Note);
        if (ValidateLeave(c, leaveDate, planned, cleanNote, actor, backdateCheck: leaveDate != leave.LeaveDate) is { } invalid) return invalid;

        var v = new Validator()
            .Must("returnedOn", returned is null || returned >= leaveDate, "Dönüş günü ayrılış tarihinden önce olamaz.")
            .Must("returnedOn", returned is null || returned <= today, "Dönüş günü bugünden sonra olamaz.");
        if (!v.IsValid) return v.ToFailure<LeaveDto>();

        if (await OverlapsAsync(leave.EnrollmentId, leaveDate, returned ?? planned, leave.Id, ct))
            return Error.Conflict("Bu tarihlerde başka bir geçici ayrılış var.");

        var before = new { leave.LeaveDate, leave.PlannedReturnDate, leave.ReturnedOn, leave.Note };
        leave.LeaveDate = leaveDate;
        leave.PlannedReturnDate = planned;
        leave.ReturnedOn = returned;
        leave.Note = cleanNote;

        audit.Add("leave.update", "enrollment", c.Enrollment.Id, c.Period.Id, before: before, after: new { leaveDate, plannedReturn = planned, returnedOn = returned, note = cleanNote });
        if (await SaveAsync(ct) is { } failed) return failed;

        Notify(actor, "Geçici ayrılış güncellendi", $"{actor.Name} planlanan dönüş tarihini {Day(planned)} olarak güncelledi.", "leave", leave.Id);
        return LeaveDto.From(leave, today, today);
    }

    /// <summary>"Döndü": dönüş günü kaydedilir. Öğrenci için her zaman bugündür; yönetici geçmiş bir gün girebilir.</summary>
    public async Task<Result<LeaveDto>> MarkReturnedAsync(Guid leaveId, Guid? studentId, DateOnly? date, DepartureActor actor, CancellationToken ct)
    {
        var loaded = await LoadLeaveAsync(leaveId, studentId, ct);
        if (!loaded.IsSuccess) return loaded.Error!;
        var (leave, c) = loaded.Value!;
        if (CheckWritable(c) is { } blocked) return blocked;

        var today = TurkeyClock.Today;
        if (leave.ReturnedOn is not null) return Error.Conflict("Dönüş zaten bildirilmiş.");
        if (leave.LeaveDate > today) return Error.Conflict("Ayrılış henüz başlamadı. Vazgeçtiyseniz ayrılışı iptal edin.");

        var returned = actor.IsStudent ? today : date ?? today;
        var v = new Validator()
            .Must("returnedOn", returned >= leave.LeaveDate, "Dönüş günü ayrılış tarihinden önce olamaz.")
            .Must("returnedOn", returned <= today, "Dönüş günü bugünden sonra olamaz.");
        if (!v.IsValid) return v.ToFailure<LeaveDto>();

        leave.ReturnedOn = returned;
        audit.Add("leave.return", "enrollment", c.Enrollment.Id, c.Period.Id, after: new { leave.LeaveDate, leave.PlannedReturnDate, returnedOn = returned });
        if (await SaveAsync(ct) is { } failed) return failed;

        Notify(actor, "Dönüş bildirimi", $"{actor.Name} odasına döndüğünü bildirdi.", "return", leave.Id);
        return LeaveDto.From(leave, today, today);
    }

    /// <summary>Ayrılışı siler (soft delete). Öğrenci yalnızca henüz başlamamış ayrılışı iptal edebilir.</summary>
    public async Task<Result> DeleteLeaveAsync(Guid leaveId, Guid? studentId, DepartureActor actor, CancellationToken ct)
    {
        var loaded = await LoadLeaveAsync(leaveId, studentId, ct);
        if (!loaded.IsSuccess) return loaded.Error!;
        var (leave, c) = loaded.Value!;
        if (CheckWritable(c) is { } blocked) return blocked;

        if (actor.IsStudent && (leave.ReturnedOn is not null || leave.LeaveDate <= TurkeyClock.Today))
            return Error.Conflict("Başlamış ayrılış iptal edilemez. Döndüyseniz “Dönüş Yaptım”ı kullanın.");

        db.TemporaryLeaves.Remove(leave);
        audit.Add("leave.delete", "enrollment", c.Enrollment.Id, c.Period.Id, before: new { leave.LeaveDate, leave.PlannedReturnDate, leave.ReturnedOn, leave.Note });
        if (await SaveAsync(ct) is { } failed) return failed;

        Notify(actor, "Geçici ayrılış iptal edildi", $"{actor.Name} geçici ayrılış bildirimini iptal etti.", "leave", leave.Id);
        return Result.Success();
    }

    // ───────────────────────────── Yardımcılar ─────────────────────────────

    private async Task<Result<(TemporaryLeave Leave, DepartureContext Context)>> LoadLeaveAsync(Guid leaveId, Guid? studentId, CancellationToken ct)
    {
        var leave = await db.TemporaryLeaves.FirstOrDefaultAsync(x => x.Id == leaveId, ct);
        if (leave is null) return Error.NotFound("Geçici ayrılış bulunamadı.");

        // Öğrenci için sahiplik burada denetlenir: başkasının ayrılışı "bulunamadı" döner
        var context = await LoadAsync(leave.EnrollmentId, studentId, ct);
        if (!context.IsSuccess) return Error.NotFound("Geçici ayrılış bulunamadı.");
        return (leave, context.Value!);
    }

    private static Error? ValidateExit(DepartureContext c, DateOnly date, string? note, DepartureActor actor)
    {
        var v = new Validator()
            .MaxLength("note", note, MaxNote)
            .Must("exitDate", date >= c.Enrollment.EntryDate, "Çıkış tarihi giriş tarihinden önce olamaz.")
            .Must("exitDate", actor.IsStudent ? date <= TurkeyClock.Today : date <= LastDay(c).AddDays(30),
                actor.IsStudent ? "Çıkış tarihi bugünden sonra olamaz. Odanızı boşalttığınızda bildirin." : "Çıkış tarihi dönem sonundan çok ileride olamaz.");
        return v.IsValid ? null : v.ToFailure().Error;
    }

    private static Error? ValidateLeave(DepartureContext c, DateOnly leaveDate, DateOnly plannedReturn, string? note, DepartureActor actor, bool backdateCheck)
    {
        var v = new Validator()
            .MaxLength("note", note, MaxNote)
            .Must("leaveDate", leaveDate >= c.Enrollment.EntryDate, "Ayrılış tarihi giriş tarihinden önce olamaz.")
            .Must("leaveDate", !(actor.IsStudent && backdateCheck) || leaveDate >= TurkeyClock.Today.AddDays(-7), "Ayrılış tarihi en fazla 7 gün geriye alınabilir.")
            .Must("plannedReturnDate", plannedReturn > leaveDate, "Planlanan dönüş, ayrılış tarihinden sonra olmalı.")
            .Must("plannedReturnDate", plannedReturn <= LastDay(c), "Planlanan dönüş kayıt süresinin dışında.");
        return v.IsValid ? null : v.ToFailure().Error;
    }

    /// <summary>İki ayrılış çakışır mı: aralıklar [ayrılış, dönüş) şeklindedir</summary>
    private async Task<bool> OverlapsAsync(Guid enrollmentId, DateOnly start, DateOnly end, Guid? exceptId, CancellationToken ct)
    {
        var others = await db.TemporaryLeaves.AsNoTracking().Where(x => x.EnrollmentId == enrollmentId).ToListAsync(ct);
        return others.Any(o => o.Id != exceptId && start < (o.ReturnedOn ?? o.PlannedReturnDate) && o.LeaveDate < end);
    }

    private static void MarkConfirmed(EnrollmentExit exit, DepartureActor actor)
    {
        exit.ConfirmedAt = DateTime.UtcNow;
        exit.ConfirmedById = actor.Id;
        exit.ConfirmedByName = actor.Name;
    }

    private static string? CleanNote(string? note) => string.IsNullOrWhiteSpace(note) ? null : note.Trim();

    private static string Day(DateOnly date) => date.ToString("dd.MM.yyyy");

    /// <summary>Öğrenci bir şey bildirince yöneticilere anlık bildirim gider (yönetici kendi işlemi için bildirim almaz)</summary>
    private void Notify(DepartureActor actor, string title, string body, string kind, Guid id)
    {
        if (actor.IsStudent) alerts.Enqueue(new PushPayload(title, body, "/admin/yerlesim", $"departure-{kind}-{id:N}"));
    }

    private async Task<Error?> SaveAsync(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
            return null;
        }
        catch (DbUpdateException ex)
        {
            // Çoğunlukla aynı anda iki bildirim (benzersiz dizin) ya da kayıt arada değişmiş
            logger.LogWarning(ex, "Çıkış / ayrılış kaydı yazılamadı.");
            db.ChangeTracker.Clear();
            return Error.Conflict("İşlem aynı anda başka bir değişiklikle çakıştı. Sayfayı yenileyip tekrar deneyin.");
        }
    }
}
