using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database.Configurations;

public class RoomTypePriceConfiguration : IEntityTypeConfiguration<RoomTypePrice>
{
    public void Configure(EntityTypeBuilder<RoomTypePrice> builder)
    {
        builder.ToTable("RoomTypePrices", t =>
        {
            t.HasCheckConstraint("CK_RoomTypePrices_Monthly", "[Monthly] > 0");
            t.HasCheckConstraint("CK_RoomTypePrices_Deposit", "[Deposit] >= 0");
        });

        builder.HasOne<Period>().WithMany().HasForeignKey(x => x.PeriodId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<RoomType>().WithMany().HasForeignKey(x => x.RoomTypeId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.PeriodId, x.RoomTypeId }).IsUnique().HasFilter("[DeletedAt] IS NULL");
    }
}
