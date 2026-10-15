using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class SiteSettingConfiguration : IEntityTypeConfiguration<SiteSetting>
{
    public void Configure(EntityTypeBuilder<SiteSetting> builder)
    {
        builder.ToTable("SiteSettings");

        builder.Property(x => x.Phone).HasMaxLength(10);
        builder.Property(x => x.Whatsapp).HasMaxLength(10);
        builder.Property(x => x.Email).HasMaxLength(256);
        builder.Property(x => x.Address).HasJsonConversion();
        builder.Property(x => x.MapUrl).HasMaxLength(1000);
        builder.Property(x => x.Instagram).HasMaxLength(200);
        builder.Property(x => x.Iban).HasMaxLength(26);
        builder.Property(x => x.IbanHolder).HasMaxLength(150);

        builder.HasOne<MediaAsset>().WithMany().HasForeignKey(x => x.HeroVideoMediaId).OnDelete(DeleteBehavior.NoAction);
        builder.HasOne<MediaAsset>().WithMany().HasForeignKey(x => x.MapMediaId).OnDelete(DeleteBehavior.NoAction);
    }
}
