using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class DiscountCodeConfiguration : IEntityTypeConfiguration<DiscountCode>
{
    public void Configure(EntityTypeBuilder<DiscountCode> builder)
    {
        builder.ToTable("DiscountCodes", t => t.HasCheckConstraint("CK_DiscountCodes_Value", "[Value] > 0"));

        builder.Property(x => x.Code).HasMaxLength(20).IsRequired();
        builder.Property(x => x.Label).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Kind).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.Tc).HasMaxLength(11).IsFixedLength();

        builder.HasIndex(x => x.Code).IsUnique().HasFilter("[DeletedAt] IS NULL");
    }
}
