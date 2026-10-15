using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class StudentGuardianConfiguration : IEntityTypeConfiguration<StudentGuardian>
{
    public void Configure(EntityTypeBuilder<StudentGuardian> builder)
    {
        builder.ToTable("StudentGuardians");

        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Phone).HasMaxLength(10).IsFixedLength().IsRequired();

        builder.HasIndex(x => x.StudentId);
    }
}
