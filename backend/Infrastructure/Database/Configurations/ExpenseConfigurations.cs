using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class ExpenseCategoryConfiguration : IEntityTypeConfiguration<ExpenseCategory>
{
    public void Configure(EntityTypeBuilder<ExpenseCategory> builder)
    {
        builder.ToTable("ExpenseCategories");

        builder.Property(x => x.Name).HasMaxLength(60).IsRequired();
        builder.Property(x => x.SystemKey).HasMaxLength(20);

        builder.HasIndex(x => x.Name).IsUnique().HasFilter("[DeletedAt] IS NULL");
        builder.HasIndex(x => x.SystemKey).IsUnique().HasFilter("[SystemKey] IS NOT NULL AND [DeletedAt] IS NULL");
    }
}

public class ExpenseConfiguration : IEntityTypeConfiguration<Expense>
{
    public void Configure(EntityTypeBuilder<Expense> builder)
    {
        builder.ToTable("Expenses", t => t.HasCheckConstraint("CK_Expenses_Amount", "[Amount] > 0"));

        builder.Property(x => x.Description).HasMaxLength(300).IsRequired();
        builder.Property(x => x.CancelReason).HasMaxLength(500);
        builder.Property(x => x.RowVersion).IsRowVersion();

        builder.HasOne<Period>().WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<ExpenseCategory>().WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Account>().WithMany().HasForeignKey(x => x.AccountId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Bill>().WithMany().HasForeignKey(x => x.BillId).OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(x => new { x.PeriodId, x.Date });
        builder.HasIndex(x => x.CategoryId);
    }
}

public class BillConfiguration : IEntityTypeConfiguration<Bill>
{
    public void Configure(EntityTypeBuilder<Bill> builder)
    {
        builder.ToTable("Bills", t => t.HasCheckConstraint("CK_Bills_Amount", "[Amount] > 0"));

        builder.Property(x => x.Kind).HasConversion<string>().HasMaxLength(12);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(8);
        builder.Property(x => x.Month).HasMaxLength(7).IsFixedLength().IsRequired();
        builder.Property(x => x.Note).HasMaxLength(300);
        builder.Property(x => x.RowVersion).IsRowVersion();

        builder.HasOne<Period>().WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.PeriodId, x.DueDate });
        builder.HasIndex(x => x.Status);
    }
}

public class IdempotencyKeyConfiguration : IEntityTypeConfiguration<IdempotencyKey>
{
    public void Configure(EntityTypeBuilder<IdempotencyKey> builder)
    {
        builder.ToTable("IdempotencyKeys");
        builder.HasKey(x => x.Key);
        builder.Property(x => x.Key).ValueGeneratedNever();
        builder.Property(x => x.Scope).HasMaxLength(40).IsRequired();
        builder.HasIndex(x => x.CreatedAt);
    }
}
