using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MazlumApart.Migrations
{
    /// <inheritdoc />
    public partial class AddApartmentTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ApartmentTypeId",
                table: "RoomTypes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ApartmentTypeId",
                table: "Apartments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ApartmentTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CoverMediaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApartmentTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ApartmentTypes_MediaAssets_CoverMediaId",
                        column: x => x.CoverMediaId,
                        principalTable: "MediaAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RoomTypes_ApartmentTypeId",
                table: "RoomTypes",
                column: "ApartmentTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_Apartments_ApartmentTypeId",
                table: "Apartments",
                column: "ApartmentTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_ApartmentTypes_CoverMediaId",
                table: "ApartmentTypes",
                column: "CoverMediaId");

            migrationBuilder.CreateIndex(
                name: "IX_ApartmentTypes_Slug",
                table: "ApartmentTypes",
                column: "Slug",
                unique: true,
                filter: "[DeletedAt] IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Apartments_ApartmentTypes_ApartmentTypeId",
                table: "Apartments",
                column: "ApartmentTypeId",
                principalTable: "ApartmentTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RoomTypes_ApartmentTypes_ApartmentTypeId",
                table: "RoomTypes",
                column: "ApartmentTypeId",
                principalTable: "ApartmentTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Apartments_ApartmentTypes_ApartmentTypeId",
                table: "Apartments");

            migrationBuilder.DropForeignKey(
                name: "FK_RoomTypes_ApartmentTypes_ApartmentTypeId",
                table: "RoomTypes");

            migrationBuilder.DropTable(
                name: "ApartmentTypes");

            migrationBuilder.DropIndex(
                name: "IX_RoomTypes_ApartmentTypeId",
                table: "RoomTypes");

            migrationBuilder.DropIndex(
                name: "IX_Apartments_ApartmentTypeId",
                table: "Apartments");

            migrationBuilder.DropColumn(
                name: "ApartmentTypeId",
                table: "RoomTypes");

            migrationBuilder.DropColumn(
                name: "ApartmentTypeId",
                table: "Apartments");
        }
    }
}
