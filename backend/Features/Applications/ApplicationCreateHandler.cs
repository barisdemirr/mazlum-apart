using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Features.DiscountCodes;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Messaging;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Applications;

/// <summary>
/// Başvuru oluşturma (web + ofis ortak). Kurallar (frontend registration.js createApplication ile aynı):
///  - Dönem açık ve başvuruya açık olmalı; oda tipinin bu dönemde fiyatı olmalı (fiyat başvuruya kopyalanır).
///  - Giriş tarihi dönemin (yarım dönemde ilgili yarının) içinde; web formunda geçmiş tarih seçilemez.
///    9 aylık dönemde (Eylül kirası alınmayan) giriş en erken Ekim'den başlar.
///  - Yarım dönem yalnızca dönem ayarından açıldıysa seçilebilir.
///  - Aynı dönemde aynı T.C. ile reddedilmemiş ikinci başvuru olamaz.
///  - Seçilen yatak (bedId) hâlâ boş olmalı; doluysa 409 ve form yeniden seçtirir.
///  - Web başvurusunda öğrenci belgesi (PDF) zorunludur; içerik DocumentStorage'da doğrulanır ve özel alana yazılır.
///  - İndirim kodu verildiyse geçerli (aktif, süresi dolmamış, hakkı kalmış, varsa T.C.'ye özel) olmalı; indirimli fiyat başvuruya yazılır.
///  - Konaklama türü: academic / yearly → açık AKADEMİK dönem; summer → açık YAZ dönemi (ikisi aynı anda açık olabilir).
///    12 ay yalnızca tam dönem ve oda tipinin yaz fiyatı tanımlıysa alınır; sadece yaz başvurusunda yatak tercihi alınmaz
///    (sitedeki yatak seçimi akademik dönemin doluluğunu gösterir).
/// </summary>
public class ApplicationCreateHandler(AppDbContext db, AvailabilityService availability, NumberGenerator numbers, AdminAlerts alerts, AuditWriter audit, DocumentStorage documents)
{
    public record Created(Guid Id, string ApplicationNo);

    /// <param name="document">Öğrenci belgesi (PDF). Web başvurusunda ZORUNLU; ofis kaydında isteğe bağlı (sonradan panelden eklenebilir).</param>
    public async Task<Result<Created>> Create(ApplicationInput input, ApplicationSource source, string? ip, CancellationToken ct, IFormFile? document = null)
    {
        try
        {
            return await CreateCore(input, source, ip, ct, document);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            ex.Data["stage"] = stage; // uç nokta hata yanıtına yalnızca aşama + hata türü yazar (ayrıntı sızdırmaz)
            throw;
        }
    }

    private string stage = "start";

    private async Task<Result<Created>> CreateCore(ApplicationInput input, ApplicationSource source, string? ip, CancellationToken ct, IFormFile? document)
    {
        stage = "period";
        var (planValid, requestedPlan) = ApplicantRules.ParseStayPlan(input.StayPlan);
        if (!planValid) return Error.Field("stayPlan", "Konaklama türü geçersiz.");

        // ---- dönem ----
        Period? period;
        if (source == ApplicationSource.Office && input.PeriodId is { } pid)
        {
            period = await db.Periods.FirstOrDefaultAsync(x => x.Id == pid, ct);
        }
        else
        {
            var open = await db.Periods.Where(x => x.Status == PeriodStatus.Active && x.ApplicationsOpen)
                .OrderByDescending(x => x.StartDate).ToListAsync(ct);
            var wantsSummer = requestedPlan == StayPlan.Summer || (requestedPlan is null && open.All(p => p.Type != PeriodType.Academic));
            period = open.FirstOrDefault(p => p.Type == (wantsSummer ? PeriodType.Summer : PeriodType.Academic));
            if (period is null)
                return Error.Conflict(wantsSummer ? "Yaz dönemi kayıtları şu an kapalı." : "Şu an başvuruya açık bir dönem yok.");
        }

        if (period is null) return Error.Conflict("Şu an başvuruya açık bir dönem yok.");
        if (period.Status == PeriodStatus.Closed) return Error.Conflict("Kapalı dönemde yeni başvuru alınamaz.");
        if (!period.ApplicationsOpen) return Error.Conflict("Bu dönem başvuruya kapalı.");

        // Konaklama türü dönemin türüyle uyumlu olmalı: yaz döneminde yalnızca "sadece yaz", akademik dönemde akademik ya da 12 ay
        var stayPlan = requestedPlan ?? (period.Type == PeriodType.Summer ? StayPlan.Summer : StayPlan.Academic);
        if ((period.Type == PeriodType.Summer) != (stayPlan == StayPlan.Summer))
            return Error.Field("stayPlan", period.Type == PeriodType.Summer
                ? "Yaz döneminde yalnızca “sadece yaz” kaydı alınır."
                : "“Sadece yaz” kaydı yaz dönemine yapılır.");

        stage = "validate";
        var v = new Validator();
        var applicant = ApplicantRules.Normalize(input, v);
        if (source == ApplicationSource.Online && (document is null || document.Length == 0))
            v.AddError("document", "Öğrenci belgeni (PDF) yükle.");

        // ---- oda tipi ----
        RoomType? roomType = input.RoomTypeId is { } rtId
            ? await db.RoomTypes.FirstOrDefaultAsync(x => x.Id == rtId, ct)
            : string.IsNullOrWhiteSpace(input.RoomSlug) ? null : await db.RoomTypes.FirstOrDefaultAsync(x => x.Slug == input.RoomSlug, ct);
        if (roomType is null || (source == ApplicationSource.Online && !roomType.IsActive))
            v.AddError("roomSlug", "Oda tipini seçin.");
        // Pasife alınmış daire türünün oda seçenekleri için web başvurusu alınmaz
        else if (source == ApplicationSource.Online && roomType.ApartmentTypeId is { } ownerTypeId &&
                 !await db.ApartmentTypes.AnyAsync(x => x.Id == ownerTypeId && x.IsActive, ct))
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
        else if (term is StayTerm.First or StayTerm.Second && stayPlan != StayPlan.Academic)
            v.AddError("term", "Yarım dönem yalnızca akademik dönem kaydında seçilebilir.");

        if (input.EntryDate is { } entry && term is not null && v.IsValid)
        {
            var (rangeStart, rangeEnd) = term switch
            {
                StayTerm.First => (period.StartDate, period.HalfTermFirstEnd!.Value),
                StayTerm.Second => (period.HalfTermSecondStart!.Value, period.EndDate),
                _ => (period.StartDate, period.EndDate)
            };
            // 9 aylık dönemde giriş en erken kiranın başladığı ay (Ekim)
            if (period.RentStart > rangeStart) rangeStart = period.RentStart;
            if (source == ApplicationSource.Online && TurkeyClock.Today > rangeStart) rangeStart = TurkeyClock.Today;
            v.Must("entryDate", entry >= rangeStart && entry <= rangeEnd, $"Giriş tarihi {rangeStart:dd.MM.yyyy} – {rangeEnd:dd.MM.yyyy} arasında olmalı.");
        }

        if (!v.IsValid) return v.ToFailure<Created>();

        stage = "price";
        var price = await db.RoomTypePrices.FirstOrDefaultAsync(x => x.PeriodId == period.Id && x.RoomTypeId == roomType!.Id, ct);
        if (price is null) return Error.Conflict("Bu oda tipi için bu dönemde fiyat tanımlı değil.");

        decimal? summerMonthly = null;
        if (stayPlan == StayPlan.Yearly)
        {
            if (price.SummerMonthly is null)
                return Error.Conflict("Bu oda tipi için yaz (Temmuz–Ağustos) fiyatı tanımlı değil; 12 aylık kayıt alınamıyor.");
            summerMonthly = price.SummerMonthly;
        }

        // Web başvurusunda tüm yatakları dolu oda tipi seçilemez (form da "Dolu" gösterir; bu, doğrudan istek ve yarışa karşı korumadır).
        // Sadece yaz kaydında doluluk akademik dönemi gösterdiği için bakılmaz.
        if (source == ApplicationSource.Online && stayPlan != StayPlan.Summer)
        {
            var typeRooms = await db.Rooms.Where(x => x.RoomTypeId == roomType!.Id && x.Status == RoomStatus.Active && x.Apartment!.IsPublished).ToListAsync(ct);
            if (typeRooms.Count > 0)
            {
                var counts = await availability.GetRoomCountsAsync(period.Id, typeRooms.Select(x => x.Id).ToList(), ct, OccupancyDay(period, term));
                var free = typeRooms.Sum(x => Math.Max(0, x.Beds - counts[x.Id].Occupied - counts[x.Id].Reserved));
                if (free == 0) return Error.Conflict("Seçtiğiniz oda tipi şu an dolu. Lütfen bizimle iletişime geçin.");
            }
        }

        stage = "duplicate-check";
        if (await db.Applications.AnyAsync(x => x.PeriodId == period.Id && x.Tc == applicant!.Tc && x.Status != ApplicationStatus.Rejected, ct))
            return Error.Conflict("Bu T.C. kimlik no ile bu dönemde zaten bir başvuru ya da kayıt var.");

        // ---- indirim kodu: aylık kiraya (12 ayda yaz kirasına da) ve depozitoya uygulanır (depozito son ay kirası yerine sayıldığı için) ----
        stage = "discount";
        DiscountCode? discount = null;
        var monthly = price.Monthly;
        var deposit = price.Deposit;
        if (DiscountCodeRules.Normalize(input.DiscountCode) is { Length: > 0 } codeText)
        {
            discount = await db.DiscountCodes.FirstOrDefaultAsync(x => x.Code == codeText, ct);
            if (discount is null || !DiscountCodeRules.IsUsable(discount, TurkeyClock.Today))
                return Error.Field("discountCode", DiscountCodeRules.InvalidMessage);
            if (discount.Tc is not null && discount.Tc != applicant!.Tc)
                return Error.Field("discountCode", "Bu kod bu T.C. kimlik no için geçerli değil.");

            monthly = DiscountMath.Apply(discount.Kind, discount.Value, price.Monthly);
            deposit = DiscountMath.Apply(discount.Kind, discount.Value, price.Deposit);
            if (summerMonthly is { } sm) summerMonthly = DiscountMath.Apply(discount.Kind, discount.Value, sm);
            discount.UsedCount++;
        }

        // ---- seçilen yatak (oda tercihi) ----
        stage = "bed";
        Guid? preferredRoom = null;
        if (!string.IsNullOrWhiteSpace(input.BedId) && stayPlan != StayPlan.Summer)
        {
            var roomId = ParseRoomId(input.BedId);
            var room = roomId is null ? null : await db.Rooms.Include(x => x.Apartment).FirstOrDefaultAsync(x => x.Id == roomId, ct);
            if (room is null || room.RoomTypeId != roomType!.Id || room.Status != RoomStatus.Active || room.Apartment?.IsPublished != true)
                return Error.Field("bedId", "Seçilen yatak bulunamadı. Lütfen yeniden seçin.");

            var counts = (await availability.GetRoomCountsAsync(period.Id, [room.Id], ct, OccupancyDay(period, term)))[room.Id];
            if (counts.Occupied + counts.Reserved >= room.Beds)
                return Error.Conflict("Seçtiğiniz yatak artık boş değil. Lütfen başka bir yatak seçin ya da “Yatak fark etmez” ile başvurun.");
            preferredRoom = room.Id;
        }

        // ---- öğrenci belgesi: tüm kontroller geçtikten sonra diske yazılır (reddedilen başvuru dosya bırakmaz) ----
        stage = "document";
        StoredDocument? stored = null;
        if (document is not null)
        {
            var saved = await documents.SavePdfAsync(document, ct);
            if (!saved.IsSuccess) return saved.Error!;
            stored = saved.Value;
        }

        stage = "number";
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
            StayPlan = stayPlan,
            EntryDate = input.EntryDate!.Value,
            PayWindow = window!.Value,
            PriceMonthly = monthly,
            PriceDeposit = deposit,
            PriceSummerMonthly = summerMonthly,
            DiscountCodeId = discount?.Id,
            DiscountCodeText = discount?.Code,
            ListPriceMonthly = discount is null ? null : price.Monthly,
            ListPriceSummerMonthly = discount is null ? null : price.SummerMonthly,
            DocumentPath = stored?.Path,
            DocumentName = stored?.FileName,
            DocumentSize = stored?.Size,
            DocumentSha256 = stored?.Sha256,
            Note = string.IsNullOrWhiteSpace(input.Note) ? null : input.Note.Trim()[..Math.Min(input.Note.Trim().Length, 1000)],
            Ip = ip
        };

        stage = "save";
        db.Applications.Add(application);
        audit.Add("application.create", "application", application.Id, period.Id, after: new { application.No, source, stayPlan, discountCode = discount?.Code, document = stored is not null });
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            documents.Delete(stored?.Path); // kayıt yazılamadıysa dosya yetim kalmasın
            throw;
        }

        stage = "notify";
        // Web'den gelen başvuru: yöneticilerin cihazlarına anında bildirim (arka planda, isteği bekletmez)
        if (source == ApplicationSource.Online)
        {
            var planText = stayPlan switch { StayPlan.Yearly => " · 12 ay", StayPlan.Summer => " · Sadece yaz", _ => "" };
            alerts.Enqueue(new PushPayload("Yeni başvuru", $"{application.FullName} · {roomType!.Name.Tr}{planText} · {application.No}", "/admin/basvurular", $"application-{application.Id:N}"));
        }

        return new Created(application.Id, application.No);
    }

    /// <summary>Yatak kimliği "{odaId}-{sıra}" biçimindedir (CatalogQueryHandler); oda kimliği çıkarılır</summary>
    /// <summary>2. yarı başvurusunda doluluğa 2. yarının ilk gününe göre bakılır: 1. yarıda kalanların odaları o gün boşalmış sayılır</summary>
    private static DateOnly? OccupancyDay(Period period, StayTerm? term) =>
        term == StayTerm.Second && period.HalfTermSecondStart is { } secondStart ? secondStart : null;

    private static Guid? ParseRoomId(string bedId)
    {
        var dash = bedId.LastIndexOf('-');
        return dash > 0 && Guid.TryParse(bedId[..dash], out var id) ? id : null;
    }
}
