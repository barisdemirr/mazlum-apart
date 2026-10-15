using System.Text;
using System.Text.RegularExpressions;

namespace MazlumApart.Shared;

public static class SlugHelper
{
    private static readonly Dictionary<char, string> Turkish = new()
    {
        ['ç'] = "c", ['Ç'] = "c", ['ğ'] = "g", ['Ğ'] = "g", ['ı'] = "i", ['İ'] = "i",
        ['ö'] = "o", ['Ö'] = "o", ['ş'] = "s", ['Ş'] = "s", ['ü'] = "u", ['Ü'] = "u"
    };

    private static readonly Regex Valid = new("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.Compiled);

    public static bool IsValid(string? slug) => slug is not null && Valid.IsMatch(slug);

    /// <summary>"İki Kişilik Oda" -> "iki-kisilik-oda" (en fazla 90 karakter)</summary>
    public static string From(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "";

        var sb = new StringBuilder();
        var lastWasDash = true;

        foreach (var raw in text.Trim())
        {
            var piece = Turkish.TryGetValue(raw, out var mapped) ? mapped : char.ToLowerInvariant(raw).ToString();
            foreach (var c in piece)
            {
                if (c is (>= 'a' and <= 'z') or (>= '0' and <= '9'))
                {
                    sb.Append(c);
                    lastWasDash = false;
                }
                else if (!lastWasDash)
                {
                    sb.Append('-');
                    lastWasDash = true;
                }
            }
        }

        var slug = sb.ToString().Trim('-');
        return slug.Length > 90 ? slug[..90].Trim('-') : slug;
    }
}
