using MazlumApart.Domain.Enums;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// Ön başvuru: dolu oda ilanında "yeni dönem fiyatları açıklanınca bana haber verin" diyen ziyaretçi.
/// Gerçek başvuru değildir (T.C., veli vb. yoktur); dönemden bağımsızdır. Fiyatlar açıklanınca panelden aranır / SMS gönderilir.
/// Phone: 10 hane (5XXXXXXXXX). Aynı numara + aynı oda tipi için açık kayıt varsa yenisi açılmaz, mevcut güncellenir.
/// </summary>
public class PreRegistration : BaseEntity
{
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public Guid? RoomTypeId { get; set; }
    public string? Note { get; set; }
    public string Lang { get; set; } = "tr";
    public PreRegistrationStatus Status { get; set; } = PreRegistrationStatus.New;

    /// <summary>Son bilgilendirme (SMS gönderimi ya da "bilgilendirildi" işareti)</summary>
    public DateTime? ContactedAt { get; set; }
    public string? AdminNote { get; set; }
    public string? Ip { get; set; }
}
