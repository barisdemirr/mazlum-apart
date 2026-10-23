using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class PreRegistrationConfiguration : IEntityTypeConfiguration<PreRegistration>
{
    public void Configure(EntityTypeBuilder<PreRegistration> builder)
    {
        builder.ToTable("PreRegistrations");

        builder.Property(x => x.FullName).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Phone).HasMaxLength(10).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.Lang).HasMaxLength(5);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(12);
        builder.Property(x => x.AdminNote).HasMaxLength(500);
        builder.Property(x => x.Ip).HasMaxLength(64);

        builder.HasOne<RoomType>().WithMany().HasForeignKey(x => x.RoomTypeId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.Status, x.CreatedAt });
        builder.HasIndex(x => x.Phone);
    }
}
