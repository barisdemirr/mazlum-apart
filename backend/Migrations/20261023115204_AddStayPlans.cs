using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MazlumApart.Migrations
{
    /// <inheritdoc />
    public partial class AddStayPlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "SummerMonthly",
                table: "RoomTypePrices",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StayPlan",
                table: "Enrollments",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "Academic");

            migrationBuilder.AddColumn<decimal>(
                name: "SummerMonthlyPrice",
                table: "Enrollments",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PriceSummerMonthly",
                table: "Applications",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StayPlan",
                table: "Applications",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "Academic");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RoomTypePrices_SummerMonthly",
                table: "RoomTypePrices",
                sql: "[SummerMonthly] IS NULL OR [SummerMonthly] > 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_RoomTypePrices_SummerMonthly",
                table: "RoomTypePrices");

            migrationBuilder.DropColumn(
                name: "SummerMonthly",
                table: "RoomTypePrices");

            migrationBuilder.DropColumn(
                name: "StayPlan",
                table: "Enrollments");

            migrationBuilder.DropColumn(
                name: "SummerMonthlyPrice",
                table: "Enrollments");

            migrationBuilder.DropColumn(
                name: "PriceSummerMonthly",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "StayPlan",
                table: "Applications");
        }
    }
}
