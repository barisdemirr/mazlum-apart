using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MazlumApart.Migrations
{
    /// <inheritdoc />
    public partial class AddNineMonthTerm : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "NineMonthTerm",
                table: "Periods",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NineMonthTerm",
                table: "Periods");
        }
    }
}
