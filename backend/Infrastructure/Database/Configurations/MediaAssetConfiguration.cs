using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class MediaAssetConfiguration : IEntityTypeConfiguration<MediaAsset>
{
    public void Configure(EntityTypeBuilder<MediaAsset> builder)
    {
        builder.ToTable("MediaAssets");

        builder.Property(x => x.Kind).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.FileName).HasMaxLength(255).IsRequired();
        builder.Property(x => x.FilePath).HasMaxLength(300).IsRequired();
        builder.Property(x => x.PosterPath).HasMaxLength(300);
        builder.Property(x => x.MimeType).HasMaxLength(50).IsRequired();
        builder.Property(x => x.AltText).HasJsonConversion();

        builder.HasOne<AdminUser>()
            .WithMany()
            .HasForeignKey(x => x.UploadedById)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.Kind, x.CreatedAt });
    }
}
