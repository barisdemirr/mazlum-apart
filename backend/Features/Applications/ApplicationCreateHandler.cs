using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Applications;

/// <summary>
/// Başvuru oluşturma (web + ofis ortak). Kurallar (frontend registration.js createApplication ile aynı):
///  - Dönem açık ve başvuruya açık olmalı; oda tipinin bu dönemde fiyatı olmalı (fiyat başvuruya kopyalanır).
///  - Giriş tarihi dönemin (yarım dönemde ilgili yarının) içinde; web formunda geçmiş tarih seçilemez.
///  - Yarım dönem yalnızca dönem ayarından açıldıysa seçilebilir.
///  - Aynı dönemde aynı T.C. ile reddedilmemiş ikinci başvuru olamaz.
///  - Seçilen yatak (bedId) hâlâ boş olmalı; doluysa 409 ve form yeniden seçtirir.
/// </summary>
public class ApplicationCreateHandler(AppDbContext db, AvailabilityService availability, NumberGenerator numbers, AuditWriter audit)
{
    public record Created(Guid Id, string ApplicationNo);

    public async Task<Result<Created>> Create(ApplicationInput input, ApplicationSource source, string? ip, CancellationToken ct)
    {
        // ---- dönem ----
        Period? period = source == ApplicationSource.Office && input.PeriodId is { } pid
            ? await db.Periods.FirstOrDefaultAsync(x => x.Id == pid, ct)
            : await db.Periods.Where(x => x.Status == PeriodStatus.Active && x.ApplicationsOpen)
                .OrderBy(x => x.Type == PeriodType.Academic ? 0 : 1).ThenByDescending(x => x.StartDate)
                .FirstOrDefaultAsync(ct);

        if (period is null) return Error.Conflict("Şu an başvuruya açık bir dönem yok.");
        if (period.Status == PeriodStatus.Closed) return Error.Conflict("Kapalı dönemde yeni başvuru alınamaz.");
        if (!period.ApplicationsOpen) return Error.Conflict("Bu dönem başvuruya kapalı.");

        var v = new Validator();
        var applicant = ApplicantRules.Normalize(input, v);

        // ---- oda tipi ----
        RoomType? roomType = input.RoomTypeId is { } rtId
            ? await db.RoomTypes.FirstOrDefaultAsync(x => x.Id == rtId, ct)
            : string.IsNullOrWhiteSpace(input.RoomSlug) ? null : await db.RoomTypes.FirstOrDefaultAsync(x => x.Slug == input.RoomSlug, ct);
        if (roomType is null || (source == ApplicationSource.Online && !roomType.IsActive))
            v.AddError("roomSlug", "Oda tipini seçin.");

        var term = ApplicantRules.ParseTerm(input.Term);
        var window = ApplicantRules.ParsePayWindow(input.PayWindow ?? input.PayDay);
        v.Must("term", term is not null, "Kayıt süresi geçersiz.")
         .Must("payDay", window is not null, "Ödeme gününü seçin.")
         .Must("entryDate", input.EntryDate is not null, "Giriş tarihini seçin.");

        // ---- yarım dönem ve giriş tarihi ----
        if (term is StayTerm.First or StayTerm.Second &&
            (!period.HalfTermEnabled || period.HalfTermFirstEnd is null || period.HalfTermSecondStart is null))
            v.AddError("term", "Bu dönemde yarım dönem kaydı kapalı.");

        if (input.EntryDate is { } entry && term is not null && v.IsValid)
        {
            var (rangeStart, rangeEnd) = term switch
            {
                StayTerm.First => (period.StartDate, period.HalfTermFirstEnd!.Value),
                StayTerm.Second => (period.HalfTermSecondStart!.Value, period.EndDate),
                _ => (period.StartDate, period.EndDate)
            };
            if (source == ApplicationSource.Online && TurkeyClock.Today > rangeStart) rangeStart = TurkeyClock.Today;
            v.Must("entryDate", entry >= rangeStart && entry <= rangeEnd, $"Giriş tarihi {rangeStart:dd.MM.yyyy} – {rangeEnd:dd.MM.yyyy} arasında olmalı.");
        }

        if (!v.IsValid) return v.ToFailure<Created>();

        var price = await db.RoomTypePrices.FirstOrDefaultAsync(x => x.PeriodId == period.Id && x.RoomTypeId == roomType!.Id, ct);
        if (price is null) return Error.Conflict("Bu oda tipi için bu dönemde fiyat tanımlı değil.");

        if (await db.Applications.AnyAsync(x => x.PeriodId == period.Id && x.Tc == applicant!.Tc && x.Status != ApplicationStatus.Rejected, ct))
            return Error.Conflict("Bu T.C. kimlik no ile bu dönemde zaten bir başvuru ya da kayıt var.");

        // ---- seçilen yatak (oda tercihi) ----
        Guid? preferredRoom = null;
        if (!string.IsNullOrWhiteSpace(input.BedId))
        {
            var roomId = ParseRoomId(input.BedId);
            var room = roomId is null ? null : await db.Rooms.Include(x => x.Apartment).FirstOrDefaultAsync(x => x.Id == roomId, ct);
            if (room is null || room.RoomTypeId != roomType!.Id || room.Status != RoomStatus.Active || room.Apartment?.IsPublished != true)
                return Error.Field("bedId", "Seçilen yatak bulunamadı. Lütfen yeniden seçin.");

            var counts = (await availability.GetRoomCountsAsync(period.Id, [room.Id], ct))[room.Id];
            if (counts.Occupied + counts.Reserved >= room.Beds)
                return Error.Conflict("Seçtiğiniz yatak artık boş değil. Lütfen başka bir yatak seçin ya da “Yatak fark etmez” ile başvurun.");
            preferredRoom = room.Id;
        }

        var year = TurkeyClock.Today.Year;
        var number = await numbers.NextAsync(NumberGenerator.ApplicationKey(year), ct);
        var application = new Application
        {
            No = $"MA-{year}-{number:D4}",
            PeriodId = period.Id,
            Source = source,
            Applicant = applicant!,
            Tc = applicant!.Tc,
            Phone = applicant.Phone,
            FullName = $"{applicant.FirstName} {applicant.LastName}",
            RoomTypeId = roomType!.Id,
            PreferredRoomId = preferredRoom,
            Term = term!.Value,
            EntryDate = input.EntryDate!.Value,
            PayWindow = window!.Value,
            PriceMonthly = price.Monthly,
            PriceDeposit = price.Deposit,
            Note = string.IsNullOrWhiteSpace(input.Note) ? null : input.Note.Trim()[..Math.Min(input.Note.Trim().Length, 1000)],
            Ip = ip
        };

        db.Applications.Add(application);
        audit.Add("application.create", "application", application.Id, period.Id, after: new { application.No, source });
        await db.SaveChangesAsync(ct);

        return new Created(application.Id, application.No);
    }

    /// <summary>Yatak kimliği "{odaId}-{sıra}" biçimindedir (CatalogQueryHandler); oda kimliği çıkarılır</summary>
    private static Guid? ParseRoomId(string bedId)
    {
        var dash = bedId.LastIndexOf('-');
        return dash > 0 && Guid.TryParse(bedId[..dash], out var id) ? id : null;
    }
}
