using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class SlideConfiguration : IEntityTypeConfiguration<Slide>
{
    public void Configure(EntityTypeBuilder<Slide> builder)
    {
        builder.ToTable("Slides");

        builder.Property(x => x.Title).HasJsonConversion();
        builder.Property(x => x.Subtitle).HasJsonConversion();

        builder.HasOne(x => x.Media).WithMany().HasForeignKey(x => x.MediaId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => new { x.IsActive, x.OrderIndex });
    }
}
