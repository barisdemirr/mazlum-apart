using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class EnrollmentExitConfiguration : IEntityTypeConfiguration<EnrollmentExit>
{
    public void Configure(EntityTypeBuilder<EnrollmentExit> builder)
    {
        builder.ToTable("EnrollmentExits");

        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.ReportedByType).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.ReportedByName).HasMaxLength(120).IsRequired();
        builder.Property(x => x.ConfirmedByName).HasMaxLength(120);

        builder.HasOne<Period>().WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Enrollment>().WithMany().HasForeignKey(x => x.EnrollmentId).OnDelete(DeleteBehavior.Restrict);

        // Bir kayıt için tek (silinmemiş) çıkış: aynı anda iki bildirim gelirse ikincisi veritabanında reddedilir
        builder.HasIndex(x => x.EnrollmentId).IsUnique()
            .HasFilter("[DeletedAt] IS NULL")
            .HasDatabaseName("UX_EnrollmentExits_Enrollment_Open");
        builder.HasIndex(x => new { x.PeriodId, x.ConfirmedAt });
    }
}

public class TemporaryLeaveConfiguration : IEntityTypeConfiguration<TemporaryLeave>
{
    public void Configure(EntityTypeBuilder<TemporaryLeave> builder)
    {
        builder.ToTable("TemporaryLeaves", t => t.HasCheckConstraint("CK_TemporaryLeaves_Dates", "[PlannedReturnDate] > [LeaveDate]"));

        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.ReportedByType).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.ReportedByName).HasMaxLength(120).IsRequired();

        builder.HasOne<Period>().WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Enrollment>().WithMany().HasForeignKey(x => x.EnrollmentId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.EnrollmentId, x.LeaveDate });
        builder.HasIndex(x => new { x.PeriodId, x.LeaveDate });
    }
}

public class ApartmentStatusConfiguration : IEntityTypeConfiguration<ApartmentStatus>
{
    public void Configure(EntityTypeBuilder<ApartmentStatus> builder)
    {
        builder.ToTable("ApartmentStatuses");

        builder.Property(x => x.Readiness).HasConversion<string>().HasMaxLength(14);
        builder.Property(x => x.Note).HasMaxLength(300);
        builder.Property(x => x.BoilerOn).HasDefaultValue(true);

        builder.HasOne<Apartment>().WithMany().HasForeignKey(x => x.ApartmentId).OnDelete(DeleteBehavior.Restrict);

        // Daire başına tek durum satırı
        builder.HasIndex(x => x.ApartmentId).IsUnique()
            .HasFilter("[DeletedAt] IS NULL")
            .HasDatabaseName("UX_ApartmentStatuses_Apartment");
    }
}
