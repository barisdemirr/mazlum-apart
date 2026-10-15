using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class ContactLogConfiguration : IEntityTypeConfiguration<ContactLog>
{
    public void Configure(EntityTypeBuilder<ContactLog> builder)
    {
        builder.ToTable("ContactLogs");

        builder.Property(x => x.Channel).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.Purpose).HasMaxLength(40).IsRequired();
        builder.Property(x => x.Note).HasMaxLength(1100);
        builder.Property(x => x.CreatedByName).HasMaxLength(120);

        builder.HasOne<Period>().WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Enrollment>().WithMany().HasForeignKey(x => x.EnrollmentId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.PeriodId, x.CreatedAt });
        builder.HasIndex(x => new { x.EnrollmentId, x.CreatedAt });
    }
}

public class SmsBatchConfiguration : IEntityTypeConfiguration<SmsBatch>
{
    public void Configure(EntityTypeBuilder<SmsBatch> builder)
    {
        builder.ToTable("SmsBatches");

        builder.Property(x => x.Purpose).HasMaxLength(40).IsRequired();
        builder.Property(x => x.Text).HasMaxLength(1100).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(12);
        builder.Property(x => x.ProviderCampaignId).HasMaxLength(40);
        builder.Property(x => x.ProviderError).HasMaxLength(300);
        builder.Property(x => x.CreatedByName).HasMaxLength(120);

        builder.HasIndex(x => x.CreatedAt);
    }
}

public class SmsMessageConfiguration : IEntityTypeConfiguration<SmsMessage>
{
    public void Configure(EntityTypeBuilder<SmsMessage> builder)
    {
        builder.ToTable("SmsMessages");

        builder.Property(x => x.RecipientName).HasMaxLength(120);
        builder.Property(x => x.Phone).HasMaxLength(12).IsRequired();
        builder.Property(x => x.Body).HasMaxLength(1100).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(14);
        builder.Property(x => x.ProviderStatus).HasMaxLength(40);
        builder.Property(x => x.ProviderMessageId).HasMaxLength(40);
        builder.Property(x => x.GsmError).HasMaxLength(20);

        builder.HasOne<SmsBatch>().WithMany().HasForeignKey(x => x.BatchId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.BatchId);
        builder.HasIndex(x => x.CreatedAt);
        builder.HasIndex(x => x.EnrollmentId);
        builder.HasIndex(x => x.ProviderMessageId);
    }
}

public class PushSubscriptionConfiguration : IEntityTypeConfiguration<PushSubscription>
{
    public void Configure(EntityTypeBuilder<PushSubscription> builder)
    {
        builder.ToTable("PushSubscriptions");

        builder.Property(x => x.OwnerType).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.Endpoint).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.EndpointHash).HasMaxLength(64).IsFixedLength().IsRequired();
        builder.Property(x => x.P256dh).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Auth).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Lang).HasMaxLength(5);
        builder.Property(x => x.UserAgent).HasMaxLength(300);

        builder.HasIndex(x => x.EndpointHash).IsUnique();
        builder.HasIndex(x => new { x.OwnerType, x.OwnerId });
    }
}

public class NotificationBatchConfiguration : IEntityTypeConfiguration<NotificationBatch>
{
    public void Configure(EntityTypeBuilder<NotificationBatch> builder)
    {
        builder.ToTable("NotificationBatches");

        builder.Property(x => x.Purpose).HasMaxLength(40).IsRequired();
        builder.Property(x => x.Url).HasMaxLength(200).IsRequired();
        builder.Property(x => x.TitleTr).HasMaxLength(65).IsRequired();
        builder.Property(x => x.TitleEn).HasMaxLength(65);
        builder.Property(x => x.BodyTr).HasMaxLength(240).IsRequired();
        builder.Property(x => x.BodyEn).HasMaxLength(240);
        builder.Property(x => x.CreatedByName).HasMaxLength(120);

        builder.HasIndex(x => x.CreatedAt);
    }
}

public class NotificationDeliveryConfiguration : IEntityTypeConfiguration<NotificationDelivery>
{
    public void Configure(EntityTypeBuilder<NotificationDelivery> builder)
    {
        builder.ToTable("NotificationDeliveries");

        builder.Property(x => x.RecipientName).HasMaxLength(120);
        builder.Property(x => x.Lang).HasMaxLength(5);
        builder.Property(x => x.Title).HasMaxLength(120);
        builder.Property(x => x.Body).HasMaxLength(400);

        builder.HasOne<NotificationBatch>().WithMany().HasForeignKey(x => x.BatchId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => x.BatchId);
    }
}

public class MaintenanceRequestConfiguration : IEntityTypeConfiguration<MaintenanceRequest>
{
    public void Configure(EntityTypeBuilder<MaintenanceRequest> builder)
    {
        builder.ToTable("MaintenanceRequests");

        builder.Property(x => x.No).HasMaxLength(12).IsRequired();
        builder.Property(x => x.RoomLabel).HasMaxLength(120);
        builder.Property(x => x.Area).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(12);
        builder.Property(x => x.Title).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.AdminNote).HasMaxLength(500);

        builder.HasOne<Period>().WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Enrollment>().WithMany().HasForeignKey(x => x.EnrollmentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Student>().WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.NoAction);
        builder.HasMany(x => x.Events).WithOne().HasForeignKey(x => x.RequestId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Photos).WithOne().HasForeignKey(x => x.RequestId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.No).IsUnique();
        builder.HasIndex(x => new { x.PeriodId, x.Status });
        builder.HasIndex(x => x.StudentId);
    }
}

public class MaintenanceEventConfiguration : IEntityTypeConfiguration<MaintenanceEvent>
{
    public void Configure(EntityTypeBuilder<MaintenanceEvent> builder)
    {
        builder.ToTable("MaintenanceEvents");
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(12);
        builder.Property(x => x.ActorType).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.ActorName).HasMaxLength(120);
        builder.Property(x => x.Note).HasMaxLength(500);
    }
}

public class MaintenancePhotoConfiguration : IEntityTypeConfiguration<MaintenancePhoto>
{
    public void Configure(EntityTypeBuilder<MaintenancePhoto> builder)
    {
        builder.ToTable("MaintenancePhotos");
        builder.Property(x => x.FilePath).HasMaxLength(300).IsRequired();
    }
}
