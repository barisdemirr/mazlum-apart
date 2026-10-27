using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class ApplicationConfiguration : IEntityTypeConfiguration<Application>
{
    public void Configure(EntityTypeBuilder<Application> builder)
    {
        builder.ToTable("Applications");

        builder.Property(x => x.No).HasMaxLength(20).IsRequired();
        builder.Property(x => x.Source).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.Term).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.StayPlan).HasConversion<string>().HasMaxLength(10).HasDefaultValue(StayPlan.Academic);
        builder.Property(x => x.PayWindow).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.Applicant).HasJsonConversion();
        builder.Property(x => x.Tc).HasMaxLength(11).IsFixedLength().IsRequired();
        builder.Property(x => x.Phone).HasMaxLength(10).IsFixedLength().IsRequired();
        builder.Property(x => x.FullName).HasMaxLength(130).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(1000);
        builder.Property(x => x.RejectReason).HasMaxLength(500);
        builder.Property(x => x.Ip).HasMaxLength(45);
        builder.Property(x => x.DiscountCodeText).HasMaxLength(20);
        builder.Property(x => x.DocumentPath).HasMaxLength(200);
        builder.Property(x => x.DocumentName).HasMaxLength(150);
        builder.Property(x => x.DocumentSha256).HasMaxLength(64).IsFixedLength();

        builder.HasOne<Period>().WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<RoomType>().WithMany().HasForeignKey(x => x.RoomTypeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Room>().WithMany().HasForeignKey(x => x.PreferredRoomId).OnDelete(DeleteBehavior.NoAction);
        builder.HasOne<DiscountCode>().WithMany().HasForeignKey(x => x.DiscountCodeId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.No).IsUnique();
        // Aynı dönemde aynı T.C. ile reddedilmemiş ikinci başvuru olamaz
        builder.HasIndex(x => new { x.PeriodId, x.Tc }).IsUnique()
            .HasFilter("[Status] <> 'Rejected' AND [DeletedAt] IS NULL")
            .HasDatabaseName("UX_Applications_Period_Tc_Open");
        builder.HasIndex(x => new { x.PeriodId, x.Status, x.CreatedAt });
    }
}

public class EnrollmentConfiguration : IEntityTypeConfiguration<Enrollment>
{
    public void Configure(EntityTypeBuilder<Enrollment> builder)
    {
        builder.ToTable("Enrollments");

        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.Term).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.StayPlan).HasConversion<string>().HasMaxLength(10).HasDefaultValue(StayPlan.Academic);
        builder.Property(x => x.PayWindow).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.EndReason).HasMaxLength(500);
        builder.Property(x => x.MovedIn).HasDefaultValue(false);
        builder.Property(x => x.FingerprintTaken).HasDefaultValue(false);
        builder.Property(x => x.WhatsAppGroupAdded).HasDefaultValue(false);
        builder.Property(x => x.ContractSigned).HasDefaultValue(false);

        // Aynı anda iki yazma (iki yönetici aynı hesaba tahsilat girerse) ikincisi 409 alır
        builder.Property(x => x.LedgerVersion).IsConcurrencyToken();

        builder.HasOne<Period>().WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.RoomType).WithMany().HasForeignKey(x => x.RoomTypeId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Application>().WithMany().HasForeignKey(x => x.ApplicationId).OnDelete(DeleteBehavior.Restrict);

        // Öğrencinin bir dönemde tek (iptal edilmemiş) kaydı olur
        builder.HasIndex(x => new { x.PeriodId, x.StudentId }).IsUnique()
            .HasFilter("[Status] <> 'Cancelled' AND [DeletedAt] IS NULL")
            .HasDatabaseName("UX_Enrollments_Period_Student_Open");
        builder.HasIndex(x => new { x.PeriodId, x.Status });
    }
}

public class PlacementConfiguration : IEntityTypeConfiguration<Placement>
{
    public void Configure(EntityTypeBuilder<Placement> builder)
    {
        builder.ToTable("Placements", t => t.HasCheckConstraint("CK_Placements_Dates", "[StartDate] <= [EndDate]"));

        builder.HasOne<Period>().WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Enrollment>().WithMany().HasForeignKey(x => x.EnrollmentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(x => x.Room).WithMany().HasForeignKey(x => x.RoomId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.RoomId, x.StartDate, x.EndDate });
        builder.HasIndex(x => new { x.PeriodId, x.StartDate });
        builder.HasIndex(x => x.EnrollmentId);
    }
}
