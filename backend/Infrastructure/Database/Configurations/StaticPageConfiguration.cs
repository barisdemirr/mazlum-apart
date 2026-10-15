using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class StaticPageConfiguration : IEntityTypeConfiguration<StaticPage>
{
    public void Configure(EntityTypeBuilder<StaticPage> builder)
    {
        builder.ToTable("StaticPages");

        builder.Property(x => x.Key).HasMaxLength(40).IsRequired();
        builder.Property(x => x.Title).HasJsonConversion();
        builder.Property(x => x.Body).HasJsonConversion();

        builder.HasIndex(x => x.Key).IsUnique().HasFilter("[DeletedAt] IS NULL");
    }
}
