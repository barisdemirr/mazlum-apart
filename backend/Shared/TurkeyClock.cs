namespace MazlumApart.Shared;

/// <summary>
/// İş kuralları Türkiye saatine göredir (kalıcı UTC+3). Zaman damgaları veritabanında UTC tutulur;
/// "bugün", vade ve gecikme hesapları ise yerel takvim gününe göre yapılır.
/// </summary>
public static class TurkeyClock
{
    private static readonly TimeSpan Offset = TimeSpan.FromHours(3);

    public static DateTime LocalNow => DateTime.UtcNow + Offset;
    public static DateOnly Today => DateOnly.FromDateTime(LocalNow);

    /// <summary>Türkiye günü başlangıcının UTC karşılığı (ör. "bugün gönderilen SMS'ler" sorgusu için)</summary>
    public static DateTime StartOfDayUtc(DateOnly day) => day.ToDateTime(TimeOnly.MinValue) - Offset;

    /// <summary>Türkiye yerel saatini (sağlayıcıların "2026-10-15 16:06:00" biçimi) UTC'ye çevirir</summary>
    public static DateTime LocalToUtc(DateTime local) => DateTime.SpecifyKind(local - Offset, DateTimeKind.Utc);
}
