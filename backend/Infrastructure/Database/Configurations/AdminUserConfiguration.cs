using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class AdminUserConfiguration : IEntityTypeConfiguration<AdminUser>
{
    public void Configure(EntityTypeBuilder<AdminUser> builder)
    {
        builder.ToTable("AdminUsers");

        // E-posta büyük/küçük harfe duyarsız (Admin@x.com == admin@x.com)
        builder.Property(x => x.Email).HasMaxLength(256).IsRequired().UseCollation("SQL_Latin1_General_CP1_CI_AS");
        builder.Property(x => x.PasswordHash).HasMaxLength(256).IsRequired();
        builder.Property(x => x.FullName).HasMaxLength(100).IsRequired();

        builder.HasIndex(x => x.Email).IsUnique().HasFilter("[DeletedAt] IS NULL");
    }
}
