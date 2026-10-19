using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MazlumApart.Migrations
{
    /// <inheritdoc />
    public partial class AddBillSubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AwaitingInvoice",
                table: "Bills",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SubscriberNo",
                table: "Bills",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SubscriptionId",
                table: "Bills",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BillSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: false),
                    SubscriberNo = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    DueDay = table.Column<int>(type: "int", nullable: false),
                    EstimatedAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    StartMonth = table.Column<string>(type: "nchar(7)", fixedLength: true, maxLength: 7, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BillSubscriptions", x => x.Id);
                    table.CheckConstraint("CK_BillSubscriptions_Amount", "[EstimatedAmount] > 0");
                    table.CheckConstraint("CK_BillSubscriptions_DueDay", "[DueDay] BETWEEN 1 AND 31");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Bills_SubscriptionId_Month",
                table: "Bills",
                columns: new[] { "SubscriptionId", "Month" },
                unique: true,
                filter: "[SubscriptionId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_BillSubscriptions_Kind_SubscriberNo",
                table: "BillSubscriptions",
                columns: new[] { "Kind", "SubscriberNo" },
                unique: true,
                filter: "[DeletedAt] IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Bills_BillSubscriptions_SubscriptionId",
                table: "Bills",
                column: "SubscriptionId",
                principalTable: "BillSubscriptions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Bills_BillSubscriptions_SubscriptionId",
                table: "Bills");

            migrationBuilder.DropTable(
                name: "BillSubscriptions");

            migrationBuilder.DropIndex(
                name: "IX_Bills_SubscriptionId_Month",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "AwaitingInvoice",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "SubscriberNo",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "SubscriptionId",
                table: "Bills");
        }
    }
}
