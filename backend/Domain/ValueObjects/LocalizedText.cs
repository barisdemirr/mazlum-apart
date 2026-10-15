using System.Text.Json.Serialization;

namespace MazlumApart.Domain.ValueObjects;

/// <summary>Çok dilli metin (TR zorunlu, EN isteğe bağlı). Veritabanında JSON olarak tutulur: {"tr":"...","en":"..."}</summary>
public sealed record LocalizedText
{
    [JsonPropertyName("tr")] public string Tr { get; init; } = "";
    [JsonPropertyName("en")] public string? En { get; init; }

    /// <summary>Kural: field[lang] ?? field.tr</summary>
    public string Get(string lang) => lang == "en" && !string.IsNullOrWhiteSpace(En) ? En! : Tr;
}
