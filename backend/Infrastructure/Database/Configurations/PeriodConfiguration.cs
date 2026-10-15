using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class PeriodConfiguration : IEntityTypeConfiguration<Period>
{
    public void Configure(EntityTypeBuilder<Period> builder)
    {
        builder.ToTable("Periods", t => t.HasCheckConstraint("CK_Periods_Dates", "[StartDate] < [EndDate]"));

        builder.Property(x => x.Name).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Type).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(10);

        builder.HasIndex(x => x.Name).IsUnique().HasFilter("[DeletedAt] IS NULL");
        builder.HasIndex(x => new { x.Status, x.StartDate });
    }
}
