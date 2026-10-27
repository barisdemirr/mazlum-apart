using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Features.Enrollments;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Messaging;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Support;

/*
 * ARIZA KAYITLARI (frontend services/maintenance.js + admin MaintenanceView)
 *  Öğrenci: kendi taleplerini listeler, yeni talep açar (en fazla 3 fotoğraf, her biri 5 MB). Fotoğraflar ÖZEL alanda (App_Data/private)
 *           WebP olarak saklanır; yalnızca talebin sahibi ve yöneticiler görebilir.
 *  Yönetici: dönemin taleplerini listeler, durum ve öğrenciye görünen not girer (her değişiklik zaman çizelgesine yazılır).
 *  Kapalı dönemin talepleri yalnızca okunur. Açık talep sayısı öğrenci başına sınırlıdır (kötüye kullanım).
 */

public record MaintenanceEventDto(DateTime At, MaintenanceStatus Status, string? Note);

public record MaintenancePhotoDto(Guid Id, int Width, int Height);

public static class MaintenanceRules
{
    public const int MaxPhotos = 3;
    public const long MaxPhotoBytes = 5 * 1024 * 1024;
    public const int MaxOpenPerStudent = 10;

    public static string? PhotoVariant(string? size) => size switch
    {
        null or "" or "md" => "md",
        "thumb" => "thumb",
        "lg" => "lg",
        _ => null
    };
}

public static class StudentMaintenance
{
    /// <summary>Öğrencinin gördüğü talep (frontend sözleşmesi: id, no, area, title, description, status, createdAt, photoCount, events)</summary>
    public record Item(Guid Id, string No, MaintenanceArea Area, string Title, string Description, MaintenanceStatus Status, DateTime CreatedAt,
        int PhotoCount, List<MaintenancePhotoDto> Photos, List<MaintenanceEventDto> Events, string RoomLabel);

    public static Item ToItem(MaintenanceRequest m) => new(
        m.Id, m.No, m.Area, m.Title, m.Description, m.Status, m.CreatedAt, m.Photos.Count,
        m.Photos.OrderBy(p => p.CreatedAt).Select(p => new MaintenancePhotoDto(p.Id, p.Width, p.Height)).ToList(),
        m.Events.OrderBy(e => e.CreatedAt).Select(e => new MaintenanceEventDto(e.CreatedAt, e.Status, e.Note)).ToList(),
        m.RoomLabel);

    public class Handler(AppDbContext db, ImageService images, NumberGenerator numbers, AdminAlerts alerts, AuditWriter audit, ILogger<Handler> logger)
    {
        public async Task<List<Item>> List(Guid studentId, CancellationToken ct) =>
            (await db.MaintenanceRequests.AsNoTracking().Include(x => x.Events).Include(x => x.Photos)
                .Where(x => x.StudentId == studentId)
                .OrderByDescending(x => x.CreatedAt).Take(100)
                .ToListAsync(ct))
            .Select(ToItem).ToList();

        public Task<Result<Item>> Create(Guid studentId, string displayName, IFormCollection form, CancellationToken ct) =>
            CreateCore(studentId, null, ActorType.Student, displayName, null, form, ct);

        /// <summary>Ofisten: personel öğrenci adına kayıt açar. Numara, zaman çizelgesi, fotoğraf ve takip süreci öğrencinin açtığı kayıtla aynıdır.</summary>
        public async Task<Result<Item>> CreateByOffice(IFormCollection form, string adminName, CancellationToken ct)
        {
            if (!Guid.TryParse(form["enrollmentId"].ToString(), out var enrollmentId))
                return Error.Field("enrollmentId", "Öğrenciyi seçin.");
            var studentId = await db.Enrollments.AsNoTracking().Where(x => x.Id == enrollmentId).Select(x => (Guid?)x.StudentId).FirstOrDefaultAsync(ct);
            if (studentId is null) return Error.Field("enrollmentId", "Öğrenci kaydı bulunamadı.");

            var roomLabel = form["roomLabel"].ToString().Trim();
            if (roomLabel.Length > 120) return Error.Field("roomLabel", "Daire / oda en fazla 120 karakter olabilir.");
            return await CreateCore(studentId.Value, enrollmentId, ActorType.Admin, adminName, roomLabel.Length > 0 ? roomLabel : null, form, ct);
        }

        private async Task<Result<Item>> CreateCore(Guid studentId, Guid? enrollmentId, ActorType actor, string actorName, string? roomLabel, IFormCollection form, CancellationToken ct)
        {
            var title = form["title"].ToString().Trim();
            var description = form["description"].ToString().Trim();
            var areaRaw = form["area"].ToString();
            var files = form.Files.GetFiles("photos");

            var v = new Validator()
                .Must("area", QueryParsing.TryParseEnum<MaintenanceArea>(areaRaw, out var area), "Arızanın yerini seçin.")
                .Must("title", title.Length >= 4, "Başlık en az 4 karakter olmalı.")
                .MaxLength("title", title, 120)
                .Must("description", description.Length >= 10, "Açıklama en az 10 karakter olmalı.")
                .MaxLength("description", description, 2000)
                .Must("photos", files.Count <= MaintenanceRules.MaxPhotos, $"En fazla {MaintenanceRules.MaxPhotos} fotoğraf eklenebilir.")
                .Must("photos", files.All(f => f.Length is > 0 and <= MaintenanceRules.MaxPhotoBytes), "Her fotoğraf en fazla 5 MB olabilir.");
            if (!v.IsValid) return v.ToFailure<Item>();

            // Hangi kayıt adına: aktif dönemdeki onaylı/aktif kayıt
            var enrollment = await db.Enrollments.AsNoTracking()
                .Where(x => x.StudentId == studentId && (enrollmentId == null || x.Id == enrollmentId) && (x.Status == EnrollmentStatus.Active || x.Status == EnrollmentStatus.Approved))
                .Join(db.Periods.Where(p => p.Status == PeriodStatus.Active), e => e.PeriodId, p => p.Id, (e, p) => new { e, p })
                .OrderByDescending(x => x.p.StartDate)
                .Select(x => x.e)
                .FirstOrDefaultAsync(ct);
            if (enrollment is null)
                return Error.Conflict(actor == ActorType.Admin
                    ? "Bu öğrencinin aktif dönemde onaylı ya da aktif bir kaydı olmadığı için arıza açılamaz."
                    : "Aktif bir konaklama kaydınız olmadığı için arıza bildirilemez.");

            if (actor == ActorType.Student)
            {
                var open = await db.MaintenanceRequests.CountAsync(x => x.StudentId == studentId && x.Status != MaintenanceStatus.Done, ct);
                if (open >= MaintenanceRules.MaxOpenPerStudent)
                    return Error.Conflict("Çok sayıda açık arıza kaydınız var. Mevcut kayıtlar tamamlanınca yenisini açabilirsiniz.");
            }

            var placements = await db.Placements.AsNoTracking().Include(x => x.Room).ThenInclude(r => r!.Apartment)
                .Where(x => x.EnrollmentId == enrollment.Id).ToListAsync(ct);
            var room = EnrollmentQueryHandler.CurrentRoom(placements, TurkeyClock.Today);

            // Fotoğraflar: içerik doğrulanır (gerçek görsel mi), WebP'ye çevrilip özel alana yazılır
            var saved = new List<ProcessedImage>();
            foreach (var file in files)
            {
                await using var stream = file.OpenReadStream();
                var processed = await images.SaveAsync(stream, StorageArea.Private, ct);
                if (!processed.IsSuccess)
                {
                    foreach (var p in saved) images.Delete(p.Path);
                    return Error.Field("photos", processed.Error!.Details?.Values.FirstOrDefault()?.FirstOrDefault() ?? processed.Error.Message);
                }
                saved.Add(processed.Value!);
            }

            try
            {
                var number = await numbers.NextAsync("maintenance", ct);
                var request = new MaintenanceRequest
                {
                    No = $"TK-{number:D4}",
                    PeriodId = enrollment.PeriodId,
                    EnrollmentId = enrollment.Id,
                    StudentId = studentId,
                    RoomLabel = roomLabel ?? room?.Label ?? "",
                    Area = area,
                    Title = title,
                    Description = description
                };
                request.Events.Add(new MaintenanceEvent
                {
                    RequestId = request.Id, Status = MaintenanceStatus.Received, ActorType = actor, ActorName = actorName,
                    Note = actor == ActorType.Admin ? "Ofis tarafından sizin adınıza açıldı." : null
                });
                foreach (var p in saved)
                    request.Photos.Add(new MaintenancePhoto { RequestId = request.Id, FilePath = p.Path, FileSize = p.StoredBytes, Width = p.Width, Height = p.Height });

                db.MaintenanceRequests.Add(request);
                audit.Add("maintenance.create", "maintenance", request.Id, request.PeriodId, after: new { request.No, request.Area, request.Title, photos = saved.Count, office = actor == ActorType.Admin });
                await db.SaveChangesAsync(ct);

                if (actor == ActorType.Student) // ofisten açılan kayıt için yöneticilere ayrıca bildirim gitmez
                    alerts.Enqueue(new PushPayload("Yeni arıza kaydı", $"{request.RoomLabel} · {request.Title}".Trim(' ', '·'), "/admin/ariza", $"maintenance-{request.Id:N}"));
                return ToItem(request);
            }
            catch
            {
                foreach (var p in saved) images.Delete(p.Path); // kayıt yazılamadıysa dosyalar yetim kalmasın
                logger.LogWarning("Arıza kaydı yazılamadı; yüklenen fotoğraflar silindi");
                throw;
            }
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/student/maintenance-requests").RequireAuthorization(AppPolicies.Student);

            group.MapGet("", async (ClaimsPrincipal user, Handler h, CancellationToken ct) => Results.Ok(await h.List(user.GetUserId(), ct)));

            group.MapPost("", async (HttpRequest request, ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                {
                    if (!request.HasFormContentType) return Error.Field("form", "Form verisi (multipart) bekleniyor.").ToProblem();
                    var form = await request.ReadFormAsync(ct);
                    return (await h.Create(user.GetUserId(), user.GetDisplayName(), form, ct)).ToOk();
                })
                .RequireRateLimiting(RatePolicies.StudentWrite)
                .DisableAntiforgery()
                .WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(20 * 1024 * 1024));

            // Fotoğraf: yalnızca talebin sahibi
            group.MapGet("/{id:guid}/photos/{photoId:guid}", async (Guid id, Guid photoId, string? size, ClaimsPrincipal user,
                AppDbContext db, ImageService images, CancellationToken ct) =>
            {
                var studentId = user.GetUserId();
                var photo = await db.MaintenancePhotos.AsNoTracking()
                    .Where(p => p.Id == photoId && p.RequestId == id &&
                                db.MaintenanceRequests.Any(r => r.Id == id && r.StudentId == studentId))
                    .FirstOrDefaultAsync(ct);
                return MaintenancePhotoFile.Serve(photo, size, images);
            });
        }
    }
}

public static class MaintenancePhotoFile
{
    public static IResult Serve(MaintenancePhoto? photo, string? size, ImageService images)
    {
        var variant = MaintenanceRules.PhotoVariant(size);
        if (photo is null || variant is null) return Results.NotFound();

        var path = images.ToPhysicalPath(ImageService.VariantPath(photo.FilePath, variant));
        if (!File.Exists(path)) return Results.NotFound();

        // Dosya yolu veritabanından gelir (istemciden değil); ToPhysicalPath kök dışına çıkışı ayrıca engeller
        return Results.File(path, "image/webp", enableRangeProcessing: false,
            lastModified: File.GetLastWriteTimeUtc(path));
    }
}

public static class AdminMaintenance
{
    public record Row(
        Guid Id, string No, Guid PeriodId, Guid EnrollmentId, StudentRef Student, string RoomLabel, MaintenanceArea Area, string Title,
        string Description, MaintenanceStatus Status, string? AdminNote, DateTime CreatedAt, DateTime? UpdatedAt, DateTime? ClosedAt,
        List<MaintenancePhotoDto> Photos, List<MaintenanceEventDto> Events);

    public record UpdateCommand(MaintenanceStatus? Status, string? AdminNote);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<List<Row>> List(Guid periodId, string? status, CancellationToken ct)
        {
            var query = db.MaintenanceRequests.AsNoTracking().Include(x => x.Events).Include(x => x.Photos).Where(x => x.PeriodId == periodId);
            if (status == "open") query = query.Where(x => x.Status != MaintenanceStatus.Done);
            else if (QueryParsing.TryParseEnum<MaintenanceStatus>(status, out var s)) query = query.Where(x => x.Status == s);

            var items = await query.OrderByDescending(x => x.CreatedAt).Take(1000).ToListAsync(ct);
            var students = await StudentsAsync(items.Select(i => i.StudentId).Distinct().ToList(), ct);
            return items.Select(m => ToRow(m, students)).ToList();
        }

        public async Task<Result<Row>> Update(Guid id, UpdateCommand cmd, ClaimsPrincipal user, CancellationToken ct)
        {
            var request = await db.MaintenanceRequests.Include(x => x.Events).Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id, ct);
            if (request is null) return Error.NotFound("Arıza kaydı bulunamadı.");
            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == request.PeriodId, ct);
            if (PeriodRules.RequireOpen(period, "Arıza kaydı güncelleme") is { } closed) return closed;

            var note = cmd.AdminNote?.Trim();
            if (note is { Length: > 500 }) return Error.Field("adminNote", "Not en fazla 500 karakter olabilir.");
            note = string.IsNullOrWhiteSpace(note) ? null : note;
            var status = cmd.Status ?? request.Status;

            if (status == request.Status && note == request.AdminNote) return ToRow(request, await StudentsAsync([request.StudentId], ct));

            var before = new { request.Status, request.AdminNote };
            request.Status = status;
            request.AdminNote = note;
            request.ClosedAt = status == MaintenanceStatus.Done ? request.ClosedAt ?? DateTime.UtcNow : null;
            var evt = new MaintenanceEvent { RequestId = request.Id, Status = status, Note = note, ActorType = ActorType.Admin, ActorName = user.GetDisplayName() };
            db.MaintenanceEvents.Add(evt);
            request.Events.Add(evt);

            audit.Add("maintenance.update", "maintenance", id, request.PeriodId, before: before, after: new { request.Status, request.AdminNote });
            await db.SaveChangesAsync(ct);
            return ToRow(request, await StudentsAsync([request.StudentId], ct));
        }

        private async Task<Dictionary<Guid, StudentRef>> StudentsAsync(List<Guid> ids, CancellationToken ct) =>
            await db.Students.AsNoTracking().IgnoreQueryFilters().Where(x => ids.Contains(x.Id))
                .Select(x => new StudentRef(x.Id, x.FirstName, x.LastName, x.Phone, x.Tc))
                .ToDictionaryAsync(x => x.Id, ct);

        private static Row ToRow(MaintenanceRequest m, Dictionary<Guid, StudentRef> students) => new(
            m.Id, m.No, m.PeriodId, m.EnrollmentId, students.GetValueOrDefault(m.StudentId) ?? new StudentRef(m.StudentId, "", "", "", ""),
            m.RoomLabel, m.Area, m.Title, m.Description, m.Status, m.AdminNote, m.CreatedAt, m.UpdatedAt, m.ClosedAt,
            m.Photos.OrderBy(p => p.CreatedAt).Select(p => new MaintenancePhotoDto(p.Id, p.Width, p.Height)).ToList(),
            m.Events.OrderBy(e => e.CreatedAt).Select(e => new MaintenanceEventDto(e.CreatedAt, e.Status, e.Note)).ToList());
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/api/admin/maintenance");
            group.MapGet("", async (Guid periodId, string? status, Handler h, CancellationToken ct) => Results.Ok(await h.List(periodId, status, ct)));

            // Ofisten manuel kayıt: multipart (enrollmentId, area, title, description, roomLabel?, photos[])
            group.MapPost("", async (HttpRequest request, ClaimsPrincipal user, StudentMaintenance.Handler creator, CancellationToken ct) =>
                {
                    if (!request.HasFormContentType) return Error.Field("form", "Form verisi (multipart) bekleniyor.").ToProblem();
                    var form = await request.ReadFormAsync(ct);
                    return (await creator.CreateByOffice(form, user.GetDisplayName(), ct)).ToOk();
                })
                .DisableAntiforgery()
                .WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(20 * 1024 * 1024));
            group.MapPut("/{id:guid}", async (Guid id, UpdateCommand cmd, ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Update(id, cmd, user, ct)).ToOk());
            group.MapGet("/{id:guid}/photos/{photoId:guid}", async (Guid id, Guid photoId, string? size, AppDbContext db, ImageService images, CancellationToken ct) =>
            {
                var photo = await db.MaintenancePhotos.AsNoTracking().FirstOrDefaultAsync(p => p.Id == photoId && p.RequestId == id, ct);
                return MaintenancePhotoFile.Serve(photo, size, images);
            });
        }
    }
}
