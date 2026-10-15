using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Shared;

public static class LocalizedExtensions
{
    public static bool IsBlank(this LocalizedText? text) =>
        text is null || (string.IsNullOrWhiteSpace(text.Tr) && string.IsNullOrWhiteSpace(text.En));

    /// <summary>Tamamen boşsa null, değilse kırpılmış hali</summary>
    public static LocalizedText? OrNull(this LocalizedText? text) => text.IsBlank() ? null : text!.Trimmed();

    public static LocalizedText Trimmed(this LocalizedText text) =>
        new() { Tr = text.Tr?.Trim() ?? "", En = string.IsNullOrWhiteSpace(text.En) ? null : text.En.Trim() };
}
