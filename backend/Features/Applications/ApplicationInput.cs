using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Shared;

namespace MazlumApart.Features.Applications;

/// <summary>
/// Başvuru girişi. Web formu (frontend services/applications.js submitApplication) ve ofis kaydı aynı alanları kullanır.
/// Web: roomSlug + bedId? + payDay. Ofis: roomTypeId + payWindow (+ periodId). İkisinden biri yeterli.
/// </summary>
public record ApplicationInput(
    Guid? PeriodId,
    string? RoomSlug,
    Guid? RoomTypeId,
    string? BedId,
    string? Term,
    DateOnly? EntryDate,
    string? PayDay,
    string? PayWindow,
    string? FirstName,
    string? LastName,
    string? Tc,
    DateOnly? BirthDate,
    string? Phone,
    string? Address,
    int? ProvinceId,
    string? District,
    string? School,
    string? Faculty,
    string? Department,
    string? Grade,
    List<GuardianInput>? Guardians,
    string? Note);

public record GuardianInput(string? Name, string? Phone);

public static class ApplicantRules
{
    public static readonly string[] Grades = ["prep", "1", "2", "3", "4", "5", "6"];

    /// <summary>
    /// Müşterinin kayıt formu alanlarını doğrular ve temizler (frontend registration.js normalizeStudent ile aynı kurallar):
    /// ad, soyad, T.C., doğum tarihi, telefon, ikamet adresi, il, ilçe, okul, fakülte, bölüm, sınıf, en az 1 veli (ad + telefon).
    /// </summary>
    public static ApplicantInfo? Normalize(ApplicationInput input, Validator v)
    {
        static string T(string? value) => value?.Trim() ?? "";

        var tc = T(input.Tc);
        var phone = TurkishFormats.NormalizeMobile(input.Phone);
        var today = TurkeyClock.Today;

        v.Must("tc", TurkishFormats.IsValidTc(tc), "Geçerli bir T.C. kimlik no girin.")
         .Required("firstName", T(input.FirstName), "Ad zorunlu.").MaxLength("firstName", T(input.FirstName), 60)
         .Required("lastName", T(input.LastName), "Soyad zorunlu.").MaxLength("lastName", T(input.LastName), 60)
         .Must("birthDate", input.BirthDate is { } b && b < today && b >= new DateOnly(1940, 1, 1), "Doğum tarihini geçerli girin.")
         .Must("phone", phone is not null, "Telefon 5 ile başlayan 10 haneli olmalı.")
         .Must("address", T(input.Address).Length >= 10, "İkamet adresini ayrıntılı yazın.").MaxLength("address", T(input.Address), 400)
         .Must("provinceId", input.ProvinceId is { } pid && TurkeyLocations.Find(pid) is not null, "İl seçin.")
         .Must("district", input.ProvinceId is { } p && TurkeyLocations.IsValid(p, T(input.District)), "İlçe seçin.")
         .Required("school", T(input.School), "Okulu yazın.").MaxLength("school", T(input.School), 150)
         .Required("faculty", T(input.Faculty), "Fakülteyi yazın.").MaxLength("faculty", T(input.Faculty), 150)
         .Required("department", T(input.Department), "Bölümü yazın.").MaxLength("department", T(input.Department), 150)
         .Must("grade", Grades.Contains(T(input.Grade)), "Sınıfı seçin.");

        var guardians = (input.Guardians ?? []).Where(g => g is not null).ToList();
        if (guardians.Count == 0) v.AddError("guardians", "En az bir veli bilgisi girin.");
        if (guardians.Count > 4) v.AddError("guardians", "En fazla 4 veli eklenebilir.");

        var cleaned = new List<GuardianInfo>();
        for (var i = 0; i < guardians.Count && i < 4; i++)
        {
            var name = T(guardians[i].Name);
            var gPhone = TurkishFormats.NormalizeMobile(guardians[i].Phone);
            v.Required($"guardians[{i}].name", name, "Veli adı soyadı zorunlu.").MaxLength($"guardians[{i}].name", name, 120)
             .Must($"guardians[{i}].phone", gPhone is not null, "Veli telefonu 5 ile başlayan 10 haneli olmalı.");
            cleaned.Add(new GuardianInfo { Name = name, Phone = gPhone ?? "" });
        }

        if (!v.IsValid) return null;

        var province = TurkeyLocations.Find(input.ProvinceId!.Value)!;
        return new ApplicantInfo
        {
            Tc = tc,
            FirstName = T(input.FirstName),
            LastName = T(input.LastName),
            BirthDate = input.BirthDate!.Value,
            Phone = phone!,
            Address = T(input.Address),
            ProvinceId = province.Id,
            Province = province.Name,
            District = T(input.District),
            School = T(input.School),
            Faculty = T(input.Faculty),
            Department = T(input.Department),
            Grade = T(input.Grade),
            Guardians = cleaned
        };
    }

    public static StayTerm? ParseTerm(string? value) =>
        string.IsNullOrWhiteSpace(value) ? StayTerm.Full : QueryParsing.TryParseEnum<StayTerm>(value, out var t) ? t : null;

    public static PayWindow? ParsePayWindow(string? value) =>
        string.IsNullOrWhiteSpace(value) ? Domain.Enums.PayWindow.Early : QueryParsing.TryParseEnum<PayWindow>(value, out var w) ? w : null;
}
