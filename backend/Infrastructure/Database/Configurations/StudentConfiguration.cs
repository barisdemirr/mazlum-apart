using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class StudentConfiguration : IEntityTypeConfiguration<Student>
{
    public void Configure(EntityTypeBuilder<Student> builder)
    {
        builder.ToTable("Students");

        builder.Property(x => x.Tc).HasMaxLength(11).IsFixedLength().IsRequired();
        builder.Property(x => x.FirstName).HasMaxLength(60).IsRequired();
        builder.Property(x => x.LastName).HasMaxLength(60).IsRequired();
        builder.Property(x => x.Phone).HasMaxLength(10).IsFixedLength().IsRequired();
        builder.Property(x => x.Address).HasMaxLength(400).IsRequired();
        builder.Property(x => x.Province).HasMaxLength(40).IsRequired();
        builder.Property(x => x.District).HasMaxLength(60).IsRequired();
        builder.Property(x => x.School).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Faculty).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Department).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Grade).HasMaxLength(8).IsRequired();
        builder.Property(x => x.Language).HasMaxLength(2).IsRequired();
        builder.Property(x => x.PasswordHash).HasMaxLength(256);

        builder.Ignore(x => x.FullName);

        // Bir T.C. = bir öğrenci kimliği; telefon portal giriş kimliği olduğu için o da tekil
        builder.HasIndex(x => x.Tc).IsUnique().HasFilter("[DeletedAt] IS NULL");
        builder.HasIndex(x => x.Phone).IsUnique().HasFilter("[DeletedAt] IS NULL");
        builder.HasIndex(x => new { x.LastName, x.FirstName });

        builder.HasMany(x => x.Guardians)
            .WithOne()
            .HasForeignKey(x => x.StudentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
