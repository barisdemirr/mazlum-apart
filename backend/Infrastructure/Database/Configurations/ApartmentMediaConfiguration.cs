using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class ApartmentMediaConfiguration : IEntityTypeConfiguration<ApartmentMedia>
{
    public void Configure(EntityTypeBuilder<ApartmentMedia> builder)
    {
        builder.ToTable("ApartmentMedia");

        builder.Property(x => x.TagKind).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.AreaKey).HasMaxLength(20);
        builder.Property(x => x.CustomLabel).HasJsonConversion();
        builder.Property(x => x.Caption).HasJsonConversion();

        builder.HasOne(x => x.MediaAsset).WithMany().HasForeignKey(x => x.MediaAssetId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Room>().WithMany().HasForeignKey(x => x.RoomId).OnDelete(DeleteBehavior.NoAction);

        // Müşteri kuralı veritabanında da garanti: her dairede en fazla 1 video
        builder.HasIndex(x => x.ApartmentId).IsUnique()
            .HasFilter("[IsVideo] = 1 AND [DeletedAt] IS NULL")
            .HasDatabaseName("UX_ApartmentMedia_OneVideoPerApartment");

        // Aynı dosya aynı daireye iki kez eklenemez
        builder.HasIndex(x => new { x.ApartmentId, x.MediaAssetId }).IsUnique().HasFilter("[DeletedAt] IS NULL");
    }
}
