using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Features.Enrollments;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Messaging;

/// <summary>İletişim amaçları (frontend CONTACT_PURPOSE). Bilinmeyen amaç kabul edilmez.</summary>
public static class MessagePurposes
{
    public static readonly HashSet<string> All =
    [
        "payment_reminder", "payment_overdue", "payment_received", "application_received", "enrollment_approved", "maintenance_update", "announcement", "other"
    ];
}

/// <summary>
/// Alıcı: kayıtlı bir öğrenci (enrollmentId), başvuru sahibi (applicationId) ya da ön başvuru (preRegistrationId; yalnızca SMS).
/// Telefon numarası İSTEMCİDEN ALINMAZ; her zaman veritabanındaki kayıttan okunur (panelden rastgele numaraya mesaj atılamaz).
/// chargeId: {tutar}/{vade}/{kalem} hangi borç kalemine göre dolsun (verilmezse toplam kalan).
/// vars: yalnızca sunucunun bilemeyeceği değişkenler — sifre, konu, durum.
/// </summary>
public record RecipientInput(Guid? EnrollmentId, Guid? ApplicationId, Guid? ChargeId, Dictionary<string, string>? Vars, Guid? PreRegistrationId = null);

public record SkippedRecipient(Guid? EnrollmentId, Guid? ApplicationId, string Name, string Reason);

/// <summary>Çözümlenmiş alıcı: kim, hangi numara, şablon değişkenleri (tr/en için ayrı kalem adı)</summary>
public sealed record ResolvedRecipient(
    Guid? EnrollmentId, Guid? ApplicationId, Guid? StudentId, Guid? PeriodId, string Name, string Phone,
    Dictionary<string, string> VarsTr, Dictionary<string, string> VarsEn, HashSet<string> SecretKeys, Guid? PreRegistrationId = null);

/// <summary>
/// Mesaj alıcılarını çözer ve şablon değişkenlerini SUNUCUDA doldurur (frontend messaging.js messageVars ile aynı anlam):
///   {ad} {telefon} {oda} {tutar} {vade} {kalem}  — veritabanından
///   {sifre} {konu} {durum}                          — istekten (vars); {sifre} kayıtlara maskelenmiş yazılır
/// </summary>
public partial class MessageAudienceHandler(AppDbContext db, EnrollmentQueryHandler reader)
{
    public const int MaxVarLength = 120;
    public static readonly HashSet<string> ClientVars = ["sifre", "konu", "durum"];
    public static readonly HashSet<string> SecretVars = ["sifre"];
    public const string Mask = "******";

    private static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");
    private static readonly string[] MonthsTr = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    private static readonly string[] MonthsEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    [GeneratedRegex(@"\{(\w+)\}")]
    private static partial Regex VarRegex();

    public static string FormatMoney(decimal value) => $"{value.ToString("#,0.##", Tr)} TL";

    public static string FormatDate(DateOnly value) => value.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);

    /// <summary>"{ad}" gibi değişkenleri doldurur; değeri olmayan değişken olduğu gibi kalır</summary>
    public static string Fill(string text, IReadOnlyDictionary<string, string> vars, IReadOnlySet<string>? masked = null) =>
        VarRegex().Replace(text, m =>
        {
            var key = m.Groups[1].Value;
            if (!vars.TryGetValue(key, out var value) || string.IsNullOrWhiteSpace(value)) return m.Value;
            return masked is not null && masked.Contains(key) ? Mask : value;
        });

    public static bool HasUnfilled(string text) => VarRegex().IsMatch(text);

    public static string ChargeLabel(LedgerItem item, bool english)
    {
        var month = int.TryParse(item.Month.AsSpan(5, 2), out var m) && m is >= 1 and <= 12 ? m : 0;
        return item.Kind switch
        {
            ChargeKind.Rent when month > 0 => english ? $"Rent ({MonthsEn[month - 1]})" : $"Kira ({MonthsTr[month - 1]})",
            ChargeKind.Rent => english ? "Rent" : "Kira",
            ChargeKind.Deposit => english ? "Deposit" : "Depozito",
            ChargeKind.ExtraStay => english ? "Extra stay" : "Ek konaklama",
            ChargeKind.Summer => english ? "Summer stay" : "Yaz konaklaması",
            ChargeKind.Discount => english ? "Discount" : "İndirim",
            _ => english ? "Payment" : "Ödeme"
        };
    }

    public async Task<(List<ResolvedRecipient> Found, List<SkippedRecipient> Skipped)> ResolveAsync(
        IReadOnlyList<RecipientInput> inputs, bool allowApplications, CancellationToken ct)
    {
        var found = new List<ResolvedRecipient>();
        var skipped = new List<SkippedRecipient>();

        var enrollmentIds = inputs.Where(i => i.EnrollmentId is not null).Select(i => i.EnrollmentId!.Value).Distinct().ToList();
        var rows = enrollmentIds.Count == 0
            ? new Dictionary<Guid, (EnrollmentRow Row, EnrollmentSummary Ledger)>()
            : (await reader.LoadAsync(db.Enrollments.Where(x => enrollmentIds.Contains(x.Id)), TurkeyClock.Today, ct)).ToDictionary(x => x.Row.Id);

        var applicationIds = inputs.Where(i => i.EnrollmentId is null && i.ApplicationId is not null).Select(i => i.ApplicationId!.Value).Distinct().ToList();
        var applications = applicationIds.Count == 0 || !allowApplications
            ? new List<Application>()
            : await db.Applications.AsNoTracking().Where(x => applicationIds.Contains(x.Id)).ToListAsync(ct);
        // Ön başvurular yalnızca SMS'te (allowApplications) alıcı olabilir
        var preIds = inputs.Where(i => i.EnrollmentId is null && i.ApplicationId is null && i.PreRegistrationId is not null)
            .Select(i => i.PreRegistrationId!.Value).Distinct().ToList();
        var preRegistrations = preIds.Count == 0 || !allowApplications
            ? new List<PreRegistration>()
            : await db.PreRegistrations.AsNoTracking().Where(x => preIds.Contains(x.Id)).ToListAsync(ct);

        var typeIds = applications.Select(a => a.RoomTypeId)
            .Concat(preRegistrations.Where(p => p.RoomTypeId != null).Select(p => p.RoomTypeId!.Value))
            .Distinct().ToList();
        var typeNames = typeIds.Count == 0
            ? new Dictionary<Guid, LocalizedText>()
            : (await db.RoomTypes.AsNoTracking().IgnoreQueryFilters().Where(x => typeIds.Contains(x.Id)).ToListAsync(ct)).ToDictionary(x => x.Id, x => x.Name);

        foreach (var input in inputs)
        {
            // İstemciden gelen değişkenler: yalnızca izin verilen anahtarlar, kısa ve tek satır
            var extra = new Dictionary<string, string>();
            foreach (var (key, value) in input.Vars ?? new Dictionary<string, string>())
            {
                if (!ClientVars.Contains(key) || string.IsNullOrWhiteSpace(value)) continue;
                var clean = value.Replace('\n', ' ').Replace('\r', ' ').Trim();
                extra[key] = clean.Length > MaxVarLength ? clean[..MaxVarLength] : clean;
            }

            if (input.EnrollmentId is { } enrollmentId)
            {
                if (!rows.TryGetValue(enrollmentId, out var r))
                {
                    skipped.Add(new SkippedRecipient(enrollmentId, null, "", "Kayıt bulunamadı"));
                    continue;
                }

                var (row, ledger) = r;
                var name = $"{row.Student.FirstName} {row.Student.LastName}".Trim();
                LedgerItem? item = null;
                if (input.ChargeId is { } chargeId)
                {
                    item = ledger.Items.FirstOrDefault(i => i.Id == chargeId);
                    if (item is null)
                    {
                        skipped.Add(new SkippedRecipient(enrollmentId, null, name, "Borç kalemi bu kayda ait değil"));
                        continue;
                    }
                }

                Dictionary<string, string> Vars(bool english)
                {
                    var vars = new Dictionary<string, string>
                    {
                        ["ad"] = row.Student.FirstName,
                        ["telefon"] = row.Student.Phone,
                        ["oda"] = row.Room?.Label ?? (english ? "your room" : "odanız"),
                        ["tutar"] = FormatMoney(item?.Remaining ?? ledger.Remaining),
                        ["vade"] = item is not null ? FormatDate(item.Deadline) : ledger.Next is not null ? FormatDate(ledger.Next.Deadline) : "",
                        ["kalem"] = item is not null ? ChargeLabel(item, english) : (english ? "payment" : "ödeme")
                    };
                    foreach (var (k, v) in extra) vars[k] = v;
                    return vars;
                }

                found.Add(new ResolvedRecipient(enrollmentId, null, row.Student.Id, row.PeriodId, name, row.Student.Phone,
                    Vars(false), Vars(true), [.. extra.Keys.Where(SecretVars.Contains)]));
                continue;
            }

            if (input.ApplicationId is { } applicationId)
            {
                var app = applications.FirstOrDefault(a => a.Id == applicationId);
                if (app is null)
                {
                    skipped.Add(new SkippedRecipient(null, applicationId, "", allowApplications ? "Başvuru bulunamadı" : "Bu kanal yalnızca kayıtlı öğrencilere gönderilir"));
                    continue;
                }

                Dictionary<string, string> Vars(bool english)
                {
                    var type = typeNames.GetValueOrDefault(app.RoomTypeId);
                    var vars = new Dictionary<string, string>
                    {
                        ["ad"] = app.Applicant.FirstName,
                        ["telefon"] = app.Phone,
                        ["oda"] = (english ? type?.En : type?.Tr) is { Length: > 0 } t ? t : (english ? "your room" : "odanız")
                    };
                    foreach (var (k, v) in extra) vars[k] = v;
                    return vars;
                }

                found.Add(new ResolvedRecipient(null, applicationId, null, app.PeriodId, app.FullName, app.Phone,
                    Vars(false), Vars(true), [.. extra.Keys.Where(SecretVars.Contains)]));
                continue;
            }

            if (input.PreRegistrationId is { } preId)
            {
                var pre = preRegistrations.FirstOrDefault(p => p.Id == preId);
                if (pre is null)
                {
                    skipped.Add(new SkippedRecipient(null, null, "", allowApplications ? "Ön başvuru bulunamadı" : "Bu kanal yalnızca kayıtlı öğrencilere gönderilir"));
                    continue;
                }

                Dictionary<string, string> Vars(bool english)
                {
                    var type = pre.RoomTypeId is { } typeId ? typeNames.GetValueOrDefault(typeId) : null;
                    var vars = new Dictionary<string, string>
                    {
                        ["ad"] = pre.FullName.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? pre.FullName,
                        ["telefon"] = pre.Phone,
                        ["oda"] = (english ? type?.En : type?.Tr) is { Length: > 0 } t ? t : (english ? "our rooms" : "odalarımız")
                    };
                    foreach (var (k, v) in extra) vars[k] = v;
                    return vars;
                }

                found.Add(new ResolvedRecipient(null, null, null, null, pre.FullName, pre.Phone,
                    Vars(false), Vars(true), [.. extra.Keys.Where(SecretVars.Contains)], preId));
                continue;
            }

            skipped.Add(new SkippedRecipient(null, null, "", "Alıcı belirtilmemiş"));
        }

        return (found, skipped);
    }
}
