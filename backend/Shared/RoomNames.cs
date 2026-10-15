using System.Text.RegularExpressions;
using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Shared;

/// <summary>Oda/daire/yatak adlarının İngilizce karşılıkları (frontend lib/gallery.js roomNameEn ile aynı kural)</summary>
public static partial class RoomNames
{
    [GeneratedRegex(@"^(?:(\d+)\.\s*)?(?:(sol|sağ|sag)\s+)?oda$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex RoomPattern();

    [GeneratedRegex(@"^daire\s*(\d+)$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex FlatPattern();

    /// <summary>"1. Sol Oda" -> "1st Left Room", "Sağ Oda" -> "Right Room"; bilinmeyen ad aynen kalır</summary>
    public static string RoomEn(string trName)
    {
        var name = trName.Trim();
        var match = RoomPattern().Match(name);
        if (!match.Success) return name;

        var parts = new List<string>();
        if (match.Groups[1].Success)
        {
            var n = int.Parse(match.Groups[1].Value);
            parts.Add(n switch { 1 => "1st", 2 => "2nd", 3 => "3rd", _ => $"{n}th" });
        }
        if (match.Groups[2].Success)
            parts.Add(match.Groups[2].Value.ToLowerInvariant() == "sol" ? "Left" : "Right");
        parts.Add("Room");
        return string.Join(' ', parts);
    }

    public static LocalizedText Room(string trName) => new() { Tr = trName, En = RoomEn(trName) };

    /// <summary>"Daire 3" -> { tr: "Daire 3", en: "Flat 3" }</summary>
    public static LocalizedText Apartment(string name)
    {
        var match = FlatPattern().Match(name.Trim());
        return new LocalizedText { Tr = name, En = match.Success ? $"Flat {match.Groups[1].Value}" : name };
    }

    /// <summary>Yatak etiketi: tek yatak "Yatak"; iki yatak "Sol / Sağ yatak"; fazlası "1. yatak"...</summary>
    public static LocalizedText Bed(int bedCount, int index) => bedCount switch
    {
        1 => new() { Tr = "Yatak", En = "Bed" },
        2 => index == 0 ? new() { Tr = "Sol yatak", En = "Left bed" } : new() { Tr = "Sağ yatak", En = "Right bed" },
        _ => new() { Tr = $"{index + 1}. yatak", En = $"Bed {index + 1}" }
    };
}
