using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MazlumApart.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscountCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DiscountCodeId",
                table: "Applications",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiscountCodeText",
                table: "Applications",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ListPriceMonthly",
                table: "Applications",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ListPriceSummerMonthly",
                table: "Applications",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DiscountCodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Label = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Value = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    ValidUntil = table.Column<DateOnly>(type: "date", nullable: true),
                    MaxUses = table.Column<int>(type: "int", nullable: true),
                    UsedCount = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Tc = table.Column<string>(type: "nchar(11)", fixedLength: true, maxLength: 11, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    OrderIndex = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiscountCodes", x => x.Id);
                    table.CheckConstraint("CK_DiscountCodes_Value", "[Value] > 0");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Applications_DiscountCodeId",
                table: "Applications",
                column: "DiscountCodeId");

            migrationBuilder.CreateIndex(
                name: "IX_DiscountCodes_Code",
                table: "DiscountCodes",
                column: "Code",
                unique: true,
                filter: "[DeletedAt] IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Applications_DiscountCodes_DiscountCodeId",
                table: "Applications",
                column: "DiscountCodeId",
                principalTable: "DiscountCodes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Applications_DiscountCodes_DiscountCodeId",
                table: "Applications");

            migrationBuilder.DropTable(
                name: "DiscountCodes");

            migrationBuilder.DropIndex(
                name: "IX_Applications_DiscountCodeId",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "DiscountCodeId",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "DiscountCodeText",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "ListPriceMonthly",
                table: "Applications");

            migrationBuilder.DropColumn(
                name: "ListPriceSummerMonthly",
                table: "Applications");
        }
    }
}
