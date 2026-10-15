using System.Text.RegularExpressions;

namespace MazlumApart.Shared;

/// <summary>Türkiye'ye özgü biçim doğrulamaları (frontend lib/application.js ile aynı kurallar)</summary>
public static partial class TurkishFormats
{
    [GeneratedRegex(@"^5\d{9}$")]
    private static partial Regex MobileRegex();

    /// <summary>
    /// Telefonu 10 haneye indirir: "+90 555 123 45 67", "0555 123 45 67", "5551234567" -> "5551234567".
    /// Geçerli bir cep numarası değilse null.
    /// </summary>
    public static string? NormalizeMobile(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var digits = new string(value.Where(char.IsAsciiDigit).ToArray());
        if (digits.StartsWith("90") && digits.Length == 12) digits = digits[2..];
        if (digits.StartsWith('0') && digits.Length == 11) digits = digits[1..];
        return MobileRegex().IsMatch(digits) ? digits : null;
    }

    public static bool IsMobile(string? value) => value is not null && MobileRegex().IsMatch(value);

    /// <summary>SMS sağlayıcısının istediği biçim: 905XXXXXXXXX</summary>
    public static string ToInternational(string mobile10) => "90" + mobile10;

    /// <summary>T.C. kimlik no: 11 hane, ilk hane 0 olamaz, 10. ve 11. hane sağlaması</summary>
    public static bool IsValidTc(string? value)
    {
        if (value is null || value.Length != 11 || !value.All(char.IsAsciiDigit) || value[0] == '0') return false;

        var d = value.Select(c => c - '0').ToArray();
        var odd = d[0] + d[2] + d[4] + d[6] + d[8];
        var even = d[1] + d[3] + d[5] + d[7];
        var tenth = ((odd * 7 - even) % 10 + 10) % 10;
        if (tenth != d[9]) return false;

        return d.Take(10).Sum() % 10 == d[10];
    }

    /// <summary>TR IBAN: TR + 24 hane ve mod-97 sağlaması</summary>
    public static bool IsValidIban(string? iban)
    {
        if (iban is null || iban.Length != 26 || !iban.StartsWith("TR") || !iban[2..].All(char.IsAsciiDigit)) return false;

        var rearranged = iban[4..] + iban[..4];
        var remainder = 0;
        foreach (var ch in rearranged)
        {
            var chunk = char.IsAsciiLetter(ch) ? (ch - 'A' + 10).ToString() : ch.ToString();
            foreach (var digit in chunk) remainder = (remainder * 10 + (digit - '0')) % 97;
        }

        return remainder == 1;
    }
}
