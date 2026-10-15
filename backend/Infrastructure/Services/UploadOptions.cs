namespace MazlumApart.Infrastructure.Services;

/// <summary>appsettings "Uploads" bölümü: yükleme sınırları</summary>
public class UploadOptions
{
    /// <summary>Görsel dosyası en fazla (MB)</summary>
    public int MaxImageMb { get; set; } = 15;

    /// <summary>Video dosyası en fazla (MB). Frontend 720p / ~1,5 Mbps'e sıkıştırır: 3 dk ≈ 35 MB</summary>
    public int MaxVideoMb { get; set; } = 60;

    /// <summary>Video süresi en fazla (saniye)</summary>
    public int MaxVideoSeconds { get; set; } = 180;

    public long MaxImageBytes => MaxImageMb * 1024L * 1024L;
    public long MaxVideoBytes => MaxVideoMb * 1024L * 1024L;
}
