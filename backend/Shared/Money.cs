namespace MazlumApart.Shared;

/// <summary>Para ve ay alanlarının ortak kuralları (tüm muhasebe komutları aynı mesajı verir)</summary>
public static class Money
{
    /// <summary>Tek işlemde girilebilecek en yüksek tutar (yanlışlıkla fazladan sıfır yazılmasına karşı)</summary>
    public const decimal Max = 10_000_000m;

    /// <summary>Tutar geçerliyse null, değilse hata mesajı döner</summary>
    public static string? Check(decimal value)
    {
        if (value <= 0) return "Tutar sıfırdan büyük olmalı.";
        if (value > Max) return $"Tutar en fazla {Max:N0} ₺ olabilir.";
        if (decimal.Round(value, 2) != value) return "Tutar en fazla 2 ondalık basamak olabilir.";
        return null;
    }

    /// <summary>"2026-10" biçiminde ay mı?</summary>
    public static bool IsMonth(string? value) =>
        value is { Length: 7 } && DateOnly.TryParseExact(value + "-01", "yyyy-MM-dd", out _);

    public static string MonthOf(DateOnly day) => $"{day.Year:D4}-{day.Month:D2}";
}
