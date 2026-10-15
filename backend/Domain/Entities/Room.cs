using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Domain.Entities;

/// <summary>Fiziksel oda ("1. Sol Oda"). Oda tipi oda bazındadır: bir dairede farklı tipte odalar olabilir.</summary>
public class Room : BaseEntity
{
    public Guid ApartmentId { get; set; }
    public Apartment? Apartment { get; set; }

    public Guid RoomTypeId { get; set; }
    public RoomType? RoomType { get; set; }

    public string Name { get; set; } = "";
    public int Beds { get; set; } = 1;
    public RoomStatus Status { get; set; } = RoomStatus.Active;
    public List<FeatureItem> Features { get; set; } = [];
}
