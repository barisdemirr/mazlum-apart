using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class RoomConfiguration : IEntityTypeConfiguration<Room>
{
    public void Configure(EntityTypeBuilder<Room> builder)
    {
        builder.ToTable("Rooms", t => t.HasCheckConstraint("CK_Rooms_Beds", "[Beds] BETWEEN 1 AND 12"));

        builder.Property(x => x.Name).HasMaxLength(60).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.Features).HasJsonConversion();

        builder.HasOne(x => x.RoomType).WithMany().HasForeignKey(x => x.RoomTypeId).OnDelete(DeleteBehavior.Restrict);

        // Bir dairede aynı adda iki oda olamaz
        builder.HasIndex(x => new { x.ApartmentId, x.Name }).IsUnique().HasFilter("[DeletedAt] IS NULL");
        builder.HasIndex(x => x.RoomTypeId);
    }
}
