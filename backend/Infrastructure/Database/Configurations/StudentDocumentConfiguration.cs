using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class StudentDocumentConfiguration : IEntityTypeConfiguration<StudentDocument>
{
    public void Configure(EntityTypeBuilder<StudentDocument> builder)
    {
        builder.ToTable("StudentDocuments");

        builder.Property(x => x.Title).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Path).HasMaxLength(300).IsRequired();
        builder.Property(x => x.FileName).HasMaxLength(150).IsRequired();
        builder.Property(x => x.Sha256).HasMaxLength(64).IsRequired();

        builder.HasOne<Student>().WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Enrollment>().WithMany().HasForeignKey(x => x.EnrollmentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => x.StudentId);
    }
}
