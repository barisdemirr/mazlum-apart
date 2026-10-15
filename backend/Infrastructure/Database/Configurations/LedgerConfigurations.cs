using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class ChargeConfiguration : IEntityTypeConfiguration<Charge>
{
    public void Configure(EntityTypeBuilder<Charge> builder)
    {
        builder.ToTable("Charges");

        builder.Property(x => x.Kind).HasConversion<string>().HasMaxLength(12);
        builder.Property(x => x.Month).HasMaxLength(7).IsFixedLength().IsRequired();
        builder.Property(x => x.Note).HasMaxLength(500);

        builder.HasOne<Period>().WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Enrollment>().WithMany().HasForeignKey(x => x.EnrollmentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Charge>().WithMany().HasForeignKey(x => x.ReversalOfId).OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(x => new { x.EnrollmentId, x.DueDate });
        builder.HasIndex(x => new { x.PeriodId, x.DueDate });
    }
}

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("Payments", t => t.HasCheckConstraint("CK_Payments_Amount", "[Amount] > 0"));

        builder.Property(x => x.Kind).HasConversion<string>().HasMaxLength(12);
        builder.Property(x => x.Method).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.Note).HasMaxLength(500);
        builder.Property(x => x.CancelReason).HasMaxLength(500);

        builder.HasOne<Period>().WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Enrollment>().WithMany().HasForeignKey(x => x.EnrollmentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Account>().WithMany().HasForeignKey(x => x.AccountId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.EnrollmentId, x.Date });
        builder.HasIndex(x => new { x.PeriodId, x.Date });
    }
}

public class PaymentAllocationConfiguration : IEntityTypeConfiguration<PaymentAllocation>
{
    public void Configure(EntityTypeBuilder<PaymentAllocation> builder)
    {
        builder.ToTable("PaymentAllocations");

        builder.HasOne<Payment>().WithMany().HasForeignKey(x => x.PaymentId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Charge>().WithMany().HasForeignKey(x => x.ChargeId).OnDelete(DeleteBehavior.NoAction);
        builder.HasOne<Enrollment>().WithMany().HasForeignKey(x => x.EnrollmentId).OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(x => x.EnrollmentId);
        builder.HasIndex(x => x.PaymentId);
        builder.HasIndex(x => x.ChargeId);
    }
}

public class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.ToTable("Accounts");

        builder.Property(x => x.Type).HasConversion<string>().HasMaxLength(10);
        builder.Property(x => x.Name).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Iban).HasMaxLength(26);

        builder.HasIndex(x => x.Name).IsUnique().HasFilter("[DeletedAt] IS NULL");
    }
}

public class AccountTransactionConfiguration : IEntityTypeConfiguration<AccountTransaction>
{
    public void Configure(EntityTypeBuilder<AccountTransaction> builder)
    {
        builder.ToTable("AccountTransactions", t => t.HasCheckConstraint("CK_AccountTransactions_Amount", "[Amount] > 0"));

        builder.Property(x => x.Direction).HasConversion<string>().HasMaxLength(4);
        builder.Property(x => x.Source).HasConversion<string>().HasMaxLength(16);
        builder.Property(x => x.Note).HasMaxLength(500);

        builder.HasOne<Period>().WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Account>().WithMany().HasForeignKey(x => x.AccountId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.PeriodId, x.AccountId, x.Date });
        builder.HasIndex(x => new { x.Source, x.SourceId });
    }
}
