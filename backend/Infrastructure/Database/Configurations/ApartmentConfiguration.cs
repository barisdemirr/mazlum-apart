using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class ApartmentConfiguration : IEntityTypeConfiguration<Apartment>
{
    public void Configure(EntityTypeBuilder<Apartment> builder)
    {
        builder.ToTable("Apartments");

        builder.Property(x => x.Name).HasMaxLength(60).IsRequired();
        builder.Property(x => x.Slug).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.SharedAreas).HasJsonConversion();

        builder.HasMany(x => x.Rooms).WithOne(x => x.Apartment).HasForeignKey(x => x.ApartmentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Media).WithOne().HasForeignKey(x => x.ApartmentId).OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<ApartmentType>().WithMany().HasForeignKey(x => x.ApartmentTypeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => x.ApartmentTypeId);
        builder.HasIndex(x => x.Slug).IsUnique().HasFilter("[DeletedAt] IS NULL");
        builder.HasIndex(x => x.Name).IsUnique().HasFilter("[DeletedAt] IS NULL");
    }
}
