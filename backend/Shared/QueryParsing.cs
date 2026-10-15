namespace MazlumApart.Shared;

public static class QueryParsing
{
    /// <summary>"extra_stay", "ExtraStay", "extrastay" hepsi ChargeKind.ExtraStay olur</summary>
    public static bool TryParseEnum<T>(string? raw, out T value) where T : struct, Enum
    {
        value = default;
        if (string.IsNullOrWhiteSpace(raw)) return false;
        var normalized = raw.Replace("_", "").Replace("-", "");
        return Enum.TryParse(normalized, ignoreCase: true, out value) && Enum.IsDefined(value);
    }
}
