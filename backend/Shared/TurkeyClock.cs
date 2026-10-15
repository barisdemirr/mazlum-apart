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
}
