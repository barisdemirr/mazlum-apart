using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.ToTable("AuditLogs");

        builder.Property(x => x.ActorType).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.ActorName).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Action).HasMaxLength(60).IsRequired();
        builder.Property(x => x.Entity).HasMaxLength(40).IsRequired();
        builder.Property(x => x.EntityId).HasMaxLength(80);
        builder.Property(x => x.Note).HasMaxLength(1000);
        builder.Property(x => x.Ip).HasMaxLength(45);
        builder.Property(x => x.Before).HasColumnType("nvarchar(max)");
        builder.Property(x => x.After).HasColumnType("nvarchar(max)");

        builder.HasIndex(x => x.CreatedAt);
        builder.HasIndex(x => new { x.PeriodId, x.CreatedAt });
        builder.HasIndex(x => new { x.Entity, x.EntityId });
    }
}
