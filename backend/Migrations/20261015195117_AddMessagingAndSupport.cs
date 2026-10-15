using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MazlumApart.Migrations
{
    /// <inheritdoc />
    public partial class AddMessagingAndSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContactLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PeriodId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EnrollmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Channel = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(1100)", maxLength: 1100, nullable: true),
                    SmsMessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    NotificationBatchId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedByName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContactLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContactLogs_Enrollments_EnrollmentId",
                        column: x => x.EnrollmentId,
                        principalTable: "Enrollments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContactLogs_Periods_PeriodId",
                        column: x => x.PeriodId,
                        principalTable: "Periods",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaintenanceRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    No = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: false),
                    PeriodId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EnrollmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoomLabel = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Area = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: false),
                    AdminNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ClosedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaintenanceRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaintenanceRequests_Enrollments_EnrollmentId",
                        column: x => x.EnrollmentId,
                        principalTable: "Enrollments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaintenanceRequests_Periods_PeriodId",
                        column: x => x.PeriodId,
                        principalTable: "Periods",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaintenanceRequests_Students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "Students",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "NotificationBatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Url = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    TitleTr = table.Column<string>(type: "nvarchar(65)", maxLength: 65, nullable: false),
                    TitleEn = table.Column<string>(type: "nvarchar(65)", maxLength: 65, nullable: true),
                    BodyTr = table.Column<string>(type: "nvarchar(240)", maxLength: 240, nullable: false),
                    BodyEn = table.Column<string>(type: "nvarchar(240)", maxLength: 240, nullable: true),
                    RecipientCount = table.Column<int>(type: "int", nullable: false),
                    SkippedCount = table.Column<int>(type: "int", nullable: false),
                    DeliveredCount = table.Column<int>(type: "int", nullable: false),
                    FailedCount = table.Column<int>(type: "int", nullable: false),
                    CreatedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedByName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationBatches", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PushSubscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnerType = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    OwnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Endpoint = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    EndpointHash = table.Column<string>(type: "nchar(64)", fixedLength: true, maxLength: 64, nullable: false),
                    P256dh = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Auth = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Lang = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    UserAgent = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastSuccessAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    FailureCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PushSubscriptions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SmsBatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Text = table.Column<string>(type: "nvarchar(1100)", maxLength: 1100, nullable: false),
                    RecipientCount = table.Column<int>(type: "int", nullable: false),
                    SkippedCount = table.Column<int>(type: "int", nullable: false),
                    TotalParts = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: false),
                    ProviderCampaignId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    ProviderError = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CreatedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedByName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SmsBatches", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MaintenanceEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ActorType = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    ActorName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaintenanceEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaintenanceEvents_MaintenanceRequests_RequestId",
                        column: x => x.RequestId,
                        principalTable: "MaintenanceRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaintenancePhotos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FilePath = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    Width = table.Column<int>(type: "int", nullable: false),
                    Height = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaintenancePhotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaintenancePhotos_MaintenanceRequests_RequestId",
                        column: x => x.RequestId,
                        principalTable: "MaintenanceRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NotificationDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BatchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EnrollmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RecipientName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Lang = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Body = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: false),
                    Devices = table.Column<int>(type: "int", nullable: false),
                    Succeeded = table.Column<int>(type: "int", nullable: false),
                    Failed = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationDeliveries_NotificationBatches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "NotificationBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SmsMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BatchId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PeriodId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    EnrollmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ApplicationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    StudentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RecipientName = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(12)", maxLength: 12, nullable: false),
                    Body = table.Column<string>(type: "nvarchar(1100)", maxLength: 1100, nullable: false),
                    Parts = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(14)", maxLength: 14, nullable: false),
                    ProviderStatus = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    ProviderMessageId = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    GsmError = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Credits = table.Column<int>(type: "int", nullable: true),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DoneAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SmsMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SmsMessages_SmsBatches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "SmsBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContactLogs_EnrollmentId_CreatedAt",
                table: "ContactLogs",
                columns: new[] { "EnrollmentId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ContactLogs_PeriodId_CreatedAt",
                table: "ContactLogs",
                columns: new[] { "PeriodId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceEvents_RequestId",
                table: "MaintenanceEvents",
                column: "RequestId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenancePhotos_RequestId",
                table: "MaintenancePhotos",
                column: "RequestId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceRequests_EnrollmentId",
                table: "MaintenanceRequests",
                column: "EnrollmentId");

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceRequests_No",
                table: "MaintenanceRequests",
                column: "No",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceRequests_PeriodId_Status",
                table: "MaintenanceRequests",
                columns: new[] { "PeriodId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_MaintenanceRequests_StudentId",
                table: "MaintenanceRequests",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationBatches_CreatedAt",
                table: "NotificationBatches",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationDeliveries_BatchId",
                table: "NotificationDeliveries",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_PushSubscriptions_EndpointHash",
                table: "PushSubscriptions",
                column: "EndpointHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PushSubscriptions_OwnerType_OwnerId",
                table: "PushSubscriptions",
                columns: new[] { "OwnerType", "OwnerId" });

            migrationBuilder.CreateIndex(
                name: "IX_SmsBatches_CreatedAt",
                table: "SmsBatches",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SmsMessages_BatchId",
                table: "SmsMessages",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_SmsMessages_CreatedAt",
                table: "SmsMessages",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SmsMessages_EnrollmentId",
                table: "SmsMessages",
                column: "EnrollmentId");

            migrationBuilder.CreateIndex(
                name: "IX_SmsMessages_ProviderMessageId",
                table: "SmsMessages",
                column: "ProviderMessageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContactLogs");

            migrationBuilder.DropTable(
                name: "MaintenanceEvents");

            migrationBuilder.DropTable(
                name: "MaintenancePhotos");

            migrationBuilder.DropTable(
                name: "NotificationDeliveries");

            migrationBuilder.DropTable(
                name: "PushSubscriptions");

            migrationBuilder.DropTable(
                name: "SmsMessages");

            migrationBuilder.DropTable(
                name: "MaintenanceRequests");

            migrationBuilder.DropTable(
                name: "NotificationBatches");

            migrationBuilder.DropTable(
                name: "SmsBatches");
        }
    }
}
