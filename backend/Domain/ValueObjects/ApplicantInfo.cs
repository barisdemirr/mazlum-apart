using System.Text.Json.Serialization;

namespace MazlumApart.Domain.ValueObjects;

/// <summary>
/// Başvuru formunun öğrenci kısmının KOPYASI (başvuru anındaki hali). Başvuru onaylanınca bu bilgilerle öğrenci
/// kaydı açılır ya da güncellenir. Form alanları müşterinin listesidir.
/// </summary>
public sealed record ApplicantInfo
{
    [JsonPropertyName("tc")] public string Tc { get; init; } = "";
    [JsonPropertyName("firstName")] public string FirstName { get; init; } = "";
    [JsonPropertyName("lastName")] public string LastName { get; init; } = "";
    [JsonPropertyName("birthDate")] public DateOnly BirthDate { get; init; }
    [JsonPropertyName("phone")] public string Phone { get; init; } = "";
    [JsonPropertyName("address")] public string Address { get; init; } = "";
    [JsonPropertyName("provinceId")] public int ProvinceId { get; init; }
    [JsonPropertyName("province")] public string Province { get; init; } = "";
    [JsonPropertyName("district")] public string District { get; init; } = "";
    [JsonPropertyName("school")] public string School { get; init; } = "";
    [JsonPropertyName("faculty")] public string Faculty { get; init; } = "";
    [JsonPropertyName("department")] public string Department { get; init; } = "";
    [JsonPropertyName("grade")] public string Grade { get; init; } = "";
    [JsonPropertyName("guardians")] public List<GuardianInfo> Guardians { get; init; } = [];
}

public sealed record GuardianInfo
{
    [JsonPropertyName("name")] public string Name { get; init; } = "";
    [JsonPropertyName("phone")] public string Phone { get; init; } = "";
}
