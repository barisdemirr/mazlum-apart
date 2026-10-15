using System.Text;

namespace MazlumApart.Infrastructure.Messaging;

/// <summary>
/// SMS metni kuralları (Verimor SMS boy tablosu). Verimor datacoding'i metne bakarak seçer:
///   Normal (0): GSM 7-bit karakterler       → 1 boy 160, çok boyda her boy 153 (toplam 306, 459, ...)
///   Türkçe (1): Ş ş Ğ ğ ç ı İ varsa          → 1 boy 155, çok boyda her boy 149 (toplam 298, 447, ...)
///   ^ { } \ [ ] ~ | € karakterleri 2 karakter sayılır.
/// Emoji gibi GSM dışı karakterler bu kodlamalarda bozulur: önce yaygın olanlar dönüştürülür (“ ” → ", ’ → ', … → ...),
/// kalan desteklenmeyen karakter varsa mesaj reddedilir.
/// </summary>
public static class SmsText
{
    private const string Basic =
        "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
    private const string Extended = "^{}\\[]~|€";
    private const string Turkish = "ŞşĞğçıİ";

    private static readonly Dictionary<char, string> Replacements = new()
    {
        ['“'] = "\"", ['”'] = "\"", ['„'] = "\"", ['«'] = "\"", ['»'] = "\"",
        ['‘'] = "'", ['’'] = "'", ['`'] = "'", ['´'] = "'",
        ['–'] = "-", ['—'] = "-", ['…'] = "...", [' '] = " ", ['\t'] = " ",
        ['â'] = "a", ['Â'] = "A", ['î'] = "i", ['Î'] = "I", ['û'] = "u", ['Û'] = "U",
        ['₺'] = "TL"
    };

    public sealed record Analysis(string Text, int Length, int Parts, bool Turkish, string? Error);

    /// <summary>Metni normalleştirir, desteklenmeyen karakteri bulur, boy sayısını hesaplar</summary>
    public static Analysis Analyze(string raw)
    {
        var sb = new StringBuilder(raw.Length);
        foreach (var ch in raw.Replace("\r\n", "\n"))
        {
            if (Replacements.TryGetValue(ch, out var replacement)) sb.Append(replacement);
            else sb.Append(ch);
        }
        var text = sb.ToString().Trim();

        var length = 0;
        var turkish = false;
        foreach (var ch in text)
        {
            if (Basic.Contains(ch)) length += 1;
            else if (Extended.Contains(ch)) length += 2;
            else if (Turkish.Contains(ch)) { length += 1; turkish = true; }
            else return new Analysis(text, 0, 0, false, $"Mesajda SMS ile gönderilemeyen karakter var: “{ch}”.");
        }

        if (length == 0) return new Analysis(text, 0, 0, turkish, "Mesaj boş.");

        var (single, multi) = turkish ? (155, 149) : (160, 153);
        var parts = length <= single ? 1 : (int)Math.Ceiling(length / (double)multi);
        if (parts > 7) return new Analysis(text, length, parts, turkish, "Mesaj çok uzun (en fazla 7 SMS boyu).");
        return new Analysis(text, length, parts, turkish, null);
    }
}
