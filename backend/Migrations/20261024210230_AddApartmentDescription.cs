using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MazlumApart.Migrations
{
    /// <inheritdoc />
    public partial class AddApartmentDescription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Apartments",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "Apartments");
        }
    }
}
