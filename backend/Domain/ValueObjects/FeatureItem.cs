using System.Text.Json.Serialization;

namespace MazlumApart.Domain.ValueObjects;

/// <summary>İkonlu madde: oda özelliği (yatak, masa...) ya da dairenin ortak alanı (mutfak, balkon...)</summary>
public sealed record FeatureItem
{
    [JsonPropertyName("icon")] public string Icon { get; init; } = "check_circle";
    [JsonPropertyName("text")] public LocalizedText Text { get; init; } = new();
}
