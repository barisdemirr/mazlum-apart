using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class RoomTypeConfiguration : IEntityTypeConfiguration<RoomType>
{
    public void Configure(EntityTypeBuilder<RoomType> builder)
    {
        builder.ToTable("RoomTypes");

        builder.Property(x => x.Slug).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Name).HasJsonConversion();
        builder.Property(x => x.Description).HasJsonConversion();

        builder.HasOne(x => x.CoverMedia).WithMany().HasForeignKey(x => x.CoverMediaId).OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => x.Slug).IsUnique().HasFilter("[DeletedAt] IS NULL");
    }
}
