using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Features.Applications;
using MazlumApart.Features.Periods;
using MazlumApart.Features.Structure;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.StudentPortal;

/// <summary>
/// Öğrenci portalından dönemlik KAYIT YENİLEME (mevcut hesapla; yeni hesap/şifre açılmaz):
///  GET  /api/student/renewal          → önceki kayıt, başvuruya açık dönemler + oda tipleri ve GÜNCEL fiyatlar, öğrencinin yenileme başvuruları
///  POST /api/student/renewal/preview  → seçime göre güncel fiyat ve ödeme planı önizlemesi
///  POST /api/student/renewal          → başvuru (multipart: data JSON, document isteğe bağlı PDF). Yönetici panelinde "Kayıt Yenileme Başvurusu" olarak görünür.
/// Kişisel, veli ve okul bilgileri öğrencinin kayıtlı bilgilerinden aktarılır; öğrenci yalnızca değişebilen alanları (sınıf, okul/fakülte/bölüm, adres) günceller.
/// Onay (mevcut Approve akışı): aynı T.C.'li öğrenciye seçilen dönem için YENİ kayıt eklenir; eski kayıt, tahsilat ve belgeler değişmez.
/// Yeni kayıtta takip alanları (giriş, parmak izi, WhatsApp grubu, sözleşme) "yapılmadı" başlar.
/// </summary>
public static class StudentRenewal
{
    /// <summary>Seçilebilecek oda: o dönemde boş yatağı olan aktif oda (öğrenci belirli bir oda tercih edebilir)</summary>
    public record RoomChoice(Guid Id, string Label, int Free);

    public record RoomTypeOption(Guid Id, string Name, string? ApartmentTypeName, decimal Monthly, decimal Deposit, decimal? SummerMonthly, bool Full, List<RoomChoice> Rooms);

    public record PeriodOption(Guid Id, string Name, PeriodType Type, DateOnly Start, DateOnly End, DateOnly YearlyEnd, bool NineMonth, HalfTermDto HalfTerm, List<RoomTypeOption> RoomTypes);

    public record PreviousStay(Guid EnrollmentId, string PeriodName, Guid RoomTypeId, string RoomTypeName, Guid? RoomId, string? RoomLabel, StayPlan StayPlan, StayTerm Term, PayWindow PayWindow);

    public record MyApplication(Guid Id, string No, string PeriodName, StayPlan StayPlan, ApplicationStatus Status, string? RejectReason, DateTime CreatedAt);

    public record Editable(string Grade, string School, string Faculty, string Department, string Address);

    public record Response(Editable Student, PreviousStay? Previous, PeriodOption? Academic, PeriodOption? Summer, List<MyApplication> Applications);

    public record PlanLine(ChargeKind Kind, string Month, decimal Amount, DateOnly DueDate, string Note);

    public record PreviewRequest(string? StayPlan, Guid? RoomTypeId, string? Term, DateOnly? EntryDate, string? PayWindow);

    public record Preview(Guid PeriodId, string PeriodName, decimal Monthly, decimal Deposit, decimal? SummerMonthly, List<PlanLine> Plan, decimal DueAtRegistration, decimal Total);

    /// <summary>Öğrencinin değiştirebildiği alanlar + seçimler (T.C., ad, doğum tarihi, telefon, il/ilçe ve veliler kayıtlı bilgiden alınır)</summary>
    /// <param name="SameRoom">önceki odayı iste (oda tipi aynıysa)</param>
    /// <param name="RoomId">ya da listeden belirli bir oda (boşsa "oda fark etmez")</param>
    public record RenewalInput(string? StayPlan, Guid? RoomTypeId, string? Term, DateOnly? EntryDate, string? PayWindow, bool SameRoom, Guid? RoomId,
        string? Grade, string? School, string? Faculty, string? Department, string? Address, string? Note);

    private static async Task<List<Period>> OpenPeriodsAsync(AppDbContext db, CancellationToken ct) =>
        await db.Periods.AsNoTracking().Where(x => x.Status == PeriodStatus.Active && x.ApplicationsOpen).OrderByDescending(x => x.StartDate).ToListAsync(ct);

    // Adı "Handler" ile bitmeli: FeatureExtensions yalnızca *Handler sınıflarını DI'a kaydeder
    public class RenewalHandler(AppDbContext db, AvailabilityService availability)
    {
        public async Task<Result<Response>> Handle(Guid studentId, CancellationToken ct)
        {
            var s = await db.Students.AsNoTracking().FirstOrDefaultAsync(x => x.Id == studentId, ct);
            if (s is null) return Error.NotFound("Öğrenci bulunamadı.");

            var prev = await db.Enrollments.AsNoTracking().Where(x => x.StudentId == studentId && x.Status != EnrollmentStatus.Cancelled)
                .Join(db.Periods, e => e.PeriodId, p => p.Id, (e, p) => new { e, p })
                .OrderByDescending(x => x.p.StartDate).FirstOrDefaultAsync(ct);

            PreviousStay? previous = null;
            if (prev is not null)
            {
                var place = await db.Placements.AsNoTracking().Include(x => x.Room).ThenInclude(r => r!.Apartment)
                    .Where(x => x.EnrollmentId == prev.e.Id).OrderByDescending(x => x.StartDate).FirstOrDefaultAsync(ct);
                var typeName = await db.RoomTypes.IgnoreQueryFilters().AsNoTracking().Where(x => x.Id == prev.e.RoomTypeId).Select(x => x.Name.Tr).FirstOrDefaultAsync(ct);
                previous = new PreviousStay(prev.e.Id, prev.p.Name, prev.e.RoomTypeId, typeName ?? "", place?.RoomId,
                    place?.Room is null ? null : $"{place.Room.Apartment?.Name} · {place.Room.Name}", prev.e.StayPlan, prev.e.Term, prev.e.PayWindow);
            }

            var open = await OpenPeriodsAsync(db, ct);
            var academic = open.FirstOrDefault(p => p.Type == PeriodType.Academic);
            var summer = open.FirstOrDefault(p => p.Type == PeriodType.Summer);

            var apps = await db.Applications.AsNoTracking().Where(x => x.IsRenewal && x.Tc == s.Tc).OrderByDescending(x => x.CreatedAt).Take(10).ToListAsync(ct);
            var periodNames = await db.Periods.AsNoTracking().ToDictionaryAsync(x => x.Id, x => x.Name, ct);
            var mine = apps.Select(a => new MyApplication(a.Id, a.No, periodNames.GetValueOrDefault(a.PeriodId, ""), a.StayPlan, a.Status, a.RejectReason, a.CreatedAt)).ToList();

            return new Response(new Editable(s.Grade, s.School, s.Faculty, s.Department, s.Address), previous,
                academic is null ? null : await OptionAsync(academic, ct), summer is null ? null : await OptionAsync(summer, ct), mine);
        }

        private async Task<PeriodOption> OptionAsync(Period p, CancellationToken ct)
        {
            var order = await StructureOrder.LoadAsync(db, ct);
            var activeApt = (await db.ApartmentTypes.AsNoTracking().Where(x => x.IsActive).Select(x => new { x.Id, x.Name }).ToListAsync(ct)).ToDictionary(x => x.Id, x => x.Name.Tr);
            var prices = await db.RoomTypePrices.AsNoTracking().Where(x => x.PeriodId == p.Id).ToListAsync(ct);
            var types = (await db.RoomTypes.AsNoTracking().Where(x => x.IsActive).ToListAsync(ct))
                .Where(t => t.ApartmentTypeId is null || activeApt.ContainsKey(t.ApartmentTypeId.Value))
                .OrderBy(t => order.RoomType(t.Id)).ToList();

            var rooms = (await db.Rooms.AsNoTracking().Where(x => x.Status == RoomStatus.Active && x.Apartment!.IsPublished)
                    .Select(x => new { x.Id, x.RoomTypeId, x.Beds, x.Name, x.OrderIndex, ApartmentName = x.Apartment!.Name, ApartmentOrder = x.Apartment.OrderIndex, x.Apartment.ApartmentTypeId })
                    .ToListAsync(ct))
                .OrderBy(r => order.ApartmentType(r.ApartmentTypeId)).ThenBy(r => r.ApartmentOrder).ThenBy(r => r.ApartmentName).ThenBy(r => r.OrderIndex).ThenBy(r => r.Name)
                .ToList();
            var counts = await availability.GetRoomCountsAsync(p.Id, rooms.Select(r => r.Id).ToList(), ct);

            var options = new List<RoomTypeOption>();
            foreach (var t in types)
            {
                var price = prices.FirstOrDefault(x => x.RoomTypeId == t.Id);
                if (price is null) continue;
                var own = rooms.Where(r => r.RoomTypeId == t.Id).ToList();
                int FreeOf(Guid roomId, int beds) => Math.Max(0, beds - counts[roomId].Occupied - counts[roomId].Reserved);
                var free = own.Sum(r => FreeOf(r.Id, r.Beds));
                var choices = own.Where(r => FreeOf(r.Id, r.Beds) > 0).Select(r => new RoomChoice(r.Id, $"{r.ApartmentName} · {r.Name}", FreeOf(r.Id, r.Beds))).ToList();
                options.Add(new RoomTypeOption(t.Id, t.Name.Tr, t.ApartmentTypeId is { } a ? activeApt.GetValueOrDefault(a) : null,
                    price.Monthly, price.Deposit, price.SummerMonthly, own.Count > 0 && free == 0, choices));
            }

            return new PeriodOption(p.Id, p.Name, p.Type, p.RentStart, p.EndDate, PaymentPlan.SummerEnd(p.EndDate), p.NineMonthTerm,
                p.HalfTermEnabled ? new HalfTermDto(true, p.HalfTermFirstEnd, p.HalfTermSecondStart) : new HalfTermDto(false, null, null), options);
        }
    }

    public class PreviewHandler(AppDbContext db)
    {
        public async Task<Result<Preview>> Handle(PreviewRequest r, CancellationToken ct)
        {
            var (planValid, requestedPlan) = ApplicantRules.ParseStayPlan(r.StayPlan);
            if (!planValid) return Error.Field("stayPlan", "Konaklama türü geçersiz.");
            var plan = requestedPlan ?? StayPlan.Academic;
            var term = ApplicantRules.ParseTerm(r.Term);
            var window = ApplicantRules.ParsePayWindow(r.PayWindow);
            if (term is null) return Error.Field("term", "Kayıt süresi geçersiz.");
            if (window is null) return Error.Field("payDay", "Ödeme gününü seçin.");
            if (r.RoomTypeId is null) return Error.Field("roomTypeId", "Oda tipini seçin.");
            if (r.EntryDate is null) return Error.Field("entryDate", "Giriş tarihini seçin.");

            var open = await OpenPeriodsAsync(db, ct);
            var period = open.FirstOrDefault(p => p.Type == (plan == StayPlan.Summer ? PeriodType.Summer : PeriodType.Academic));
            if (period is null) return Error.Conflict(plan == StayPlan.Summer ? "Yaz dönemi kayıtları şu an kapalı." : "Şu an başvuruya açık bir dönem yok.");

            var price = await db.RoomTypePrices.AsNoTracking().FirstOrDefaultAsync(x => x.PeriodId == period.Id && x.RoomTypeId == r.RoomTypeId, ct);
            if (price is null) return Error.Conflict("Bu oda tipi için bu dönemde fiyat tanımlı değil.");
            if (plan == StayPlan.Yearly && price.SummerMonthly is null) return Error.Conflict("Bu oda tipi için 12 aylık kayıt alınamıyor.");

            var planEnd = term == StayTerm.First && period.HalfTermFirstEnd is { } firstEnd ? firstEnd : period.EndDate;
            var drafts = PaymentPlan.ForStay(plan, r.EntryDate.Value, window.Value, price.Monthly, price.Deposit, planEnd, plan == StayPlan.Yearly ? price.SummerMonthly : null, period.RentStart);
            var lines = drafts.Select(d => new PlanLine(d.Kind, d.Month, d.Amount, d.DueDate, d.Note)).ToList();
            return new Preview(period.Id, period.Name, price.Monthly, price.Deposit, plan == StayPlan.Yearly ? price.SummerMonthly : null, lines,
                lines.Where(l => l.DueDate == r.EntryDate.Value).Sum(l => l.Amount), lines.Sum(l => l.Amount));
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/student/renewal").RequireAuthorization(AppPolicies.Student);

            group.MapGet("", async (ClaimsPrincipal user, RenewalHandler reader, CancellationToken ct) => (await reader.Handle(user.GetUserId(), ct)).ToOk());

            group.MapPost("/preview", async (PreviewRequest request, PreviewHandler handler, CancellationToken ct) => (await handler.Handle(request, ct)).ToOk())
                .RequireRateLimiting(RatePolicies.StudentWrite);

            group.MapPost("", async (HttpRequest request, HttpContext http, ClaimsPrincipal user, AppDbContext db, ApplicationCreateHandler handler,
                    IOptions<JsonOptions> json, CancellationToken ct) =>
                {
                    if (!request.HasFormContentType) return Error.Field("form", "Başvuru bilgileri okunamadı. Sayfayı yenileyip tekrar deneyin.").ToProblem();
                    var form = await request.ReadFormAsync(ct);
                    if (form.Files.Count > 1) return Error.Field("document", "Yalnızca bir PDF yükle.").ToProblem();

                    RenewalInput? input;
                    try
                    {
                        input = JsonSerializer.Deserialize<RenewalInput>(form["data"].ToString(), json.Value.SerializerOptions);
                    }
                    catch (JsonException)
                    {
                        input = null;
                    }
                    if (input is null) return Error.Field("form", "Başvuru bilgileri okunamadı. Sayfayı yenileyip tekrar deneyin.").ToProblem();

                    var studentId = user.GetUserId();
                    var s = await db.Students.AsNoTracking().Include(x => x.Guardians).FirstOrDefaultAsync(x => x.Id == studentId, ct);
                    if (s is null) return Error.NotFound("Öğrenci bulunamadı.").ToProblem();

                    var prev = await db.Enrollments.AsNoTracking().Where(x => x.StudentId == studentId && x.Status != EnrollmentStatus.Cancelled)
                        .Join(db.Periods, e => e.PeriodId, p => p.Id, (e, p) => new { e, p }).OrderByDescending(x => x.p.StartDate).Select(x => x.e).FirstOrDefaultAsync(ct);
                    if (prev is null) return Error.Conflict("Kayıt yenileme, önceki dönemde kaydı bulunan öğrenciler içindir.").ToProblem();

                    // Aynı odayı iste: önceki odanın tipi seçilen oda tipiyle aynıysa yatak tercihi olarak iletilir (doluysa başvuru reddedilir)
                    string? bed = null;
                    if (input.RoomId is { } chosenRoom)
                        bed = $"{chosenRoom}-1"; // oda tipi, yayın ve boşluk denetimi başvuru oluşturulurken yapılır
                    else if (input.SameRoom && input.RoomTypeId is { } rt)
                    {
                        var lastRoomId = await db.Placements.AsNoTracking().Where(x => x.EnrollmentId == prev.Id).OrderByDescending(x => x.StartDate).Select(x => (Guid?)x.RoomId).FirstOrDefaultAsync(ct);
                        if (lastRoomId is { } rid && await db.Rooms.AnyAsync(x => x.Id == rid && x.RoomTypeId == rt, ct)) bed = $"{rid}-1";
                    }

                    static string? Pick(string? value, string current) => string.IsNullOrWhiteSpace(value) ? current : value.Trim();
                    var applicationInput = new ApplicationInput(
                        PeriodId: null, RoomSlug: null, RoomTypeId: input.RoomTypeId, BedId: bed, Term: input.Term, EntryDate: input.EntryDate,
                        PayDay: null, PayWindow: input.PayWindow, FirstName: s.FirstName, LastName: s.LastName, Tc: s.Tc, BirthDate: s.BirthDate, Phone: s.Phone,
                        Address: Pick(input.Address, s.Address), ProvinceId: s.ProvinceId, District: s.District,
                        School: Pick(input.School, s.School), Faculty: Pick(input.Faculty, s.Faculty), Department: Pick(input.Department, s.Department), Grade: Pick(input.Grade, s.Grade),
                        Guardians: s.Guardians.OrderBy(g => g.OrderIndex).Select(g => new GuardianInput(g.Name, g.Phone)).ToList(),
                        Note: input.Note, StayPlan: input.StayPlan, DiscountCode: null);

                    return (await handler.Create(applicationInput, ApplicationSource.Online, ClientIp.Get(http), ct, form.Files.GetFile("document"), prev.Id))
                        .ToHttp(created => Results.Ok(new { applicationNo = created.ApplicationNo }));
                })
                .RequireRateLimiting(RatePolicies.StudentWrite)
                .DisableAntiforgery()
                .WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(6 * 1024 * 1024));
        }
    }
}
