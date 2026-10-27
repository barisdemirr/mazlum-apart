namespace MazlumApart.Domain.Entities;

/// <summary>
/// Öğrenci profiline sonradan yüklenen belge (sözleşme, kimlik fotokopisi, öğrenci belgesi vb.; PDF).
/// Başvuruda alınan belge ayrıca kopyalanmaz: Application.DocumentPath üzerinden öğrenci profilinde otomatik görünür.
/// Belge öğrenciye bağlıdır (dönem değil): dönem yenilemede de eski belgeler profilde kalır. EnrollmentId, belgenin hangi dönem kaydında yüklendiğini gösterir.
/// </summary>
public class StudentDocument : BaseEntity
{
    public Guid StudentId { get; set; }
    public Guid? EnrollmentId { get; set; }
    public string Title { get; set; } = "";

    /// <summary>DocumentStorage yolu (istemciye gösterilmez; belge yönetici ucundan sunulur)</summary>
    public string Path { get; set; } = "";
    public string FileName { get; set; } = "";
    public long Size { get; set; }
    public string Sha256 { get; set; } = "";
    public Guid? UploadedById { get; set; }
}
