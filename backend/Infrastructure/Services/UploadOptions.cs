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

    /// <summary>Öğrenci belgesi (PDF) en fazla (MB). Vercel vekilinin istek sınırı ~4,5 MB olduğu için 4'ün üstüne çıkarılmamalı.</summary>
    public int MaxDocumentMb { get; set; } = 4;

    public long MaxImageBytes => MaxImageMb * 1024L * 1024L;
    public long MaxDocumentBytes => MaxDocumentMb * 1024L * 1024L;
    public long MaxVideoBytes => MaxVideoMb * 1024L * 1024L;
}
