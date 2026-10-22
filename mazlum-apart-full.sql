/*
  Mazlum Apart - canli veritabani kurulum script'i (SEMA + TUM VERILER)
  - SSMS'te Plesk'teki veritabanini ust acilir listeden SEC, sonra calistir.
  - CREATE/ALTER DATABASE, USE ve HangFire (uygulama ilk acilista kendisi olusturur) kisimlari cikarildi.
  - Veritabaninda daha once olusan dbo tablolari (sema + seeder'in actigi satirlar) bastan silinip yeniden kurulur.
*/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- Guvenlik: yanlis (sistem) veritabani seciliyse script'in geri kalani HIC calismaz
IF DB_NAME() IN (N'master', N'model', N'msdb', N'tempdb')
BEGIN
    RAISERROR(N'Yanlis veritabani secili: SSMS''te Plesk veritabanini secip tekrar calistir. Hicbir sey degismedi.', 16, 1);
    SET NOEXEC ON;
END
GO
-- Temizlik: onceki denemeden kalan dbo tablolarini (once yabanci anahtarlari) sil
DECLARE @sql nvarchar(max) = N'';
SELECT @sql += N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name) + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
FROM sys.foreign_keys fk JOIN sys.tables t ON t.object_id = fk.parent_object_id
WHERE SCHEMA_NAME(t.schema_id) = N'dbo';
EXEC sp_executesql @sql;
SET @sql = N'';
SELECT @sql += N'DROP TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + N'.' + QUOTENAME(name) + N';'
FROM sys.tables WHERE SCHEMA_NAME(schema_id) = N'dbo';
EXEC sp_executesql @sql;
GO
/****** Object:  Table [dbo].[__EFMigrationsHistory]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[__EFMigrationsHistory](
	[MigrationId] [nvarchar](150) NOT NULL,
	[ProductVersion] [nvarchar](32) NOT NULL,
 CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY CLUSTERED 
(
	[MigrationId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Accounts]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Accounts](
	[Id] [uniqueidentifier] NOT NULL,
	[Type] [nvarchar](10) NOT NULL,
	[Name] [nvarchar](80) NOT NULL,
	[Iban] [nvarchar](26) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_Accounts] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[AccountTransactions]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AccountTransactions](
	[Id] [uniqueidentifier] NOT NULL,
	[PeriodId] [uniqueidentifier] NOT NULL,
	[AccountId] [uniqueidentifier] NOT NULL,
	[Date] [date] NOT NULL,
	[Direction] [nvarchar](4) NOT NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[Source] [nvarchar](16) NOT NULL,
	[SourceId] [uniqueidentifier] NULL,
	[Note] [nvarchar](500) NULL,
	[CreatedById] [uniqueidentifier] NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_AccountTransactions] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[AdminUsers]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AdminUsers](
	[Id] [uniqueidentifier] NOT NULL,
	[Email] [nvarchar](256) NOT NULL,
	[PasswordHash] [nvarchar](256) NOT NULL,
	[FullName] [nvarchar](100) NOT NULL,
	[LastLoginAt] [datetime2](7) NULL,
	[SecurityStamp] [uniqueidentifier] NOT NULL,
	[FailedLoginCount] [int] NOT NULL,
	[LockedUntil] [datetime2](7) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_AdminUsers] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ApartmentMedia]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ApartmentMedia](
	[Id] [uniqueidentifier] NOT NULL,
	[ApartmentId] [uniqueidentifier] NOT NULL,
	[MediaAssetId] [uniqueidentifier] NOT NULL,
	[IsVideo] [bit] NOT NULL,
	[TagKind] [nvarchar](10) NOT NULL,
	[RoomId] [uniqueidentifier] NULL,
	[AreaKey] [nvarchar](20) NULL,
	[CustomLabel] [nvarchar](max) NULL,
	[Caption] [nvarchar](max) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_ApartmentMedia] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Apartments]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Apartments](
	[Id] [uniqueidentifier] NOT NULL,
	[Name] [nvarchar](60) NOT NULL,
	[Slug] [nvarchar](80) NOT NULL,
	[Floor] [int] NOT NULL,
	[Kitchens] [int] NOT NULL,
	[Bathrooms] [int] NOT NULL,
	[Note] [nvarchar](500) NULL,
	[IsPublished] [bit] NOT NULL,
	[SharedAreas] [nvarchar](max) NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_Apartments] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Applications]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Applications](
	[Id] [uniqueidentifier] NOT NULL,
	[No] [nvarchar](20) NOT NULL,
	[PeriodId] [uniqueidentifier] NOT NULL,
	[Source] [nvarchar](10) NOT NULL,
	[Status] [nvarchar](10) NOT NULL,
	[Applicant] [nvarchar](max) NOT NULL,
	[Tc] [nchar](11) NOT NULL,
	[Phone] [nchar](10) NOT NULL,
	[FullName] [nvarchar](130) NOT NULL,
	[RoomTypeId] [uniqueidentifier] NOT NULL,
	[PreferredRoomId] [uniqueidentifier] NULL,
	[Term] [nvarchar](10) NOT NULL,
	[EntryDate] [date] NOT NULL,
	[PayWindow] [nvarchar](10) NOT NULL,
	[PriceMonthly] [decimal](18, 2) NOT NULL,
	[PriceDeposit] [decimal](18, 2) NOT NULL,
	[Note] [nvarchar](1000) NULL,
	[DecidedAt] [datetime2](7) NULL,
	[DecidedById] [uniqueidentifier] NULL,
	[RejectReason] [nvarchar](500) NULL,
	[EnrollmentId] [uniqueidentifier] NULL,
	[Ip] [nvarchar](45) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_Applications] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[AuditLogs]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AuditLogs](
	[Id] [uniqueidentifier] NOT NULL,
	[ActorType] [nvarchar](10) NOT NULL,
	[ActorId] [uniqueidentifier] NULL,
	[ActorName] [nvarchar](120) NOT NULL,
	[Action] [nvarchar](60) NOT NULL,
	[Entity] [nvarchar](40) NOT NULL,
	[EntityId] [nvarchar](80) NULL,
	[PeriodId] [uniqueidentifier] NULL,
	[Before] [nvarchar](max) NULL,
	[After] [nvarchar](max) NULL,
	[Note] [nvarchar](1000) NULL,
	[Ip] [nvarchar](45) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_AuditLogs] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Bills]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Bills](
	[Id] [uniqueidentifier] NOT NULL,
	[PeriodId] [uniqueidentifier] NOT NULL,
	[Kind] [nvarchar](12) NOT NULL,
	[Month] [nchar](7) NOT NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[DueDate] [date] NOT NULL,
	[Note] [nvarchar](300) NULL,
	[Status] [nvarchar](8) NOT NULL,
	[PaidAt] [date] NULL,
	[ExpenseId] [uniqueidentifier] NULL,
	[RowVersion] [timestamp] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
	[AwaitingInvoice] [bit] NOT NULL,
	[SubscriberNo] [nvarchar](30) NULL,
	[SubscriptionId] [uniqueidentifier] NULL,
 CONSTRAINT [PK_Bills] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[BillSubscriptions]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[BillSubscriptions](
	[Id] [uniqueidentifier] NOT NULL,
	[Kind] [nvarchar](12) NOT NULL,
	[SubscriberNo] [nvarchar](30) NOT NULL,
	[Provider] [nvarchar](60) NULL,
	[DueDay] [int] NOT NULL,
	[EstimatedAmount] [decimal](18, 2) NOT NULL,
	[StartMonth] [nchar](7) NOT NULL,
	[Note] [nvarchar](300) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_BillSubscriptions] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Charges]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Charges](
	[Id] [uniqueidentifier] NOT NULL,
	[PeriodId] [uniqueidentifier] NOT NULL,
	[EnrollmentId] [uniqueidentifier] NOT NULL,
	[Kind] [nvarchar](12) NOT NULL,
	[Month] [nchar](7) NOT NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[DueDate] [date] NOT NULL,
	[Note] [nvarchar](500) NULL,
	[ReversalOfId] [uniqueidentifier] NULL,
	[CreatedById] [uniqueidentifier] NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_Charges] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ContactLogs]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ContactLogs](
	[Id] [uniqueidentifier] NOT NULL,
	[PeriodId] [uniqueidentifier] NOT NULL,
	[EnrollmentId] [uniqueidentifier] NOT NULL,
	[Channel] [nvarchar](10) NOT NULL,
	[Purpose] [nvarchar](40) NOT NULL,
	[Note] [nvarchar](1100) NULL,
	[SmsMessageId] [uniqueidentifier] NULL,
	[NotificationBatchId] [uniqueidentifier] NULL,
	[CreatedById] [uniqueidentifier] NULL,
	[CreatedByName] [nvarchar](120) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_ContactLogs] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Enrollments]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Enrollments](
	[Id] [uniqueidentifier] NOT NULL,
	[PeriodId] [uniqueidentifier] NOT NULL,
	[StudentId] [uniqueidentifier] NOT NULL,
	[ApplicationId] [uniqueidentifier] NOT NULL,
	[RoomTypeId] [uniqueidentifier] NOT NULL,
	[Status] [nvarchar](10) NOT NULL,
	[PayWindow] [nvarchar](10) NOT NULL,
	[Term] [nvarchar](10) NOT NULL,
	[EntryDate] [date] NOT NULL,
	[MonthlyPrice] [decimal](18, 2) NOT NULL,
	[DepositPrice] [decimal](18, 2) NOT NULL,
	[EndedAt] [date] NULL,
	[EndReason] [nvarchar](500) NULL,
	[LedgerVersion] [int] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_Enrollments] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ExpenseCategories]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ExpenseCategories](
	[Id] [uniqueidentifier] NOT NULL,
	[Name] [nvarchar](60) NOT NULL,
	[SystemKey] [nvarchar](20) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_ExpenseCategories] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Expenses]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Expenses](
	[Id] [uniqueidentifier] NOT NULL,
	[PeriodId] [uniqueidentifier] NOT NULL,
	[CategoryId] [uniqueidentifier] NOT NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[Date] [date] NOT NULL,
	[AccountId] [uniqueidentifier] NOT NULL,
	[Description] [nvarchar](300) NOT NULL,
	[BillId] [uniqueidentifier] NULL,
	[CreatedById] [uniqueidentifier] NULL,
	[CancelledAt] [datetime2](7) NULL,
	[CancelReason] [nvarchar](500) NULL,
	[CancelledById] [uniqueidentifier] NULL,
	[RowVersion] [timestamp] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_Expenses] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[IdempotencyKeys]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[IdempotencyKeys](
	[Key] [uniqueidentifier] NOT NULL,
	[Scope] [nvarchar](40) NOT NULL,
	[ActorId] [uniqueidentifier] NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_IdempotencyKeys] PRIMARY KEY CLUSTERED 
(
	[Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MaintenanceEvents]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MaintenanceEvents](
	[Id] [uniqueidentifier] NOT NULL,
	[RequestId] [uniqueidentifier] NOT NULL,
	[Status] [nvarchar](12) NOT NULL,
	[Note] [nvarchar](500) NULL,
	[ActorType] [nvarchar](10) NOT NULL,
	[ActorName] [nvarchar](120) NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_MaintenanceEvents] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MaintenancePhotos]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MaintenancePhotos](
	[Id] [uniqueidentifier] NOT NULL,
	[RequestId] [uniqueidentifier] NOT NULL,
	[FilePath] [nvarchar](300) NOT NULL,
	[FileSize] [bigint] NOT NULL,
	[Width] [int] NOT NULL,
	[Height] [int] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_MaintenancePhotos] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MaintenanceRequests]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MaintenanceRequests](
	[Id] [uniqueidentifier] NOT NULL,
	[No] [nvarchar](12) NOT NULL,
	[PeriodId] [uniqueidentifier] NOT NULL,
	[EnrollmentId] [uniqueidentifier] NOT NULL,
	[StudentId] [uniqueidentifier] NOT NULL,
	[RoomLabel] [nvarchar](120) NOT NULL,
	[Area] [nvarchar](10) NOT NULL,
	[Title] [nvarchar](120) NOT NULL,
	[Description] [nvarchar](2000) NOT NULL,
	[Status] [nvarchar](12) NOT NULL,
	[AdminNote] [nvarchar](500) NULL,
	[ClosedAt] [datetime2](7) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_MaintenanceRequests] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MediaAssets]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MediaAssets](
	[Id] [uniqueidentifier] NOT NULL,
	[Kind] [nvarchar](10) NOT NULL,
	[FileName] [nvarchar](255) NOT NULL,
	[FilePath] [nvarchar](300) NOT NULL,
	[MimeType] [nvarchar](50) NOT NULL,
	[FileSize] [bigint] NOT NULL,
	[Width] [int] NOT NULL,
	[Height] [int] NOT NULL,
	[DurationSeconds] [int] NULL,
	[PosterPath] [nvarchar](300) NULL,
	[AltText] [nvarchar](max) NULL,
	[UploadedById] [uniqueidentifier] NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_MediaAssets] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MessageTemplates]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MessageTemplates](
	[Id] [uniqueidentifier] NOT NULL,
	[Key] [nvarchar](40) NOT NULL,
	[Name] [nvarchar](80) NOT NULL,
	[BodyTr] [nvarchar](1000) NOT NULL,
	[BodyEn] [nvarchar](1000) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_MessageTemplates] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[NotificationBatches]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[NotificationBatches](
	[Id] [uniqueidentifier] NOT NULL,
	[Purpose] [nvarchar](40) NOT NULL,
	[Url] [nvarchar](200) NOT NULL,
	[TitleTr] [nvarchar](65) NOT NULL,
	[TitleEn] [nvarchar](65) NULL,
	[BodyTr] [nvarchar](240) NOT NULL,
	[BodyEn] [nvarchar](240) NULL,
	[RecipientCount] [int] NOT NULL,
	[SkippedCount] [int] NOT NULL,
	[DeliveredCount] [int] NOT NULL,
	[FailedCount] [int] NOT NULL,
	[CreatedById] [uniqueidentifier] NULL,
	[CreatedByName] [nvarchar](120) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_NotificationBatches] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[NotificationDeliveries]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[NotificationDeliveries](
	[Id] [uniqueidentifier] NOT NULL,
	[BatchId] [uniqueidentifier] NOT NULL,
	[StudentId] [uniqueidentifier] NOT NULL,
	[EnrollmentId] [uniqueidentifier] NULL,
	[RecipientName] [nvarchar](120) NOT NULL,
	[Lang] [nvarchar](5) NOT NULL,
	[Title] [nvarchar](120) NOT NULL,
	[Body] [nvarchar](400) NOT NULL,
	[Devices] [int] NOT NULL,
	[Succeeded] [int] NOT NULL,
	[Failed] [int] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_NotificationDeliveries] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[NumberCounters]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[NumberCounters](
	[Key] [nvarchar](64) NOT NULL,
	[Value] [int] NOT NULL,
	[Version] [uniqueidentifier] NOT NULL,
 CONSTRAINT [PK_NumberCounters] PRIMARY KEY CLUSTERED 
(
	[Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PaymentAllocations]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PaymentAllocations](
	[Id] [uniqueidentifier] NOT NULL,
	[PeriodId] [uniqueidentifier] NOT NULL,
	[EnrollmentId] [uniqueidentifier] NOT NULL,
	[PaymentId] [uniqueidentifier] NOT NULL,
	[ChargeId] [uniqueidentifier] NOT NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[IsAuto] [bit] NOT NULL,
	[IsReversal] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_PaymentAllocations] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Payments]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Payments](
	[Id] [uniqueidentifier] NOT NULL,
	[PeriodId] [uniqueidentifier] NOT NULL,
	[EnrollmentId] [uniqueidentifier] NOT NULL,
	[Kind] [nvarchar](12) NOT NULL,
	[Amount] [decimal](18, 2) NOT NULL,
	[Date] [date] NOT NULL,
	[Method] [nvarchar](10) NOT NULL,
	[AccountId] [uniqueidentifier] NOT NULL,
	[Note] [nvarchar](500) NULL,
	[CreatedById] [uniqueidentifier] NULL,
	[CancelledAt] [datetime2](7) NULL,
	[CancelReason] [nvarchar](500) NULL,
	[CancelledById] [uniqueidentifier] NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_Payments] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Periods]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Periods](
	[Id] [uniqueidentifier] NOT NULL,
	[Name] [nvarchar](80) NOT NULL,
	[Type] [nvarchar](10) NOT NULL,
	[StartDate] [date] NOT NULL,
	[EndDate] [date] NOT NULL,
	[Status] [nvarchar](10) NOT NULL,
	[ApplicationsOpen] [bit] NOT NULL,
	[ClosedAt] [datetime2](7) NULL,
	[HalfTermEnabled] [bit] NOT NULL,
	[HalfTermFirstEnd] [date] NULL,
	[HalfTermSecondStart] [date] NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_Periods] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Placements]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Placements](
	[Id] [uniqueidentifier] NOT NULL,
	[PeriodId] [uniqueidentifier] NOT NULL,
	[EnrollmentId] [uniqueidentifier] NOT NULL,
	[RoomId] [uniqueidentifier] NOT NULL,
	[StartDate] [date] NOT NULL,
	[EndDate] [date] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_Placements] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[PushSubscriptions]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[PushSubscriptions](
	[Id] [uniqueidentifier] NOT NULL,
	[OwnerType] [nvarchar](10) NOT NULL,
	[OwnerId] [uniqueidentifier] NOT NULL,
	[Endpoint] [nvarchar](2000) NOT NULL,
	[EndpointHash] [nchar](64) NOT NULL,
	[P256dh] [nvarchar](200) NOT NULL,
	[Auth] [nvarchar](100) NOT NULL,
	[Lang] [nvarchar](5) NOT NULL,
	[UserAgent] [nvarchar](300) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[LastSuccessAt] [datetime2](7) NULL,
	[FailureCount] [int] NOT NULL,
 CONSTRAINT [PK_PushSubscriptions] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[RefreshTokens]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RefreshTokens](
	[Id] [uniqueidentifier] NOT NULL,
	[Role] [nvarchar](10) NOT NULL,
	[UserId] [uniqueidentifier] NOT NULL,
	[Stamp] [uniqueidentifier] NOT NULL,
	[FamilyId] [uniqueidentifier] NOT NULL,
	[TokenHash] [nvarchar](64) NOT NULL,
	[Persistent] [bit] NOT NULL,
	[LifetimeSeconds] [int] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[ExpiresAt] [datetime2](7) NOT NULL,
	[RevokedAt] [datetime2](7) NULL,
 CONSTRAINT [PK_RefreshTokens] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Rooms]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Rooms](
	[Id] [uniqueidentifier] NOT NULL,
	[ApartmentId] [uniqueidentifier] NOT NULL,
	[RoomTypeId] [uniqueidentifier] NOT NULL,
	[Name] [nvarchar](60) NOT NULL,
	[Beds] [int] NOT NULL,
	[Status] [nvarchar](20) NOT NULL,
	[Features] [nvarchar](max) NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_Rooms] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[RoomTypePrices]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RoomTypePrices](
	[Id] [uniqueidentifier] NOT NULL,
	[PeriodId] [uniqueidentifier] NOT NULL,
	[RoomTypeId] [uniqueidentifier] NOT NULL,
	[Monthly] [decimal](18, 2) NOT NULL,
	[Deposit] [decimal](18, 2) NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_RoomTypePrices] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[RoomTypes]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RoomTypes](
	[Id] [uniqueidentifier] NOT NULL,
	[Slug] [nvarchar](100) NOT NULL,
	[Name] [nvarchar](max) NOT NULL,
	[Description] [nvarchar](max) NULL,
	[CoverMediaId] [uniqueidentifier] NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_RoomTypes] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SiteSettings]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SiteSettings](
	[Id] [uniqueidentifier] NOT NULL,
	[Phone] [nvarchar](10) NULL,
	[Whatsapp] [nvarchar](10) NULL,
	[Email] [nvarchar](256) NULL,
	[Address] [nvarchar](max) NULL,
	[MapUrl] [nvarchar](1000) NULL,
	[Instagram] [nvarchar](200) NULL,
	[Iban] [nvarchar](26) NULL,
	[IbanHolder] [nvarchar](150) NULL,
	[HeroVideoMediaId] [uniqueidentifier] NULL,
	[MapMediaId] [uniqueidentifier] NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_SiteSettings] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Slides]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Slides](
	[Id] [uniqueidentifier] NOT NULL,
	[MediaId] [uniqueidentifier] NOT NULL,
	[Title] [nvarchar](max) NOT NULL,
	[Subtitle] [nvarchar](max) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_Slides] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SmsBatches]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SmsBatches](
	[Id] [uniqueidentifier] NOT NULL,
	[Purpose] [nvarchar](40) NOT NULL,
	[Text] [nvarchar](1100) NOT NULL,
	[RecipientCount] [int] NOT NULL,
	[SkippedCount] [int] NOT NULL,
	[TotalParts] [int] NOT NULL,
	[Status] [nvarchar](12) NOT NULL,
	[ProviderCampaignId] [nvarchar](40) NULL,
	[ProviderError] [nvarchar](300) NULL,
	[CreatedById] [uniqueidentifier] NULL,
	[CreatedByName] [nvarchar](120) NULL,
	[CompletedAt] [datetime2](7) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_SmsBatches] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SmsMessages]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SmsMessages](
	[Id] [uniqueidentifier] NOT NULL,
	[BatchId] [uniqueidentifier] NOT NULL,
	[PeriodId] [uniqueidentifier] NULL,
	[EnrollmentId] [uniqueidentifier] NULL,
	[ApplicationId] [uniqueidentifier] NULL,
	[StudentId] [uniqueidentifier] NULL,
	[RecipientName] [nvarchar](120) NOT NULL,
	[Phone] [nvarchar](12) NOT NULL,
	[Body] [nvarchar](1100) NOT NULL,
	[Parts] [int] NOT NULL,
	[Status] [nvarchar](14) NOT NULL,
	[ProviderStatus] [nvarchar](40) NULL,
	[ProviderMessageId] [nvarchar](40) NULL,
	[GsmError] [nvarchar](20) NULL,
	[Credits] [int] NULL,
	[SentAt] [datetime2](7) NULL,
	[DoneAt] [datetime2](7) NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_SmsMessages] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StaticPages]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StaticPages](
	[Id] [uniqueidentifier] NOT NULL,
	[Key] [nvarchar](40) NOT NULL,
	[Title] [nvarchar](max) NOT NULL,
	[Body] [nvarchar](max) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_StaticPages] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StudentGuardians]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StudentGuardians](
	[Id] [uniqueidentifier] NOT NULL,
	[StudentId] [uniqueidentifier] NOT NULL,
	[Name] [nvarchar](120) NOT NULL,
	[Phone] [nchar](10) NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_StudentGuardians] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Students]    Script Date: 10/22/2026 6:16:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Students](
	[Id] [uniqueidentifier] NOT NULL,
	[Tc] [nchar](11) NOT NULL,
	[FirstName] [nvarchar](60) NOT NULL,
	[LastName] [nvarchar](60) NOT NULL,
	[BirthDate] [date] NOT NULL,
	[Phone] [nchar](10) NOT NULL,
	[Address] [nvarchar](400) NOT NULL,
	[ProvinceId] [int] NOT NULL,
	[Province] [nvarchar](40) NOT NULL,
	[District] [nvarchar](60) NOT NULL,
	[School] [nvarchar](150) NOT NULL,
	[Faculty] [nvarchar](150) NOT NULL,
	[Department] [nvarchar](150) NOT NULL,
	[Grade] [nvarchar](8) NOT NULL,
	[Language] [nvarchar](2) NOT NULL,
	[PasswordHash] [nvarchar](256) NULL,
	[PasswordChangedAt] [datetime2](7) NULL,
	[SecurityStamp] [uniqueidentifier] NOT NULL,
	[LastLoginAt] [datetime2](7) NULL,
	[FailedLoginCount] [int] NOT NULL,
	[LockedUntil] [datetime2](7) NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[DeletedAt] [datetime2](7) NULL,
	[IsActive] [bit] NOT NULL,
	[OrderIndex] [int] NOT NULL,
 CONSTRAINT [PK_Students] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET QUOTED_IDENTIFIER ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET QUOTED_IDENTIFIER ON
GO
INSERT [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20261015170955_InitialCreate', N'9.0.21')
INSERT [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20261015172154_AddIdentityAndMedia', N'9.0.21')
INSERT [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20261015173531_AddStructureAndContent', N'9.0.21')
INSERT [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20261015175620_AddRegistrationAndLedger', N'9.0.21')
INSERT [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20261015180705_AddRegistrationAndAccounting', N'9.0.21')
INSERT [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20261015195117_AddMessagingAndSupport', N'9.0.21')
INSERT [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20261016221444_AddRefreshTokens', N'9.0.21')
INSERT [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20261017161822_SyncModelChanges', N'9.0.21')
INSERT [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20261019102250_AddBillSubscriptions', N'9.0.21')
GO
INSERT [dbo].[Accounts] ([Id], [Type], [Name], [Iban], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-619b-7dad-9225-e0370ed198bc', N'Cash', N'Nakit Kasa', NULL, CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 0)
GO
INSERT [dbo].[AccountTransactions] ([Id], [PeriodId], [AccountId], [Date], [Direction], [Amount], [Source], [SourceId], [Note], [CreatedById], [CreatedAt]) VALUES (N'01a1417f-ed6e-746e-875b-a533d0555f7d', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a14141-619b-7dad-9225-e0370ed198bc', CAST(N'2026-10-16' AS Date), N'In', CAST(23880.00 AS Decimal(18, 2)), N'Payment', N'01a1417f-ed38-765a-9560-e468e459c0c4', N'Öğrenci tahsilatı', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:37:45.3593612' AS DateTime2))
INSERT [dbo].[AccountTransactions] ([Id], [PeriodId], [AccountId], [Date], [Direction], [Amount], [Source], [SourceId], [Note], [CreatedById], [CreatedAt]) VALUES (N'01a14181-eb64-709a-b6dc-b5013dcbf901', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a14141-619b-7dad-9225-e0370ed198bc', CAST(N'2026-10-16' AS Date), N'Out', CAST(4800.00 AS Decimal(18, 2)), N'Expense', N'01a14181-eb43-745e-afb4-7ae49324bd20', N'Elektrik faturası (2026-10)', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:39:55.8821276' AS DateTime2))
INSERT [dbo].[AccountTransactions] ([Id], [PeriodId], [AccountId], [Date], [Direction], [Amount], [Source], [SourceId], [Note], [CreatedById], [CreatedAt]) VALUES (N'01a14aa3-c84f-7058-95af-eee90bff40b5', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a14141-619b-7dad-9225-e0370ed198bc', CAST(N'2026-10-17' AS Date), N'In', CAST(12000.00 AS Decimal(18, 2)), N'Payment', N'01a14aa3-c846-771b-bdb1-b61eeae15052', N'Öğrenci tahsilatı', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-17T16:13:30.0963390' AS DateTime2))
GO
INSERT [dbo].[AdminUsers] ([Id], [Email], [PasswordHash], [FullName], [LastLoginAt], [SecurityStamp], [FailedLoginCount], [LockedUntil], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'yonetici@mazlumapart.com', N'AQAAAAIAAYagAAAAEDyZ8fcEb50rqok3UXPCJumrmUTACHEmTw8clWsyuAhw0LATxthGWWWAqBrb/sqI4w==', N'Yönetici', CAST(N'2026-10-17T14:10:04.5908651' AS DateTime2), N'a08aea80-b985-44d2-b501-a7ddd67b77b9', 0, NULL, CAST(N'2026-10-15T17:22:34.0330806' AS DateTime2), CAST(N'2026-10-17T14:10:04.6084558' AS DateTime2), NULL, 1, 0)
GO
INSERT [dbo].[ApartmentMedia] ([Id], [ApartmentId], [MediaAssetId], [IsVideo], [TagKind], [RoomId], [AreaKey], [CustomLabel], [Caption], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1416c-a9f2-7e28-9be9-171a87422b94', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', N'01a1416c-a836-7568-94d4-e813f1b95478', 0, N'Room', N'01a1416a-fc12-737a-9b12-e1de047be841', NULL, NULL, NULL, CAST(N'2026-10-15T21:16:42.8671739' AS DateTime2), CAST(N'2026-10-15T21:16:46.5647805' AS DateTime2), NULL, 1, 1)
INSERT [dbo].[ApartmentMedia] ([Id], [ApartmentId], [MediaAssetId], [IsVideo], [TagKind], [RoomId], [AreaKey], [CustomLabel], [Caption], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14a36-5b03-7ed4-b170-63dfb26214e1', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', N'01a14a36-588b-7a4c-bf98-1bef9641c785', 0, N'Room', N'01a14a35-39f1-7b43-922e-27a6bdf0e808', NULL, NULL, NULL, CAST(N'2026-10-17T14:13:58.6828427' AS DateTime2), CAST(N'2026-10-17T14:14:05.6415603' AS DateTime2), NULL, 1, 4)
INSERT [dbo].[ApartmentMedia] ([Id], [ApartmentId], [MediaAssetId], [IsVideo], [TagKind], [RoomId], [AreaKey], [CustomLabel], [Caption], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1416d-638d-7ec6-9924-7533e6a5682b', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', N'01a1416d-618a-7e54-8b34-2d232ca03778', 0, N'Room', N'01a1416b-9a4e-73d9-bea9-6f7a70fd83f7', NULL, NULL, NULL, CAST(N'2026-10-15T21:17:30.3819673' AS DateTime2), CAST(N'2026-10-15T21:17:35.1937030' AS DateTime2), NULL, 1, 3)
INSERT [dbo].[ApartmentMedia] ([Id], [ApartmentId], [MediaAssetId], [IsVideo], [TagKind], [RoomId], [AreaKey], [CustomLabel], [Caption], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1416d-54b7-79a3-ac3e-c0029876d7fd', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', N'01a1416d-52c7-7033-9997-ab38d928ff87', 0, N'Room', N'01a1416b-5ebd-7a01-837a-cbf0adffc518', NULL, NULL, NULL, CAST(N'2026-10-15T21:17:26.5833875' AS DateTime2), CAST(N'2026-10-15T21:17:32.8880787' AS DateTime2), NULL, 1, 2)
INSERT [dbo].[ApartmentMedia] ([Id], [ApartmentId], [MediaAssetId], [IsVideo], [TagKind], [RoomId], [AreaKey], [CustomLabel], [Caption], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1416c-3a6f-7bb8-897b-c936a03b6117', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', N'01a1416c-3841-7d72-bb9f-296f1246fd7b', 1, N'Custom', NULL, NULL, N'{"tr":"T\u00FCm Daire","en":"T\u00FCm Daire"}', NULL, CAST(N'2026-10-15T21:16:14.3699177' AS DateTime2), CAST(N'2026-10-15T21:16:35.4709756' AS DateTime2), NULL, 1, 0)
GO
INSERT [dbo].[Apartments] ([Id], [Name], [Slug], [Floor], [Kitchens], [Bathrooms], [Note], [IsPublished], [SharedAreas], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', N'B Blok Kat 2', N'b-blok-kat-2', 2, 2, 1, N'Tamamen kişisel odalar, toplam 3 kişilik.', 1, N'[{"icon":"check_circle","text":{"tr":"Mutfak","en":null}},{"icon":"check_circle","text":{"tr":"Banyo","en":null}}]', CAST(N'2026-10-15T21:13:59.5288843' AS DateTime2), CAST(N'2026-10-17T15:01:17.4770620' AS DateTime2), NULL, 1, 0)
GO
INSERT [dbo].[Applications] ([Id], [No], [PeriodId], [Source], [Status], [Applicant], [Tc], [Phone], [FullName], [RoomTypeId], [PreferredRoomId], [Term], [EntryDate], [PayWindow], [PriceMonthly], [PriceDeposit], [Note], [DecidedAt], [DecidedById], [RejectReason], [EnrollmentId], [Ip], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1417b-3f70-72ad-973c-4ed88cb83876', N'MA-2026-0001', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'Online', N'Approved', N'{"tc":"10693492082","firstName":"Feyza","lastName":"Demir","birthDate":"2006-01-13","phone":"5464571142","address":"Kayal\u0131k mahallesi 2458.sokak no20 kat2 Ad\u0131yaman merkez","provinceId":2,"province":"Ad\u0131yaman","district":"Merkez","school":"KT\u00DC","faculty":"M\u00FChendislik Fak.","department":"Bilgisayar M\u00FCh.","grade":"1","guardians":[{"name":"Makbule Demir","phone":"5536408195"},{"name":"Nusret Demir","phone":"5058699193"}]}', N'10693492082', N'5464571142', N'Feyza Demir', N'01a14167-d9f9-7dad-8af2-e4e9f63f3320', N'01a1416b-5ebd-7a01-837a-cbf0adffc518', N'Full', CAST(N'2026-10-16' AS Date), N'Early', CAST(12500.00 AS Decimal(18, 2)), CAST(12500.00 AS Decimal(18, 2)), NULL, CAST(N'2026-10-15T21:33:03.7052995' AS DateTime2), N'01a14096-4b50-7a09-bc8b-72ddf00697e5', NULL, N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'::1', CAST(N'2026-10-15T21:32:38.6951710' AS DateTime2), CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2), NULL, 1, 0)
GO
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14691-40de-784d-b935-009191777f8f', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'student.password_reset', N'student', N'01a1417b-a064-727a-a163-f45777b2e616', NULL, NULL, NULL, NULL, N'::1', CAST(N'2026-10-16T21:14:46.8784565' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14a35-3a15-73be-95a4-01713732eb6b', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'room.create', N'room', N'01a14a35-39f1-7b43-922e-27a6bdf0e808', NULL, NULL, N'{"name":"\u00C7ift Ki\u015Filik Oda","apartmentId":"01a1416a-2bb3-73ef-9160-99c7dd4cd579","roomTypeId":"01a14a34-3885-7555-ae34-d4911058e231","beds":2,"status":"active"}', NULL, N'::1', CAST(N'2026-10-17T14:12:44.6972364' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a146ae-8bce-7a15-a750-01900a4b99be', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'push.bulk', N'notification', N'01a146ae-8bcd-7b37-b69a-03a3d406d7cc', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"purpose":"announcement","title":"test bildirimi","recipients":1,"delivered":1,"skipped":0}', NULL, N'::1', CAST(N'2026-10-16T21:46:46.6061437' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14a39-b7fd-7bdc-9249-05275c654114', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'price.update', N'price', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c:01a14a34-3885-7555-ae34-d4911058e231', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"roomTypeId":"01a14a34-3885-7555-ae34-d4911058e231","monthly":10000,"deposit":10000}', NULL, N'::1', CAST(N'2026-10-17T14:17:39.0719720' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14a9e-2417-76e1-b8f2-0600db946ce9', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'maintenance.update', N'maintenance', N'01a14a9d-a99a-7c90-b53c-e3ef1fd2c01e', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'{"status":"in_progress","adminNote":null}', N'{"status":"done","adminNote":null}', NULL, N'::1', CAST(N'2026-10-17T16:07:20.3432699' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1416d-54b7-737b-8420-13c6a5427d07', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'apartment.gallery.add', N'apartment', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', NULL, NULL, N'{"media":["01a1416d-52c7-7033-9997-ab38d928ff87"]}', NULL, N'::1', CAST(N'2026-10-15T21:17:26.5833875' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1416a-2be6-7ae0-bcbc-1932077a1f66', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'apartment.create', N'apartment', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', NULL, NULL, N'{"name":"B Blok Kat 2","floor":2,"kitchens":1,"bathrooms":1,"isPublished":true}', NULL, N'::1', CAST(N'2026-10-15T21:13:59.5288843' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14181-eb65-7d6e-88f4-381e5a820216', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'bill.pay', N'bill', N'01a14181-9a09-7825-9a9f-09c7a2cf7f27', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'{"status":"unpaid"}', N'{"status":"paid","date":"2026-10-16","account":"Nakit Kasa","expenseId":"01a14181-eb43-745e-afb4-7ae49324bd20"}', NULL, N'::1', CAST(N'2026-10-15T21:39:55.8821276' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14167-da28-7125-8940-3843702885b3', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'roomtype.create', N'roomtype', N'01a14167-d9f9-7dad-8af2-e4e9f63f3320', NULL, NULL, N'{"name":{"tr":"Tek Ki\u015Filik Oda","en":null},"slug":"tek-kisilik-oda","isActive":true}', NULL, N'::1', CAST(N'2026-10-15T21:11:27.5319403' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a15437-a75f-7c2e-9736-3f28b915786f', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'maintenance.update', N'maintenance', N'01a15437-73dc-724a-91ac-f8139347902c', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'{"status":"received","adminNote":null}', N'{"status":"in_progress","adminNote":null}', NULL, N'::1', CAST(N'2026-10-19T12:51:35.9068477' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14182-3804-717b-9f3b-3f9eb74aaa45', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'student.password_reset', N'student', N'01a1417b-a064-727a-a163-f45777b2e616', NULL, NULL, NULL, NULL, N'::1', CAST(N'2026-10-15T21:40:15.4923257' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14184-94b0-71f5-897b-428893ab815e', N'Student', N'01a1417b-a064-727a-a163-f45777b2e616', N'Feyza Demir', N'maintenance.create', N'maintenance', N'01a14184-947c-7943-8208-b3464399b716', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"no":"TK-0001","area":"room","title":"Yatak Ba\u015Fl\u0131\u011F\u0131 K\u0131r\u0131ld\u0131","photos":1}', NULL, N'::1', CAST(N'2026-10-15T21:42:50.2908891' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1417f-ed8a-7b78-b91c-4706a6d2c7b7', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'payment.create', N'payment', N'01a1417f-ed38-765a-9560-e468e459c0c4', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"amount":23880,"method":"cash","account":"Nakit Kasa","manual":false,"lines":[{"chargeId":"01a1417b-a13b-7f3f-8bc9-2f9796dca568","amount":12500.00},{"chargeId":"01a1417b-a158-7226-8572-641d0c05bd71","amount":11380.00}],"advance":0}', NULL, N'::1', CAST(N'2026-10-15T21:37:45.3593612' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14a61-ac05-7b00-8736-4e134a2f8cf1', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'apartment.update', N'apartment', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', NULL, N'{"name":"B Blok Kat 2","floor":2,"kitchens":1,"bathrooms":1,"isPublished":true}', N'{"name":"B Blok Kat 2","floor":2,"kitchens":2,"bathrooms":1,"isPublished":true}', NULL, N'::1', CAST(N'2026-10-17T15:01:17.4770620' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14168-6f34-7974-96fd-4edafed483e6', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'price.update', N'price', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c:01a14167-d9f9-7dad-8af2-e4e9f63f3320', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"roomTypeId":"01a14167-d9f9-7dad-8af2-e4e9f63f3320","monthly":12500,"deposit":12500}', NULL, N'::1', CAST(N'2026-10-15T21:12:05.6875825' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14e72-8184-7dbf-b35e-570f211b0a85', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'sms.send', N'sms', N'01a14e72-812c-718b-bbad-de100c574a5b', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"purpose":"payment_overdue","recipients":1,"skipped":0,"parts":1,"status":"simulated","error":null}', NULL, N'::1', CAST(N'2026-10-18T09:58:09.5469855' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1416b-5ebd-757e-aa6d-57b5cd937db3', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'room.create', N'room', N'01a1416b-5ebd-7a01-837a-cbf0adffc518', NULL, NULL, N'{"name":"Oda 2","apartmentId":"01a1416a-2bb3-73ef-9160-99c7dd4cd579","roomTypeId":"01a14167-d9f9-7dad-8af2-e4e9f63f3320","beds":1,"status":"active"}', NULL, N'::1', CAST(N'2026-10-15T21:15:18.0781129' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a15431-2df2-74c8-af02-595d3972ecc9', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'sms.send', N'sms', N'01a15431-2cc7-7c06-bb5e-a31c15139ab9', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"purpose":"application_received","recipients":1,"skipped":0,"parts":1,"status":"simulated","error":null}', NULL, N'::1', CAST(N'2026-10-19T12:44:31.6598900' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14a9c-6ba2-7897-98b1-5f7a4e40763f', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'student.password_reset', N'student', N'01a1417b-a064-727a-a163-f45777b2e616', NULL, NULL, NULL, NULL, N'::1', CAST(N'2026-10-17T16:05:27.5994632' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14aa3-c86c-71ce-a583-5fac16e66ac9', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'payment.create', N'payment', N'01a14aa3-c846-771b-bdb1-b61eeae15052', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"amount":12000,"method":"cash","account":"Nakit Kasa","manual":false,"lines":[{"chargeId":"01a1417b-a158-7226-8572-641d0c05bd71","amount":1120.00},{"chargeId":"01a1417b-a158-7485-bcac-8e40de1feaee","amount":10880.00}],"advance":0}', NULL, N'::1', CAST(N'2026-10-17T16:13:30.0963390' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1416b-9a4e-73cd-8eb0-60722f62feaa', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'room.create', N'room', N'01a1416b-9a4e-73d9-bea9-6f7a70fd83f7', NULL, NULL, N'{"name":"Oda 3","apartmentId":"01a1416a-2bb3-73ef-9160-99c7dd4cd579","roomTypeId":"01a14167-d9f9-7dad-8af2-e4e9f63f3320","beds":1,"status":"active"}', NULL, N'::1', CAST(N'2026-10-15T21:15:33.3268924' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1469f-630c-7f04-baf2-68b1182c68ef', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'student.password_reset', N'student', N'01a1417b-a064-727a-a163-f45777b2e616', NULL, NULL, NULL, NULL, N'::1', CAST(N'2026-10-16T21:30:13.1682178' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a146a2-620a-7911-8f68-68e3a79a8137', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'push.bulk', N'notification', N'01a146a2-620a-7e52-ba03-f9ca9cd48f47', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"purpose":"announcement","title":"Test Bildirimi","recipients":1,"delivered":1,"skipped":0}', NULL, N'::1', CAST(N'2026-10-16T21:33:29.4824898' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14688-9cae-7f6f-8ba1-6952a8bf8132', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'student.password_reset', N'student', N'01a1417b-a064-727a-a163-f45777b2e616', NULL, NULL, NULL, NULL, N'127.0.0.1', CAST(N'2026-10-16T21:05:20.5609629' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a146ab-4a03-7796-b6ef-6aa69f6ba296', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'settings.update', N'settings', N'site', NULL, N'{"phone":"","whatsapp":"","email":"","address":{"tr":"","en":null},"mapUrl":"","instagram":"","iban":"","ibanHolder":"","heroVideoMediaId":null,"mapMediaId":null}', N'{"phone":"5058699193","whatsapp":"5058699193","email":"","address":{"tr":"","en":null},"mapUrl":"","instagram":"","iban":"","ibanHolder":"","heroVideoMediaId":null,"mapMediaId":null}', NULL, N'::1', CAST(N'2026-10-16T21:43:13.1590670' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14aab-6dda-7733-858b-74780d650d3f', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'push.bulk', N'notification', N'01a14aab-6d9d-7a81-926c-36609c8eb902', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"purpose":"announcement","title":"Yar\u0131n Temizlik\u00E7i Gelecek","recipients":1,"delivered":1,"skipped":0}', NULL, N'::1', CAST(N'2026-10-17T16:21:51.2173527' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14186-ecb8-7cc3-8ff2-76ffb04bc738', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'sms.send', N'sms', N'01a14186-ec55-74e6-afa4-ee56fe2cbf16', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"purpose":"announcement","recipients":1,"skipped":0,"parts":1,"status":"simulated","error":null}', NULL, N'::1', CAST(N'2026-10-15T21:45:23.9022909' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1416a-fc37-7eb4-8527-7905add0e015', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'room.create', N'room', N'01a1416a-fc12-737a-9b12-e1de047be841', NULL, NULL, N'{"name":"Oda 1","apartmentId":"01a1416a-2bb3-73ef-9160-99c7dd4cd579","roomTypeId":"01a14167-d9f9-7dad-8af2-e4e9f63f3320","beds":1,"status":"active"}', NULL, N'::1', CAST(N'2026-10-15T21:14:52.8586067' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1417d-a00c-7820-b5ef-7affbb686472', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'charge.create', N'charge', N'01a1417d-a00a-7652-bb07-29139c22f968', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"kind":"deposit","month":"2026-10","amount":12000,"dueDate":"2026-10-16","note":null}', NULL, N'::1', CAST(N'2026-10-15T21:35:14.4468742' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14185-a5f9-7159-a5ae-7c653dffe78e', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'maintenance.update', N'maintenance', N'01a14184-947c-7943-8208-b3464399b716', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'{"status":"received","adminNote":null}', N'{"status":"in_progress","adminNote":"eleman g\u00F6nderiyorum s\u0131k\u0131nt\u0131 yok"}', NULL, N'::1', CAST(N'2026-10-15T21:44:00.2523367' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a15438-78ac-795e-9628-8bb045ceaf32', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'push.bulk', N'notification', N'01a15438-78ac-7a05-aec2-58f813cd3ec1', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"purpose":"announcement","title":"test","recipients":1,"delivered":1,"skipped":0}', NULL, N'::1', CAST(N'2026-10-19T12:52:29.4851062' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1417e-d029-73c2-b5e7-8ec5da84b63f', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'charge.reverse', N'charge', N'01a1417d-a00a-7652-bb07-29139c22f968', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'{"kind":"deposit","month":"2026-10","net":12000.00,"allocated":0,"remaining":12000.00}', N'{"reversal":-12000.00}', N'hata oldu', N'::1', CAST(N'2026-10-15T21:36:32.3017629' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14a9d-f0f5-77d9-97ad-8fa2f8045534', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'maintenance.update', N'maintenance', N'01a14a9d-a99a-7c90-b53c-e3ef1fd2c01e', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'{"status":"received","adminNote":null}', N'{"status":"in_progress","adminNote":null}', NULL, N'::1', CAST(N'2026-10-17T16:07:07.2553789' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1417c-d393-7e1c-a7e7-965fb71db30f', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'placement.create', N'placement', N'01a1417c-d37e-7ebc-ab91-83749947275f', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"room":"Oda 1","start":"2026-10-16","end":"2027-06-30","enrollmentId":"01a1417b-a0fc-7491-a47a-1f7de1e7fc33"}', NULL, N'::1', CAST(N'2026-10-15T21:34:22.1017975' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1417b-3fa4-7489-97c5-9841f78ed21a', N'Public', NULL, N'Ziyaretçi', N'application.create', N'application', N'01a1417b-3f70-72ad-973c-4ed88cb83876', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"no":"MA-2026-0001","source":"online"}', NULL, N'::1', CAST(N'2026-10-15T21:32:38.6951710' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14694-51f3-7322-985a-9b3c1fe90601', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'push.bulk', N'notification', N'01a14694-51f3-7341-b8e0-f2f9d6a0ffd3', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"purpose":"announcement","title":"Yurt \u00D6demeleri Hakk\u0131nda","recipients":1,"delivered":0,"skipped":0}', NULL, N'::1', CAST(N'2026-10-16T21:18:07.8594301' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1416c-a9f2-7d08-a9be-a351a355905f', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'apartment.gallery.add', N'apartment', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', NULL, NULL, N'{"media":["01a1416c-a836-7568-94d4-e813f1b95478"]}', NULL, N'::1', CAST(N'2026-10-15T21:16:42.8671739' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a15431-a65f-748e-885a-a6ca869cedf9', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'push.bulk', N'notification', N'01a15431-a611-7ab5-97ab-c186f9b4eb6c', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"purpose":"announcement","title":"dtrgtg","recipients":1,"delivered":1,"skipped":0}', NULL, N'::1', CAST(N'2026-10-19T12:45:02.4332672' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14165-7e5a-766c-8580-ac4dad2d61ff', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'period.create', N'period', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"name":"2026\u20132027 Akademik","type":"academic","start":"2026-09-01","end":"2027-06-30","closed":[],"copiedPrices":0}', NULL, N'::1', CAST(N'2026-10-15T21:08:52.9938528' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a146a8-ba2d-7f98-8c22-aff759be987c', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'push.bulk', N'notification', N'01a146a8-b9f2-7de0-94f9-6e5ed1c14305', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"purpose":"announcement","title":"Test Bildirimi","recipients":1,"delivered":1,"skipped":0}', NULL, N'::1', CAST(N'2026-10-16T21:40:25.2847567' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14a9d-a9b3-7200-a6bb-b2af36655ffd', N'Student', N'01a1417b-a064-727a-a163-f45777b2e616', N'Feyza Demir', N'maintenance.create', N'maintenance', N'01a14a9d-a99a-7c90-b53c-e3ef1fd2c01e', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"no":"TK-0002","area":"room","title":"Gard\u0131rop kapa\u011F\u0131 \u00E7\u0131kt\u0131","photos":0}', NULL, N'178.244.73.6', CAST(N'2026-10-17T16:06:49.0158550' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14694-1c10-7b21-b449-b49928a79c61', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'push.bulk', N'notification', N'01a14694-1bf0-7056-ae51-44fc019f4de1', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"purpose":"announcement","title":"Yurt \u00D6demeleri Hakk\u0131nda","recipients":1,"delivered":0,"skipped":0}', NULL, N'::1', CAST(N'2026-10-16T21:17:54.0683561' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a146a0-f0c2-7883-8452-b4eb3763da5f', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'push.bulk', N'notification', N'01a146a0-f086-78fd-a722-673c6350c05b', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"purpose":"announcement","title":"Test Bildirimi","recipients":1,"delivered":1,"skipped":0}', NULL, N'::1', CAST(N'2026-10-16T21:31:54.9504061' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a146be-47a3-7a0a-89a6-b806a22e5619', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'maintenance.update', N'maintenance', N'01a14184-947c-7943-8208-b3464399b716', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'{"status":"in_progress","adminNote":"eleman g\u00F6nderiyorum s\u0131k\u0131nt\u0131 yok"}', N'{"status":"done","adminNote":"eleman g\u00F6nderiyorum s\u0131k\u0131nt\u0131 yok"}', NULL, N'::1', CAST(N'2026-10-16T22:03:57.7337761' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1417b-a159-781c-8529-cdc34084088b', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'application.approve', N'application', N'01a1417b-3f70-72ad-973c-4ed88cb83876', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'{"status":"pending"}', N'{"status":"approved","enrollmentId":"01a1417b-a0fc-7491-a47a-1f7de1e7fc33","charges":9}', NULL, N'::1', CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14181-9a31-7380-83e8-da2d4ef8b233', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'bill.create', N'bill', N'01a14181-9a09-7825-9a9f-09c7a2cf7f27', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"kind":"electricity","month":"2026-10","amount":4800,"dueDate":"2026-10-16","note":null}', NULL, N'::1', CAST(N'2026-10-15T21:39:35.0924556' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14a36-5b17-73b6-9665-db89d6cdfc73', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'apartment.gallery.add', N'apartment', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', NULL, NULL, N'{"media":["01a14a36-588b-7a4c-bf98-1bef9641c785"]}', NULL, N'::1', CAST(N'2026-10-17T14:13:58.6828427' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1416c-3a9e-7368-8459-dc5bd7c98316', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'apartment.gallery.add', N'apartment', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', NULL, NULL, N'{"media":["01a1416c-3841-7d72-bb9f-296f1246fd7b"]}', NULL, N'::1', CAST(N'2026-10-15T21:16:14.3699177' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a15436-3fbb-78f2-a55b-dc6ee993ba8e', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'student.password_reset', N'student', N'01a1417b-a064-727a-a163-f45777b2e616', NULL, NULL, NULL, NULL, N'::1', CAST(N'2026-10-19T12:50:03.8362766' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1417d-f46e-7208-86fd-dd578ef35d85', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'student.password_reset', N'student', N'01a1417b-a064-727a-a163-f45777b2e616', NULL, NULL, NULL, NULL, N'::1', CAST(N'2026-10-15T21:35:36.0465504' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a146a1-532a-78af-a1a6-eb66a9c4f343', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'push.bulk', N'notification', N'01a146a1-5329-7263-b40c-54fc5a754f11', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"purpose":"announcement","title":"Test Bildirimi","recipients":1,"delivered":1,"skipped":0}', NULL, N'::1', CAST(N'2026-10-16T21:32:20.1381395' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a14a34-38b1-76d1-937f-f22752de8d9f', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'roomtype.create', N'roomtype', N'01a14a34-3885-7555-ae34-d4911058e231', NULL, NULL, N'{"name":{"tr":"2 Ki\u015Filik Oda","en":null},"slug":"2-kisilik-oda","isActive":true}', NULL, N'::1', CAST(N'2026-10-17T14:11:38.8395023' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a1416d-638d-7a2f-b8f0-f6cc12a91331', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'apartment.gallery.add', N'apartment', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', NULL, NULL, N'{"media":["01a1416d-618a-7e54-8b34-2d232ca03778"]}', NULL, N'::1', CAST(N'2026-10-15T21:17:30.3819673' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a15437-c3a8-7f71-b20b-fe2c70e312f4', N'Admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', N'maintenance.update', N'maintenance', N'01a15437-73dc-724a-91ac-f8139347902c', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'{"status":"in_progress","adminNote":null}', N'{"status":"done","adminNote":null}', NULL, N'::1', CAST(N'2026-10-19T12:51:43.1454030' AS DateTime2))
INSERT [dbo].[AuditLogs] ([Id], [ActorType], [ActorId], [ActorName], [Action], [Entity], [EntityId], [PeriodId], [Before], [After], [Note], [Ip], [CreatedAt]) VALUES (N'01a15437-73ec-7402-a777-ff19266fbc25', N'Student', N'01a1417b-a064-727a-a163-f45777b2e616', N'Feyza Demir', N'maintenance.create', N'maintenance', N'01a15437-73dc-724a-91ac-f8139347902c', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', NULL, N'{"no":"TK-0003","area":"kitchen","title":"Jsjfkdkd","photos":0}', NULL, N'31.142.207.223', CAST(N'2026-10-19T12:51:22.7358093' AS DateTime2))
GO
INSERT [dbo].[Bills] ([Id], [PeriodId], [Kind], [Month], [Amount], [DueDate], [Note], [Status], [PaidAt], [ExpenseId], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex], [AwaitingInvoice], [SubscriberNo], [SubscriptionId]) VALUES (N'01a14181-9a09-7825-9a9f-09c7a2cf7f27', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'Electricity', N'2026-10', CAST(4800.00 AS Decimal(18, 2)), CAST(N'2026-10-16' AS Date), NULL, N'Paid', CAST(N'2026-10-16' AS Date), N'01a14181-eb43-745e-afb4-7ae49324bd20', CAST(N'2026-10-15T21:39:35.0924556' AS DateTime2), CAST(N'2026-10-15T21:39:55.8821276' AS DateTime2), NULL, 1, 0, 0, NULL, NULL)
GO
INSERT [dbo].[Charges] ([Id], [PeriodId], [EnrollmentId], [Kind], [Month], [Amount], [DueDate], [Note], [ReversalOfId], [CreatedById], [CreatedAt]) VALUES (N'01a1417b-a159-76e9-89d2-21a8df0f6785', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Rent', N'2027-01', CAST(12500.00 AS Decimal(18, 2)), CAST(N'2027-01-05' AS Date), NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2))
INSERT [dbo].[Charges] ([Id], [PeriodId], [EnrollmentId], [Kind], [Month], [Amount], [DueDate], [Note], [ReversalOfId], [CreatedById], [CreatedAt]) VALUES (N'01a1417d-a00a-7652-bb07-29139c22f968', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Deposit', N'2026-10', CAST(12000.00 AS Decimal(18, 2)), CAST(N'2026-10-16' AS Date), NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:35:14.4468742' AS DateTime2))
INSERT [dbo].[Charges] ([Id], [PeriodId], [EnrollmentId], [Kind], [Month], [Amount], [DueDate], [Note], [ReversalOfId], [CreatedById], [CreatedAt]) VALUES (N'01a1417b-a13b-7f3f-8bc9-2f9796dca568', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Deposit', N'2026-10', CAST(12500.00 AS Decimal(18, 2)), CAST(N'2026-10-16' AS Date), N'Depozito (son ay kirası yerine)', NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2))
INSERT [dbo].[Charges] ([Id], [PeriodId], [EnrollmentId], [Kind], [Month], [Amount], [DueDate], [Note], [ReversalOfId], [CreatedById], [CreatedAt]) VALUES (N'01a1417b-a159-7d0d-ab19-4da846fe71cc', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Rent', N'2027-05', CAST(12500.00 AS Decimal(18, 2)), CAST(N'2027-05-05' AS Date), NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2))
INSERT [dbo].[Charges] ([Id], [PeriodId], [EnrollmentId], [Kind], [Month], [Amount], [DueDate], [Note], [ReversalOfId], [CreatedById], [CreatedAt]) VALUES (N'01a1417b-a158-7226-8572-641d0c05bd71', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Rent', N'2026-10', CAST(12500.00 AS Decimal(18, 2)), CAST(N'2026-10-16' AS Date), N'İlk ay kirası (peşin)', NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2))
INSERT [dbo].[Charges] ([Id], [PeriodId], [EnrollmentId], [Kind], [Month], [Amount], [DueDate], [Note], [ReversalOfId], [CreatedById], [CreatedAt]) VALUES (N'01a1417b-a159-7dca-aa82-66e964793d2c', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Rent', N'2027-03', CAST(12500.00 AS Decimal(18, 2)), CAST(N'2027-03-05' AS Date), NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2))
INSERT [dbo].[Charges] ([Id], [PeriodId], [EnrollmentId], [Kind], [Month], [Amount], [DueDate], [Note], [ReversalOfId], [CreatedById], [CreatedAt]) VALUES (N'01a1417b-a158-7485-bcac-8e40de1feaee', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Rent', N'2026-11', CAST(12500.00 AS Decimal(18, 2)), CAST(N'2026-11-05' AS Date), NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2))
INSERT [dbo].[Charges] ([Id], [PeriodId], [EnrollmentId], [Kind], [Month], [Amount], [DueDate], [Note], [ReversalOfId], [CreatedById], [CreatedAt]) VALUES (N'01a1417b-a159-79b4-9d52-c27e6cefa24c', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Rent', N'2027-04', CAST(12500.00 AS Decimal(18, 2)), CAST(N'2027-04-05' AS Date), NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2))
INSERT [dbo].[Charges] ([Id], [PeriodId], [EnrollmentId], [Kind], [Month], [Amount], [DueDate], [Note], [ReversalOfId], [CreatedById], [CreatedAt]) VALUES (N'01a1417e-d027-76ad-b00b-ca51af1725e1', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Deposit', N'2026-10', CAST(-12000.00 AS Decimal(18, 2)), CAST(N'2026-10-16' AS Date), N'İptal: hata oldu', N'01a1417d-a00a-7652-bb07-29139c22f968', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:36:32.3017629' AS DateTime2))
INSERT [dbo].[Charges] ([Id], [PeriodId], [EnrollmentId], [Kind], [Month], [Amount], [DueDate], [Note], [ReversalOfId], [CreatedById], [CreatedAt]) VALUES (N'01a1417b-a159-7087-aa77-cd92959a4034', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Rent', N'2026-12', CAST(12500.00 AS Decimal(18, 2)), CAST(N'2026-12-05' AS Date), NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2))
INSERT [dbo].[Charges] ([Id], [PeriodId], [EnrollmentId], [Kind], [Month], [Amount], [DueDate], [Note], [ReversalOfId], [CreatedById], [CreatedAt]) VALUES (N'01a1417b-a159-7552-979e-f07b0eb39351', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Rent', N'2027-02', CAST(12500.00 AS Decimal(18, 2)), CAST(N'2027-02-05' AS Date), NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2))
GO
INSERT [dbo].[ContactLogs] ([Id], [PeriodId], [EnrollmentId], [Channel], [Purpose], [Note], [SmsMessageId], [NotificationBatchId], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a15431-a65d-73f3-8f22-0732f23e0a4b', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Push', N'announcement', N'dtrgtg — tdgthrth', NULL, N'01a15431-a611-7ab5-97ab-c186f9b4eb6c', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-19T12:45:02.4332672' AS DateTime2))
INSERT [dbo].[ContactLogs] ([Id], [PeriodId], [EnrollmentId], [Channel], [Purpose], [Note], [SmsMessageId], [NotificationBatchId], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a146ae-8bcd-7104-a98f-14ad1c7b2c09', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Push', N'announcement', N'test bildirimi — merhaba Feyza', NULL, N'01a146ae-8bcd-7b37-b69a-03a3d406d7cc', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-16T21:46:46.6061437' AS DateTime2))
INSERT [dbo].[ContactLogs] ([Id], [PeriodId], [EnrollmentId], [Channel], [Purpose], [Note], [SmsMessageId], [NotificationBatchId], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a15438-78ac-7e25-8cea-221ceff1ea2c', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Push', N'announcement', N'test — merhaba Feyza', NULL, N'01a15438-78ac-7a05-aec2-58f813cd3ec1', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-19T12:52:29.4851062' AS DateTime2))
INSERT [dbo].[ContactLogs] ([Id], [PeriodId], [EnrollmentId], [Channel], [Purpose], [Note], [SmsMessageId], [NotificationBatchId], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a146a1-5329-7b03-a3c2-6c38999d34ff', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Push', N'announcement', N'Test Bildirimi — Test bildirimi açıklaması 123', NULL, N'01a146a1-5329-7263-b40c-54fc5a754f11', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-16T21:32:20.1381395' AS DateTime2))
INSERT [dbo].[ContactLogs] ([Id], [PeriodId], [EnrollmentId], [Channel], [Purpose], [Note], [SmsMessageId], [NotificationBatchId], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a14186-eca5-7392-bc72-6e0d8480fd2c', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Sms', N'announcement', N'sayın Feyza, yarın temizlikçi gelemeyecekmiş, bilginize.', N'01a14186-ec6b-7af6-88aa-67c9dbae9518', NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-15T21:45:23.9022909' AS DateTime2))
INSERT [dbo].[ContactLogs] ([Id], [PeriodId], [EnrollmentId], [Channel], [Purpose], [Note], [SmsMessageId], [NotificationBatchId], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a14aab-6dc4-79c4-88d8-7c9791c2f48e', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Push', N'announcement', N'Yarın Temizlikçi Gelecek — Merhaba Feyza, yarın öğle vakitlerinde temizlkçi gelecek, haberin olsun.', NULL, N'01a14aab-6d9d-7a81-926c-36609c8eb902', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-17T16:21:51.2173527' AS DateTime2))
INSERT [dbo].[ContactLogs] ([Id], [PeriodId], [EnrollmentId], [Channel], [Purpose], [Note], [SmsMessageId], [NotificationBatchId], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a15431-2db2-761c-8325-90d55f96fa39', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Sms', N'application_received', N'sdfsdfsfsf Feyza', N'01a15431-2cfc-7343-bd64-abda3c91d114', NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-19T12:44:31.6598900' AS DateTime2))
INSERT [dbo].[ContactLogs] ([Id], [PeriodId], [EnrollmentId], [Channel], [Purpose], [Note], [SmsMessageId], [NotificationBatchId], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a14e72-8182-7de0-baff-b4c3c1e889db', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Sms', N'payment_overdue', N'sefsfsefsef Feyza, 76.620 TL', N'01a14e72-8143-7138-abd1-bc9c40fe603d', NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-18T09:58:09.5469855' AS DateTime2))
INSERT [dbo].[ContactLogs] ([Id], [PeriodId], [EnrollmentId], [Channel], [Purpose], [Note], [SmsMessageId], [NotificationBatchId], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a146a0-f0ad-7cbe-9897-c91a9b73eb71', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Push', N'announcement', N'Test Bildirimi — Test bildirimi açıklaması 123', NULL, N'01a146a0-f086-78fd-a722-673c6350c05b', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-16T21:31:54.9504061' AS DateTime2))
INSERT [dbo].[ContactLogs] ([Id], [PeriodId], [EnrollmentId], [Channel], [Purpose], [Note], [SmsMessageId], [NotificationBatchId], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a146a2-620a-721d-8054-ebd7abc462bd', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Push', N'announcement', N'Test Bildirimi — Test bildirimi açıklaması 123 Feyza', NULL, N'01a146a2-620a-7e52-ba03-f9ca9cd48f47', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-16T21:33:29.4824898' AS DateTime2))
INSERT [dbo].[ContactLogs] ([Id], [PeriodId], [EnrollmentId], [Channel], [Purpose], [Note], [SmsMessageId], [NotificationBatchId], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a146a8-ba18-7a06-95d2-f66f6e63be56', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Push', N'announcement', N'Test Bildirimi — Test açıklaması, merhaba Feyza', NULL, N'01a146a8-b9f2-7de0-94f9-6e5ed1c14305', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-16T21:40:25.2847567' AS DateTime2))
GO
INSERT [dbo].[Enrollments] ([Id], [PeriodId], [StudentId], [ApplicationId], [RoomTypeId], [Status], [PayWindow], [Term], [EntryDate], [MonthlyPrice], [DepositPrice], [EndedAt], [EndReason], [LedgerVersion], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a064-727a-a163-f45777b2e616', N'01a1417b-3f70-72ad-973c-4ed88cb83876', N'01a14167-d9f9-7dad-8af2-e4e9f63f3320', N'Active', N'Early', N'Full', CAST(N'2026-10-16' AS Date), CAST(12500.00 AS Decimal(18, 2)), CAST(12500.00 AS Decimal(18, 2)), NULL, NULL, 17, CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2), CAST(N'2026-10-17T16:13:30.0963390' AS DateTime2), NULL, 1, 0)
GO
INSERT [dbo].[ExpenseCategories] ([Id], [Name], [SystemKey], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-6198-77e7-98ea-0748cd76835b', N'Malzeme', NULL, CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 3)
INSERT [dbo].[ExpenseCategories] ([Id], [Name], [SystemKey], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-6198-74f6-a6f5-13a600f98aca', N'Diğer', NULL, CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 6)
INSERT [dbo].[ExpenseCategories] ([Id], [Name], [SystemKey], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-618f-7051-828f-37540f7fc5c3', N'Bakım & Onarım', NULL, CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 1)
INSERT [dbo].[ExpenseCategories] ([Id], [Name], [SystemKey], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-6198-7d6d-8e1c-75a371a032a6', N'Faturalar', N'bills', CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 5)
INSERT [dbo].[ExpenseCategories] ([Id], [Name], [SystemKey], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-6198-73c3-a932-8b4fca447792', N'Vergi & Harç', NULL, CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 4)
INSERT [dbo].[ExpenseCategories] ([Id], [Name], [SystemKey], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-6198-7e8f-8711-fa2d3009c8df', N'Temizlik', NULL, CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 2)
GO
INSERT [dbo].[Expenses] ([Id], [PeriodId], [CategoryId], [Amount], [Date], [AccountId], [Description], [BillId], [CreatedById], [CancelledAt], [CancelReason], [CancelledById], [CreatedAt]) VALUES (N'01a14181-eb43-745e-afb4-7ae49324bd20', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a14141-6198-7d6d-8e1c-75a371a032a6', CAST(4800.00 AS Decimal(18, 2)), CAST(N'2026-10-16' AS Date), N'01a14141-619b-7dad-9225-e0370ed198bc', N'Elektrik faturası (2026-10)', N'01a14181-9a09-7825-9a9f-09c7a2cf7f27', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', NULL, NULL, NULL, CAST(N'2026-10-15T21:39:55.8821276' AS DateTime2))
GO
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'd9a4862a-9029-459c-b095-013ecd252cd4', N'push.send', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-17T16:21:50.4605456' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'dc664a8a-5664-4d49-8679-05ee3da859a1', N'push.send', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-16T21:32:19.9817016' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'295b3fa2-d270-40f0-bfaf-19f1470cc557', N'push.send', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-16T21:31:53.9262841' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'c2700667-225e-47e8-81dd-312c05080c85', N'bill.pay', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:39:55.8428555' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'996aa66a-dda8-4d42-98f5-351d8a35a065', N'push.send', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-16T21:33:29.1700499' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'868dba63-2422-41e2-bb56-36747b7fb33d', N'bill.create', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:39:35.0492554' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'ded90a65-c663-4261-88e5-4cd2e5fea4db', N'push.send', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-16T21:40:24.3574930' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'12e37d6c-4786-49d9-8b31-61b22e36d697', N'sms.send', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-19T12:44:31.2827101' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'578667ea-7c95-44f7-9023-8682a368ea98', N'push.send', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-19T12:45:01.3526527' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'9bb14797-d077-4734-9719-97c070961b97', N'push.send', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-16T21:46:46.2559347' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'1fdb0948-e6d9-4cbe-8abf-ac10e6f8f15d', N'sms.send', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-18T09:58:09.4488668' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'eeab36d7-a5c4-4a65-a703-b67855ec509c', N'payment.create', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-17T16:13:30.0443247' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'01da9fcb-8c5b-4d20-b2f5-c0bfb4425772', N'push.send', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-16T21:18:07.7297664' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'f0597020-4531-4213-a661-c264495a5b5a', N'charge.create', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:35:14.4324686' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'5e6a7030-c9b5-4510-96c2-c8c18bbbc7b4', N'push.send', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-16T21:17:52.7828232' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'900f22fb-03e2-4820-b73a-ca7c4bcffcd6', N'sms.send', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:45:23.7967257' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'8661404f-9b48-4395-a67b-d43c211f7aeb', N'payment.create', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:37:45.2713059' AS DateTime2))
INSERT [dbo].[IdempotencyKeys] ([Key], [Scope], [ActorId], [CreatedAt]) VALUES (N'cf4d46fd-953d-4ce6-9f41-d5f73a35e214', N'push.send', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-19T12:52:28.6783401' AS DateTime2))
GO
INSERT [dbo].[MaintenanceEvents] ([Id], [RequestId], [Status], [Note], [ActorType], [ActorName], [CreatedAt]) VALUES (N'01a14a9d-f0f4-7c7d-b572-0e0907746d6c', N'01a14a9d-a99a-7c90-b53c-e3ef1fd2c01e', N'InProgress', NULL, N'Admin', N'Yönetici', CAST(N'2026-10-17T16:07:07.2553789' AS DateTime2))
INSERT [dbo].[MaintenanceEvents] ([Id], [RequestId], [Status], [Note], [ActorType], [ActorName], [CreatedAt]) VALUES (N'01a14184-947c-7a15-ad04-1e54b8e4e955', N'01a14184-947c-7943-8208-b3464399b716', N'Received', NULL, N'Student', N'Feyza Demir', CAST(N'2026-10-15T21:42:50.2908891' AS DateTime2))
INSERT [dbo].[MaintenanceEvents] ([Id], [RequestId], [Status], [Note], [ActorType], [ActorName], [CreatedAt]) VALUES (N'01a15437-73dc-74c2-a868-3b318b923416', N'01a15437-73dc-724a-91ac-f8139347902c', N'Received', NULL, N'Student', N'Feyza Demir', CAST(N'2026-10-19T12:51:22.7358093' AS DateTime2))
INSERT [dbo].[MaintenanceEvents] ([Id], [RequestId], [Status], [Note], [ActorType], [ActorName], [CreatedAt]) VALUES (N'01a15437-a75e-7b84-b0dd-43f93df8e75b', N'01a15437-73dc-724a-91ac-f8139347902c', N'InProgress', NULL, N'Admin', N'Yönetici', CAST(N'2026-10-19T12:51:35.9068477' AS DateTime2))
INSERT [dbo].[MaintenanceEvents] ([Id], [RequestId], [Status], [Note], [ActorType], [ActorName], [CreatedAt]) VALUES (N'01a14185-a5f8-767e-9ce6-877da6e176e4', N'01a14184-947c-7943-8208-b3464399b716', N'InProgress', N'eleman gönderiyorum sıkıntı yok', N'Admin', N'Yönetici', CAST(N'2026-10-15T21:44:00.2523367' AS DateTime2))
INSERT [dbo].[MaintenanceEvents] ([Id], [RequestId], [Status], [Note], [ActorType], [ActorName], [CreatedAt]) VALUES (N'01a14a9d-a99b-78d9-b5c4-c22b43ac9e54', N'01a14a9d-a99a-7c90-b53c-e3ef1fd2c01e', N'Received', NULL, N'Student', N'Feyza Demir', CAST(N'2026-10-17T16:06:49.0158550' AS DateTime2))
INSERT [dbo].[MaintenanceEvents] ([Id], [RequestId], [Status], [Note], [ActorType], [ActorName], [CreatedAt]) VALUES (N'01a15437-c3a8-78f9-881f-c3b95f333945', N'01a15437-73dc-724a-91ac-f8139347902c', N'Done', NULL, N'Admin', N'Yönetici', CAST(N'2026-10-19T12:51:43.1454030' AS DateTime2))
INSERT [dbo].[MaintenanceEvents] ([Id], [RequestId], [Status], [Note], [ActorType], [ActorName], [CreatedAt]) VALUES (N'01a146be-47a0-7385-8186-c458978ae4dc', N'01a14184-947c-7943-8208-b3464399b716', N'Done', N'eleman gönderiyorum sıkıntı yok', N'Admin', N'Yönetici', CAST(N'2026-10-16T22:03:57.7337761' AS DateTime2))
INSERT [dbo].[MaintenanceEvents] ([Id], [RequestId], [Status], [Note], [ActorType], [ActorName], [CreatedAt]) VALUES (N'01a14a9e-2416-701d-9697-d40ef9ebd35f', N'01a14a9d-a99a-7c90-b53c-e3ef1fd2c01e', N'Done', NULL, N'Admin', N'Yönetici', CAST(N'2026-10-17T16:07:20.3432699' AS DateTime2))
GO
INSERT [dbo].[MaintenancePhotos] ([Id], [RequestId], [FilePath], [FileSize], [Width], [Height], [CreatedAt]) VALUES (N'01a14184-947c-78f9-84c0-f6a61bdfb171', N'01a14184-947c-7943-8208-b3464399b716', N'private/2026/10/01a14184937e7887a8cdb8f39dc0fb4e_lg.webp', 204242, 1600, 1068, CAST(N'2026-10-15T21:42:50.2908891' AS DateTime2))
GO
INSERT [dbo].[MaintenanceRequests] ([Id], [No], [PeriodId], [EnrollmentId], [StudentId], [RoomLabel], [Area], [Title], [Description], [Status], [AdminNote], [ClosedAt], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14184-947c-7943-8208-b3464399b716', N'TK-0001', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'01a1417b-a064-727a-a163-f45777b2e616', N'B Blok Kat 2 · Oda 1', N'Room', N'Yatak Başlığı Kırıldı', N'yatak başlığı kırıldı hocam benle alakası yok anlamadım nasıl oldu odaya bi geldim böyle', N'Done', N'eleman gönderiyorum sıkıntı yok', CAST(N'2026-10-16T22:03:57.7282989' AS DateTime2), CAST(N'2026-10-15T21:42:50.2908891' AS DateTime2), CAST(N'2026-10-16T22:03:57.7337761' AS DateTime2), NULL, 1, 0)
INSERT [dbo].[MaintenanceRequests] ([Id], [No], [PeriodId], [EnrollmentId], [StudentId], [RoomLabel], [Area], [Title], [Description], [Status], [AdminNote], [ClosedAt], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14a9d-a99a-7c90-b53c-e3ef1fd2c01e', N'TK-0002', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'01a1417b-a064-727a-a163-f45777b2e616', N'B Blok Kat 2 · Oda 1', N'Room', N'Gardırop kapağı çıktı', N'Kapak çıktı hamit abi', N'Done', NULL, CAST(N'2026-10-17T16:07:20.3429611' AS DateTime2), CAST(N'2026-10-17T16:06:49.0158550' AS DateTime2), CAST(N'2026-10-17T16:07:20.3432699' AS DateTime2), NULL, 1, 0)
INSERT [dbo].[MaintenanceRequests] ([Id], [No], [PeriodId], [EnrollmentId], [StudentId], [RoomLabel], [Area], [Title], [Description], [Status], [AdminNote], [ClosedAt], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a15437-73dc-724a-91ac-f8139347902c', N'TK-0003', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'01a1417b-a064-727a-a163-f45777b2e616', N'B Blok Kat 2 · Oda 1', N'Kitchen', N'Jsjfkdkd', N'Kflrlglkckfmfk', N'Done', NULL, CAST(N'2026-10-19T12:51:43.1444539' AS DateTime2), CAST(N'2026-10-19T12:51:22.7358093' AS DateTime2), CAST(N'2026-10-19T12:51:43.1454030' AS DateTime2), NULL, 1, 0)
GO
INSERT [dbo].[MediaAssets] ([Id], [Kind], [FileName], [FilePath], [MimeType], [FileSize], [Width], [Height], [DurationSeconds], [PosterPath], [AltText], [UploadedById], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14a36-588b-7a4c-bf98-1bef9641c785', N'Image', N'01a11c7d1b9b7d2f83c018ed47c94253.jpg', N'/uploads/2026/10/01a14a3657077300b4c5363bb9052478_lg.webp', N'image/webp', 257714, 7360, 4912, NULL, NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-17T14:13:58.0279983' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[MediaAssets] ([Id], [Kind], [FileName], [FilePath], [MimeType], [FileSize], [Width], [Height], [DurationSeconds], [PosterPath], [AltText], [UploadedById], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14167-c80a-7729-8a6d-21db77abb789', N'Image', N'images.jpeg', N'/uploads/2026/10/01a14167c7a37052b0a5d7c3595c7e25_lg.webp', N'image/webp', 84334, 638, 480, NULL, NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:11:22.9231666' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[MediaAssets] ([Id], [Kind], [FileName], [FilePath], [MimeType], [FileSize], [Width], [Height], [DurationSeconds], [PosterPath], [AltText], [UploadedById], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1416c-3841-7d72-bb9f-296f1246fd7b', N'Video', N'gemini_generated_video_d8f7e594 (online-video-cutter.com)-720p.mp4', N'/uploads/2026/10/01a1416c38397a088eab087625c3253a.mp4', N'video/mp4', 1976860, 1280, 720, 10, N'/uploads/2026/10/01a1416c37d67f7c9938b58dc41441cb_lg.webp', NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:16:13.7631785' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[MediaAssets] ([Id], [Kind], [FileName], [FilePath], [MimeType], [FileSize], [Width], [Height], [DurationSeconds], [PosterPath], [AltText], [UploadedById], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1416d-618a-7e54-8b34-2d232ca03778', N'Image', N'single2-830x550.jpg', N'/uploads/2026/10/01a1416d61147db5943b77a92bd93db3_lg.webp', N'image/webp', 65428, 830, 550, NULL, NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:17:29.8670430' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[MediaAssets] ([Id], [Kind], [FileName], [FilePath], [MimeType], [FileSize], [Width], [Height], [DurationSeconds], [PosterPath], [AltText], [UploadedById], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1416d-52c7-7033-9997-ab38d928ff87', N'Image', N'tom09544.jpg', N'/uploads/2026/10/01a1416d5173765bb691671c194798b6_lg.webp', N'image/webp', 221986, 1920, 1280, NULL, NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:17:26.0876410' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[MediaAssets] ([Id], [Kind], [FileName], [FilePath], [MimeType], [FileSize], [Width], [Height], [DurationSeconds], [PosterPath], [AltText], [UploadedById], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14a34-24f2-7a9c-b40e-acbe83384dac', N'Image', N'unnamed (1).jpg', N'/uploads/2026/10/01a14a34245a75baa8589fccb87fa28f_lg.webp', N'image/webp', 107012, 1024, 558, NULL, NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-17T14:11:33.7797162' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[MediaAssets] ([Id], [Kind], [FileName], [FilePath], [MimeType], [FileSize], [Width], [Height], [DurationSeconds], [PosterPath], [AltText], [UploadedById], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1416c-a836-7568-94d4-e813f1b95478', N'Image', N'images.jpeg', N'/uploads/2026/10/01a1416ca7e67e40b1b1650f320bd587_lg.webp', N'image/webp', 84334, 638, 480, NULL, NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', CAST(N'2026-10-15T21:16:42.4227246' AS DateTime2), NULL, NULL, 1, 0)
GO
INSERT [dbo].[MessageTemplates] ([Id], [Key], [Name], [BodyTr], [BodyEn], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-616a-7e50-8c1b-1731c7d4e256', N'maintenance_update', N'Arıza durumu', N'Merhaba {ad}, “{konu}” arıza kaydınızın durumu: {durum}.', N'Hello {ad}, the status of your maintenance request “{konu}” is: {durum}.', CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[MessageTemplates] ([Id], [Key], [Name], [BodyTr], [BodyEn], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-616a-7b39-a796-1a9d53e3844f', N'application_received', N'Başvuru alındı', N'Merhaba {ad}, başvurunuz bize ulaştı. İnceleyip size dönüş yapacağız.', N'Hello {ad}, we have received your application and will get back to you shortly.', CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[MessageTemplates] ([Id], [Key], [Name], [BodyTr], [BodyEn], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-6161-7d22-9a69-45b4d86de69d', N'payment_reminder', N'Ödeme hatırlatma', N'Merhaba {ad}, {oda} için {kalem} ({tutar}) {vade} tarihinde ödenmelidir. Ödemeyi yaptıktan sonra bize bilgi verirseniz seviniriz.', N'Hello {ad}, your {kalem} ({tutar}) for {oda} is due on {vade}. Please let us know once you have paid.', CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[MessageTemplates] ([Id], [Key], [Name], [BodyTr], [BodyEn], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-616a-7218-8bd5-a0303d6b2bf8', N'enrollment_approved', N'Kayıt onayı ve giriş bilgisi', N'Merhaba {ad}, kaydınız onaylandı. Öğrenci alanı giriş bilgileriniz: telefon {telefon}, şifre {sifre}.', N'Hello {ad}, your registration is confirmed. Your student area login: phone {telefon}, password {sifre}.', CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[MessageTemplates] ([Id], [Key], [Name], [BodyTr], [BodyEn], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-616a-72e5-b5ce-c07a93e81408', N'payment_overdue', N'Geciken ödeme', N'Merhaba {ad}, {kalem} ödemenizin vadesi {vade} tarihinde geçti. Kalan tutar: {tutar}. Ödeme yaptıysanız lütfen dekontu paylaşın.', N'Hello {ad}, your {kalem} payment was due on {vade}. Remaining amount: {tutar}. If you have already paid, please share the receipt.', CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 0)
GO
INSERT [dbo].[NotificationBatches] ([Id], [Purpose], [Url], [TitleTr], [TitleEn], [BodyTr], [BodyEn], [RecipientCount], [SkippedCount], [DeliveredCount], [FailedCount], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a146ae-8bcd-7b37-b69a-03a3d406d7cc', N'announcement', N'/ogrenci', N'test bildirimi', NULL, N'merhaba {ad}', NULL, 1, 0, 1, 0, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-16T21:46:46.6061437' AS DateTime2))
INSERT [dbo].[NotificationBatches] ([Id], [Purpose], [Url], [TitleTr], [TitleEn], [BodyTr], [BodyEn], [RecipientCount], [SkippedCount], [DeliveredCount], [FailedCount], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a14aab-6d9d-7a81-926c-36609c8eb902', N'announcement', N'/ogrenci', N'Yarın Temizlikçi Gelecek', NULL, N'Merhaba {ad}, yarın öğle vakitlerinde temizlkçi gelecek, haberin olsun.', NULL, 1, 0, 1, 0, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-17T16:21:51.2173527' AS DateTime2))
INSERT [dbo].[NotificationBatches] ([Id], [Purpose], [Url], [TitleTr], [TitleEn], [BodyTr], [BodyEn], [RecipientCount], [SkippedCount], [DeliveredCount], [FailedCount], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a14694-1bf0-7056-ae51-44fc019f4de1', N'announcement', N'/ogrenci', N'Yurt Ödemeleri Hakkında', N'Yurt Ödemeleri Hakkında', N'{ad}, ücretlere zam geldi, bizimle iletişime geçebilirsin.', N'{ad}, ücretlere zam geldi, bizimle iletişime geçebilirsin.', 1, 0, 0, 1, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-16T21:17:54.0683561' AS DateTime2))
INSERT [dbo].[NotificationBatches] ([Id], [Purpose], [Url], [TitleTr], [TitleEn], [BodyTr], [BodyEn], [RecipientCount], [SkippedCount], [DeliveredCount], [FailedCount], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a146a1-5329-7263-b40c-54fc5a754f11', N'announcement', N'/ogrenci', N'Test Bildirimi', NULL, N'Test bildirimi açıklaması 123', NULL, 1, 0, 1, 0, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-16T21:32:20.1381395' AS DateTime2))
INSERT [dbo].[NotificationBatches] ([Id], [Purpose], [Url], [TitleTr], [TitleEn], [BodyTr], [BodyEn], [RecipientCount], [SkippedCount], [DeliveredCount], [FailedCount], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a15438-78ac-7a05-aec2-58f813cd3ec1', N'announcement', N'/ogrenci', N'test', NULL, N'merhaba {ad}', NULL, 1, 0, 1, 0, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-19T12:52:29.4851062' AS DateTime2))
INSERT [dbo].[NotificationBatches] ([Id], [Purpose], [Url], [TitleTr], [TitleEn], [BodyTr], [BodyEn], [RecipientCount], [SkippedCount], [DeliveredCount], [FailedCount], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a146a0-f086-78fd-a722-673c6350c05b', N'announcement', N'/ogrenci', N'Test Bildirimi', NULL, N'Test bildirimi açıklaması 123', NULL, 1, 0, 1, 0, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-16T21:31:54.9504061' AS DateTime2))
INSERT [dbo].[NotificationBatches] ([Id], [Purpose], [Url], [TitleTr], [TitleEn], [BodyTr], [BodyEn], [RecipientCount], [SkippedCount], [DeliveredCount], [FailedCount], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a146a8-b9f2-7de0-94f9-6e5ed1c14305', N'announcement', N'/ogrenci', N'Test Bildirimi', NULL, N'Test açıklaması, merhaba {ad}', NULL, 1, 0, 1, 0, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-16T21:40:25.2847567' AS DateTime2))
INSERT [dbo].[NotificationBatches] ([Id], [Purpose], [Url], [TitleTr], [TitleEn], [BodyTr], [BodyEn], [RecipientCount], [SkippedCount], [DeliveredCount], [FailedCount], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a15431-a611-7ab5-97ab-c186f9b4eb6c', N'announcement', N'/ogrenci', N'dtrgtg', NULL, N'tdgthrth', NULL, 1, 0, 1, 0, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-19T12:45:02.4332672' AS DateTime2))
INSERT [dbo].[NotificationBatches] ([Id], [Purpose], [Url], [TitleTr], [TitleEn], [BodyTr], [BodyEn], [RecipientCount], [SkippedCount], [DeliveredCount], [FailedCount], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a14694-51f3-7341-b8e0-f2f9d6a0ffd3', N'announcement', N'/ogrenci', N'Yurt Ödemeleri Hakkında', N'Yurt Ödemeleri Hakkında', N'{ad}, ücretlere zam geldi, bizimle iletişime geçebilirsin.', N'{ad}, ücretlere zam geldi, bizimle iletişime geçebilirsin.', 1, 0, 0, 1, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-16T21:18:07.8594301' AS DateTime2))
INSERT [dbo].[NotificationBatches] ([Id], [Purpose], [Url], [TitleTr], [TitleEn], [BodyTr], [BodyEn], [RecipientCount], [SkippedCount], [DeliveredCount], [FailedCount], [CreatedById], [CreatedByName], [CreatedAt]) VALUES (N'01a146a2-620a-7e52-ba03-f9ca9cd48f47', N'announcement', N'/ogrenci', N'Test Bildirimi', NULL, N'Test bildirimi açıklaması 123 {ad}', NULL, 1, 0, 1, 0, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-16T21:33:29.4824898' AS DateTime2))
GO
INSERT [dbo].[NotificationDeliveries] ([Id], [BatchId], [StudentId], [EnrollmentId], [RecipientName], [Lang], [Title], [Body], [Devices], [Succeeded], [Failed], [CreatedAt]) VALUES (N'01a146a8-ba07-7551-aa86-3572ee218d5a', N'01a146a8-b9f2-7de0-94f9-6e5ed1c14305', N'01a1417b-a064-727a-a163-f45777b2e616', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Feyza Demir', N'tr', N'Test Bildirimi', N'Test açıklaması, merhaba Feyza', 2, 1, 1, CAST(N'2026-10-16T21:40:25.2847567' AS DateTime2))
INSERT [dbo].[NotificationDeliveries] ([Id], [BatchId], [StudentId], [EnrollmentId], [RecipientName], [Lang], [Title], [Body], [Devices], [Succeeded], [Failed], [CreatedAt]) VALUES (N'01a14aab-6db2-765f-8896-35afa9dd5afd', N'01a14aab-6d9d-7a81-926c-36609c8eb902', N'01a1417b-a064-727a-a163-f45777b2e616', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Feyza Demir', N'tr', N'Yarın Temizlikçi Gelecek', N'Merhaba Feyza, yarın öğle vakitlerinde temizlkçi gelecek, haberin olsun.', 2, 1, 1, CAST(N'2026-10-17T16:21:51.2173527' AS DateTime2))
INSERT [dbo].[NotificationDeliveries] ([Id], [BatchId], [StudentId], [EnrollmentId], [RecipientName], [Lang], [Title], [Body], [Devices], [Succeeded], [Failed], [CreatedAt]) VALUES (N'01a15431-a63d-7044-80b5-3d08c49df5cd', N'01a15431-a611-7ab5-97ab-c186f9b4eb6c', N'01a1417b-a064-727a-a163-f45777b2e616', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Feyza Demir', N'tr', N'dtrgtg', N'tdgthrth', 1, 1, 0, CAST(N'2026-10-19T12:45:02.4332672' AS DateTime2))
INSERT [dbo].[NotificationDeliveries] ([Id], [BatchId], [StudentId], [EnrollmentId], [RecipientName], [Lang], [Title], [Body], [Devices], [Succeeded], [Failed], [CreatedAt]) VALUES (N'01a146ae-8bcd-7714-92f5-4b6001cd365b', N'01a146ae-8bcd-7b37-b69a-03a3d406d7cc', N'01a1417b-a064-727a-a163-f45777b2e616', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Feyza Demir', N'tr', N'test bildirimi', N'merhaba Feyza', 1, 1, 0, CAST(N'2026-10-16T21:46:46.6061437' AS DateTime2))
INSERT [dbo].[NotificationDeliveries] ([Id], [BatchId], [StudentId], [EnrollmentId], [RecipientName], [Lang], [Title], [Body], [Devices], [Succeeded], [Failed], [CreatedAt]) VALUES (N'01a14694-1c02-7970-9b71-559ce8d1b617', N'01a14694-1bf0-7056-ae51-44fc019f4de1', N'01a1417b-a064-727a-a163-f45777b2e616', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Feyza Demir', N'tr', N'Yurt Ödemeleri Hakkında', N'Feyza, ücretlere zam geldi, bizimle iletişime geçebilirsin.', 1, 0, 1, CAST(N'2026-10-16T21:17:54.0683561' AS DateTime2))
INSERT [dbo].[NotificationDeliveries] ([Id], [BatchId], [StudentId], [EnrollmentId], [RecipientName], [Lang], [Title], [Body], [Devices], [Succeeded], [Failed], [CreatedAt]) VALUES (N'01a15438-78ac-7bb3-90a2-71f063c7c349', N'01a15438-78ac-7a05-aec2-58f813cd3ec1', N'01a1417b-a064-727a-a163-f45777b2e616', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Feyza Demir', N'tr', N'test', N'merhaba Feyza', 2, 1, 1, CAST(N'2026-10-19T12:52:29.4851062' AS DateTime2))
INSERT [dbo].[NotificationDeliveries] ([Id], [BatchId], [StudentId], [EnrollmentId], [RecipientName], [Lang], [Title], [Body], [Devices], [Succeeded], [Failed], [CreatedAt]) VALUES (N'01a146a2-620a-78dc-a7d4-803ee0eec1f5', N'01a146a2-620a-7e52-ba03-f9ca9cd48f47', N'01a1417b-a064-727a-a163-f45777b2e616', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Feyza Demir', N'tr', N'Test Bildirimi', N'Test bildirimi açıklaması 123 Feyza', 1, 1, 0, CAST(N'2026-10-16T21:33:29.4824898' AS DateTime2))
INSERT [dbo].[NotificationDeliveries] ([Id], [BatchId], [StudentId], [EnrollmentId], [RecipientName], [Lang], [Title], [Body], [Devices], [Succeeded], [Failed], [CreatedAt]) VALUES (N'01a146a1-5329-77c5-a059-a0a95a90f8bb', N'01a146a1-5329-7263-b40c-54fc5a754f11', N'01a1417b-a064-727a-a163-f45777b2e616', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Feyza Demir', N'tr', N'Test Bildirimi', N'Test bildirimi açıklaması 123', 1, 1, 0, CAST(N'2026-10-16T21:32:20.1381395' AS DateTime2))
INSERT [dbo].[NotificationDeliveries] ([Id], [BatchId], [StudentId], [EnrollmentId], [RecipientName], [Lang], [Title], [Body], [Devices], [Succeeded], [Failed], [CreatedAt]) VALUES (N'01a14694-51f3-741a-819f-c76693ce4c0f', N'01a14694-51f3-7341-b8e0-f2f9d6a0ffd3', N'01a1417b-a064-727a-a163-f45777b2e616', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Feyza Demir', N'tr', N'Yurt Ödemeleri Hakkında', N'Feyza, ücretlere zam geldi, bizimle iletişime geçebilirsin.', 1, 0, 1, CAST(N'2026-10-16T21:18:07.8594301' AS DateTime2))
INSERT [dbo].[NotificationDeliveries] ([Id], [BatchId], [StudentId], [EnrollmentId], [RecipientName], [Lang], [Title], [Body], [Devices], [Succeeded], [Failed], [CreatedAt]) VALUES (N'01a146a0-f09b-7e5b-a61d-fd1dae698020', N'01a146a0-f086-78fd-a722-673c6350c05b', N'01a1417b-a064-727a-a163-f45777b2e616', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Feyza Demir', N'tr', N'Test Bildirimi', N'Test bildirimi açıklaması 123', 2, 1, 1, CAST(N'2026-10-16T21:31:54.9504061' AS DateTime2))
GO
INSERT [dbo].[NumberCounters] ([Key], [Value], [Version]) VALUES (N'application-2026', 1, N'380cfdb2-5575-4e32-8976-03d59e782b62')
INSERT [dbo].[NumberCounters] ([Key], [Value], [Version]) VALUES (N'maintenance', 3, N'ece16817-e4a2-463e-9f9e-b3742fce503f')
GO
INSERT [dbo].[PaymentAllocations] ([Id], [PeriodId], [EnrollmentId], [PaymentId], [ChargeId], [Amount], [IsAuto], [IsReversal], [CreatedAt]) VALUES (N'01a1417f-ed5d-7c88-b2a8-41553490d569', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'01a1417f-ed38-765a-9560-e468e459c0c4', N'01a1417b-a13b-7f3f-8bc9-2f9796dca568', CAST(12500.00 AS Decimal(18, 2)), 1, 0, CAST(N'2026-10-15T21:37:45.3593612' AS DateTime2))
INSERT [dbo].[PaymentAllocations] ([Id], [PeriodId], [EnrollmentId], [PaymentId], [ChargeId], [Amount], [IsAuto], [IsReversal], [CreatedAt]) VALUES (N'01a14aa3-c84b-73cc-8b27-81fdaec9eb28', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'01a14aa3-c846-771b-bdb1-b61eeae15052', N'01a1417b-a158-7226-8572-641d0c05bd71', CAST(1120.00 AS Decimal(18, 2)), 1, 0, CAST(N'2026-10-17T16:13:30.0963390' AS DateTime2))
INSERT [dbo].[PaymentAllocations] ([Id], [PeriodId], [EnrollmentId], [PaymentId], [ChargeId], [Amount], [IsAuto], [IsReversal], [CreatedAt]) VALUES (N'01a1417f-ed6d-7d39-95ca-ab422e5bc850', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'01a1417f-ed38-765a-9560-e468e459c0c4', N'01a1417b-a158-7226-8572-641d0c05bd71', CAST(11380.00 AS Decimal(18, 2)), 1, 0, CAST(N'2026-10-15T21:37:45.3593612' AS DateTime2))
INSERT [dbo].[PaymentAllocations] ([Id], [PeriodId], [EnrollmentId], [PaymentId], [ChargeId], [Amount], [IsAuto], [IsReversal], [CreatedAt]) VALUES (N'01a14aa3-c84e-7425-8e9f-b0a5002bb084', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'01a14aa3-c846-771b-bdb1-b61eeae15052', N'01a1417b-a158-7485-bcac-8e40de1feaee', CAST(10880.00 AS Decimal(18, 2)), 1, 0, CAST(N'2026-10-17T16:13:30.0963390' AS DateTime2))
GO
INSERT [dbo].[Payments] ([Id], [PeriodId], [EnrollmentId], [Kind], [Amount], [Date], [Method], [AccountId], [Note], [CreatedById], [CancelledAt], [CancelReason], [CancelledById], [CreatedAt]) VALUES (N'01a14aa3-c846-771b-bdb1-b61eeae15052', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Collection', CAST(12000.00 AS Decimal(18, 2)), CAST(N'2026-10-17' AS Date), N'Cash', N'01a14141-619b-7dad-9225-e0370ed198bc', NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', NULL, NULL, NULL, CAST(N'2026-10-17T16:13:30.0963390' AS DateTime2))
INSERT [dbo].[Payments] ([Id], [PeriodId], [EnrollmentId], [Kind], [Amount], [Date], [Method], [AccountId], [Note], [CreatedById], [CancelledAt], [CancelReason], [CancelledById], [CreatedAt]) VALUES (N'01a1417f-ed38-765a-9560-e468e459c0c4', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'Collection', CAST(23880.00 AS Decimal(18, 2)), CAST(N'2026-10-16' AS Date), N'Cash', N'01a14141-619b-7dad-9225-e0370ed198bc', NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', NULL, NULL, NULL, CAST(N'2026-10-15T21:37:45.3593612' AS DateTime2))
GO
INSERT [dbo].[Periods] ([Id], [Name], [Type], [StartDate], [EndDate], [Status], [ApplicationsOpen], [ClosedAt], [HalfTermEnabled], [HalfTermFirstEnd], [HalfTermSecondStart], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'2026–2027 Akademik', N'Academic', CAST(N'2026-09-01' AS Date), CAST(N'2027-06-30' AS Date), N'Active', 1, NULL, 0, NULL, NULL, CAST(N'2026-10-15T21:08:52.9938528' AS DateTime2), NULL, NULL, 1, 0)
GO
INSERT [dbo].[Placements] ([Id], [PeriodId], [EnrollmentId], [RoomId], [StartDate], [EndDate], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1417c-d37e-7ebc-ab91-83749947275f', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', N'01a1416a-fc12-737a-9b12-e1de047be841', CAST(N'2026-10-16' AS Date), CAST(N'2027-06-30' AS Date), CAST(N'2026-10-15T21:34:22.1017975' AS DateTime2), NULL, NULL, 1, 0)
GO
INSERT [dbo].[PushSubscriptions] ([Id], [OwnerType], [OwnerId], [Endpoint], [EndpointHash], [P256dh], [Auth], [Lang], [UserAgent], [CreatedAt], [LastSuccessAt], [FailureCount]) VALUES (N'01a15437-092d-7ecc-b8b9-36ad1186eb0f', N'Student', N'01a1417b-a064-727a-a163-f45777b2e616', N'https://fcm.googleapis.com/fcm/send/c4iPFfQOHdM:APA91bE4BbpO9fb9GHA0CQr07sB5t96uPvMSsAfaw9aO9LNQL1O7pNBEaLB1x96vfMsIMztjsRy_I4FphNErqC0ax9KYs2iOUym0L4J81mFSEwRT1qh1WczFkkFoyCZFsHtHyGeGDZtO', N'1A574B273223347A6FCA9CA892975FED535BDF467BC7314C34DEEE5B47E546BE', N'BAFHJ6EH5eolGJ3q87zGkjvbI8YqCW-RixLXSpxV9spGwUATLCr1MXxBNXjdENCjQndrjDmBoI3j1Fzs0MGlZV0', N'o6kKLgYeEnh8eb6_yK1vyw', N'tr', N'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36', CAST(N'2026-10-19T12:50:55.4057594' AS DateTime2), CAST(N'2026-10-19T12:52:29.4784932' AS DateTime2), 0)
GO
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a1542d-7a94-7187-a5df-0dd275e78a8c', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'96CBC5EF3124363CA690A3508F8EE2A5C3DE52DCC05D287FE47B27649BD539C8', 1, 1209600, CAST(N'2026-10-19T12:40:29.0767585' AS DateTime2), CAST(N'2026-11-02T12:40:29.0767585' AS DateTime2), NULL)
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a14bf2-fac4-7e24-95e5-2aaf90f3712e', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'28817D66723039A643BB71F728AEB39ADDBFDFE250465902E13104C90209C30D', 1, 1209600, CAST(N'2026-10-17T22:19:37.5408001' AS DateTime2), CAST(N'2026-10-31T22:19:37.5408001' AS DateTime2), CAST(N'2026-10-18T09:53:17.1851986' AS DateTime2))
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a14aaa-0a95-7f70-bee7-3922693d7bd6', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'FCE7FC3577DE040CBB7FB9FAD3534F7EBCCB65010B0518C2036DBED5B427D5E9', 1, 1209600, CAST(N'2026-10-17T16:20:20.2451281' AS DateTime2), CAST(N'2026-10-31T16:20:20.2451281' AS DateTime2), CAST(N'2026-10-17T22:19:37.5100925' AS DateTime2))
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a15436-7724-73a1-9460-3fc443357f27', N'student', N'01a1417b-a064-727a-a163-f45777b2e616', N'b9b9fb8b-f7d4-4e5b-8bd0-9bab67561242', N'01a15436-7724-71e7-aac4-f010c304a955', N'5FAF4079CA273C9342B03A6BF4016E044748EA252D1FA16265FCB0966CA1EC7E', 1, 15552000, CAST(N'2026-10-19T12:50:18.0201270' AS DateTime2), CAST(N'2027-04-17T12:50:18.0201270' AS DateTime2), NULL)
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a14e6e-0b8d-7eb8-a60f-424b1b2e7ef2', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'1F02EECB5194E116D6848BCCB561717F138A5F9C4DD6EAE560BC7A2AE0D6F615', 1, 1209600, CAST(N'2026-10-18T09:53:17.1972162' AS DateTime2), CAST(N'2026-11-01T09:53:17.1972162' AS DateTime2), CAST(N'2026-10-19T10:26:26.0886771' AS DateTime2))
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a153c0-2c8b-78aa-9913-4afe15648f8d', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'EF57961A19BDF1A073C08B7F0026F95604C2F61A1D11906B3CB1FAF05552B512', 1, 1209600, CAST(N'2026-10-19T10:41:05.6755320' AS DateTime2), CAST(N'2026-11-02T10:41:05.6755320' AS DateTime2), CAST(N'2026-10-19T12:40:29.0582805' AS DateTime2))
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a14bf2-fac4-7ec9-906e-5298c4195f3e', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'952FA1E8B4ED14FA7A7798FF4E4B669AD9F5B384A6A9310A0F8A26A37D14E707', 1, 1209600, CAST(N'2026-10-17T22:19:37.5406231' AS DateTime2), CAST(N'2026-10-31T22:19:37.5406231' AS DateTime2), NULL)
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a14a7a-9a02-70d2-8cf6-6809171fc1c4', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'2F746D2A337182FDAB916E976FB24AF7E10224727D8EC474A1A278B53165D70E', 1, 1209600, CAST(N'2026-10-17T15:28:31.2342676' AS DateTime2), CAST(N'2026-10-31T15:28:31.2342676' AS DateTime2), CAST(N'2026-10-17T16:01:06.9048802' AS DateTime2))
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a14a98-71c3-76c2-8053-695013a7bc52', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'F4AFCD067D96E55FBB82C6DA8615FF6601FB5B0E19B9FFC3AFC44D564D5E5BBC', 1, 1209600, CAST(N'2026-10-17T16:01:07.0113142' AS DateTime2), CAST(N'2026-10-31T16:01:07.0113142' AS DateTime2), CAST(N'2026-10-17T16:20:20.1555945' AS DateTime2))
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a153b2-c130-7d50-81c8-6bc875ab746d', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'5120E1CC818E95069146A4181CCE9707E62FF11FBED4115B124D75E8718C64C9', 1, 1209600, CAST(N'2026-10-19T10:26:26.2241281' AS DateTime2), CAST(N'2026-11-02T10:26:26.2241281' AS DateTime2), NULL)
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a153b2-c130-728f-a7aa-82ebfee49843', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'3D45E599DD4ADBFCD72A0C3BFBBAA34953AEF87BDCBE48575D9B375DF190998C', 1, 1209600, CAST(N'2026-10-19T10:26:26.2241948' AS DateTime2), CAST(N'2026-11-02T10:26:26.2241948' AS DateTime2), NULL)
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a14a9c-a398-7c65-a2fb-86cc2a647176', N'student', N'01a1417b-a064-727a-a163-f45777b2e616', N'6575e314-b137-4fe8-8c88-baf8e662d856', N'01a14a9c-a398-7579-a61a-ce787afc063e', N'041F5BB7F5CF98741452B9F77EBD4DAB898FD65932A3277FA0ED8A1F2B8B798D', 1, 15552000, CAST(N'2026-10-17T16:05:41.9126893' AS DateTime2), CAST(N'2027-04-15T16:05:41.9126893' AS DateTime2), CAST(N'2026-10-17T16:20:25.4668775' AS DateTime2))
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a153b2-c130-74d4-a9b0-9ca5bc9aba6d', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'00E2CFDE2E5A5459A7B72D1662A9557456CF1A2A47D25AEFF9DED4CBF5C8893C', 1, 1209600, CAST(N'2026-10-19T10:26:26.2241281' AS DateTime2), CAST(N'2026-11-02T10:26:26.2241281' AS DateTime2), NULL)
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a14e6e-0b8d-74de-b2ae-9f4f3c85001a', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'8DD06601F79F026B86EEB9AC2FF5619B35C8BD8459A1A5B142C0368256D8FBC6', 1, 1209600, CAST(N'2026-10-18T09:53:17.1972227' AS DateTime2), CAST(N'2026-11-01T09:53:17.1972227' AS DateTime2), NULL)
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a153b2-c130-7fca-9e20-b1018470ad52', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'1CB34C5BEC733B39B8A65C20921BECDD3F2B11C84ED5DC0D010C676EED133554', 1, 1209600, CAST(N'2026-10-19T10:26:26.2241282' AS DateTime2), CAST(N'2026-11-02T10:26:26.2241282' AS DateTime2), NULL)
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a14aaa-1f33-7263-bf24-ca55a622a3dc', N'student', N'01a1417b-a064-727a-a163-f45777b2e616', N'6575e314-b137-4fe8-8c88-baf8e662d856', N'01a14a9c-a398-7579-a61a-ce787afc063e', N'EEABCD41E279CDEF376FB45635F45C493487D2A881B5B8E9C1C12672D11AB4E7', 1, 15552000, CAST(N'2026-10-17T16:20:25.5236279' AS DateTime2), CAST(N'2027-04-15T16:20:25.5236279' AS DateTime2), NULL)
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a14a5a-e12f-7e91-8ba6-e177116f22f7', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'392D8E16A7809B4E585F2164D529F4D749F77FD0067C2D18DC3BC45282CC1CC4', 1, 1209600, CAST(N'2026-10-17T14:53:52.3031523' AS DateTime2), CAST(N'2026-10-31T14:53:52.3031523' AS DateTime2), CAST(N'2026-10-17T15:28:31.2018871' AS DateTime2))
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a14a32-c8b0-7e29-8541-f5fa4ed8786c', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'D9D12F4D92D218CB86645ED1B6D2FAEEE30F79485D3E356B632597A867E71EF3', 1, 1209600, CAST(N'2026-10-17T14:10:04.5919558' AS DateTime2), CAST(N'2026-10-31T14:10:04.5919558' AS DateTime2), CAST(N'2026-10-17T14:53:52.0844109' AS DateTime2))
INSERT [dbo].[RefreshTokens] ([Id], [Role], [UserId], [Stamp], [FamilyId], [TokenHash], [Persistent], [LifetimeSeconds], [CreatedAt], [ExpiresAt], [RevokedAt]) VALUES (N'01a153b2-c130-7bf2-93a6-f8a9047cf84a', N'admin', N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'a08aea80-b985-44d2-b501-a7ddd67b77b9', N'01a14a32-c8b0-792f-af6d-973a3905524d', N'093F225AC3398ED1C45829A2E88F14798F129EC768A46C2E715DB7EC87E7F354', 1, 1209600, CAST(N'2026-10-19T10:26:26.2241970' AS DateTime2), CAST(N'2026-11-02T10:26:26.2241970' AS DateTime2), CAST(N'2026-10-19T10:41:05.6686847' AS DateTime2))
GO
INSERT [dbo].[Rooms] ([Id], [ApartmentId], [RoomTypeId], [Name], [Beds], [Status], [Features], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14a35-39f1-7b43-922e-27a6bdf0e808', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', N'01a14a34-3885-7555-ae34-d4911058e231', N'Çift Kişilik Oda', 2, N'Active', N'[{"icon":"check_circle","text":{"tr":"2 ki\u015Filik","en":null}},{"icon":"check_circle","text":{"tr":"\u00D6zel Gard\u0131rop","en":null}},{"icon":"check_circle","text":{"tr":"\u00D6zel \u00C7al\u0131\u015Fma Masas\u0131","en":null}}]', CAST(N'2026-10-17T14:12:44.6972364' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[Rooms] ([Id], [ApartmentId], [RoomTypeId], [Name], [Beds], [Status], [Features], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1416b-9a4e-73d9-bea9-6f7a70fd83f7', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', N'01a14167-d9f9-7dad-8af2-e4e9f63f3320', N'Oda 3', 1, N'Active', N'[{"icon":"check_circle","text":{"tr":"\u00C7al\u0131\u015Fma Masas\u0131","en":null}},{"icon":"check_circle","text":{"tr":"Gard\u0131rop","en":null}}]', CAST(N'2026-10-15T21:15:33.3268924' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[Rooms] ([Id], [ApartmentId], [RoomTypeId], [Name], [Beds], [Status], [Features], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1416b-5ebd-7a01-837a-cbf0adffc518', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', N'01a14167-d9f9-7dad-8af2-e4e9f63f3320', N'Oda 2', 1, N'Active', N'[{"icon":"check_circle","text":{"tr":"\u00C7al\u0131\u015Fma Masas\u0131","en":null}},{"icon":"check_circle","text":{"tr":"Gard\u0131rop","en":null}}]', CAST(N'2026-10-15T21:15:18.0781129' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[Rooms] ([Id], [ApartmentId], [RoomTypeId], [Name], [Beds], [Status], [Features], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1416a-fc12-737a-9b12-e1de047be841', N'01a1416a-2bb3-73ef-9160-99c7dd4cd579', N'01a14167-d9f9-7dad-8af2-e4e9f63f3320', N'Oda 1', 1, N'Active', N'[{"icon":"check_circle","text":{"tr":"\u00C7al\u0131\u015Fma Masas\u0131","en":null}},{"icon":"check_circle","text":{"tr":"Geni\u015F Yatak","en":null}},{"icon":"check_circle","text":{"tr":"Gard\u0131rop","en":null}}]', CAST(N'2026-10-15T21:14:52.8586067' AS DateTime2), NULL, NULL, 1, 0)
GO
INSERT [dbo].[RoomTypePrices] ([Id], [PeriodId], [RoomTypeId], [Monthly], [Deposit], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14a39-b7ee-70e2-a18c-776e5c1ab37f', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a14a34-3885-7555-ae34-d4911058e231', CAST(10000.00 AS Decimal(18, 2)), CAST(10000.00 AS Decimal(18, 2)), CAST(N'2026-10-17T14:17:39.0719720' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[RoomTypePrices] ([Id], [PeriodId], [RoomTypeId], [Monthly], [Deposit], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14168-6f1e-77df-b1db-95eef7566482', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a14167-d9f9-7dad-8af2-e4e9f63f3320', CAST(12500.00 AS Decimal(18, 2)), CAST(12500.00 AS Decimal(18, 2)), CAST(N'2026-10-15T21:12:05.6875825' AS DateTime2), NULL, NULL, 1, 0)
GO
INSERT [dbo].[RoomTypes] ([Id], [Slug], [Name], [Description], [CoverMediaId], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14a34-3885-7555-ae34-d4911058e231', N'2-kisilik-oda', N'{"tr":"2 Ki\u015Filik Oda","en":null}', NULL, N'01a14a34-24f2-7a9c-b40e-acbe83384dac', CAST(N'2026-10-17T14:11:38.8395023' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[RoomTypes] ([Id], [Slug], [Name], [Description], [CoverMediaId], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14167-d9f9-7dad-8af2-e4e9f63f3320', N'tek-kisilik-oda', N'{"tr":"Tek Ki\u015Filik Oda","en":null}', N'{"tr":"Tek ba\u015F\u0131n\u0131za kalabilece\u011Finiz size \u00F6zel oda.","en":null}', N'01a14167-c80a-7729-8a6d-21db77abb789', CAST(N'2026-10-15T21:11:27.5319403' AS DateTime2), NULL, NULL, 1, 0)
GO
INSERT [dbo].[SiteSettings] ([Id], [Phone], [Whatsapp], [Email], [Address], [MapUrl], [Instagram], [Iban], [IbanHolder], [HeroVideoMediaId], [MapMediaId], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'6d3f1b2a-9c4e-4f7a-8b51-2e0c7d9a4f13', N'5058699193', N'5058699193', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), CAST(N'2026-10-16T21:43:13.1590670' AS DateTime2), NULL, 1, 0)
GO
INSERT [dbo].[Slides] ([Id], [MediaId], [Title], [Subtitle], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14e76-fbe2-7deb-a172-1554d952cb95', N'01a14a36-588b-7a4c-bf98-1bef9641c785', N'{"tr":"Ayder Yaylas\u0131 \u0026 F\u0131rt\u0131na Vadisi","en":null}', N'{"tr":"rafasr gasrg asrg asrg srgasrgasr a","en":null}', CAST(N'2026-10-18T10:03:03.0108710' AS DateTime2), NULL, NULL, 1, 2)
INSERT [dbo].[Slides] ([Id], [MediaId], [Title], [Subtitle], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14188-959f-70c4-9acd-499a303bbdf5', N'01a1416d-618a-7e54-8b34-2d232ca03778', N'{"tr":"Size \u00D6zel Deneyimler!","en":null}', N'{"tr":"\u015Eahsi odalar\u0131n\u0131zda \u00FCniversite deneyiminizi ar\u015Fa \u00E7\u0131kar\u0131n.","en":null}', CAST(N'2026-10-15T21:47:12.6927755' AS DateTime2), CAST(N'2026-10-15T21:56:15.9084203' AS DateTime2), NULL, 1, 1)
INSERT [dbo].[Slides] ([Id], [MediaId], [Title], [Subtitle], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14190-7c90-704c-bf3f-4c0f3107d877', N'01a1416d-52c7-7033-9997-ab38d928ff87', N'{"tr":"Premium Odalar","en":null}', N'{"tr":"L\u00FCks odalarda kal\u0131n, \u00FCniversite hayat\u0131n\u0131z\u0131 g\u00FCzel ge\u00E7irin.","en":null}', CAST(N'2026-10-15T21:55:50.5444625' AS DateTime2), CAST(N'2026-10-15T21:56:15.9084203' AS DateTime2), NULL, 1, 0)
INSERT [dbo].[Slides] ([Id], [MediaId], [Title], [Subtitle], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14e75-4ec3-7a3a-bb09-fd37cee5464a', N'01a14a36-588b-7a4c-bf98-1bef9641c785', N'{"tr":"E\u015Fsiz bir deneyim!","en":null}', N'{"tr":"rafasr gasrg asrg asrg srgasrgasr a","en":null}', CAST(N'2026-10-18T10:01:13.1821815' AS DateTime2), CAST(N'2026-10-18T10:01:51.3304962' AS DateTime2), CAST(N'2026-10-18T10:02:47.7268058' AS DateTime2), 0, 2)
GO
INSERT [dbo].[SmsBatches] ([Id], [Purpose], [Text], [RecipientCount], [SkippedCount], [TotalParts], [Status], [ProviderCampaignId], [ProviderError], [CreatedById], [CreatedByName], [CompletedAt], [CreatedAt]) VALUES (N'01a15431-2cc7-7c06-bb5e-a31c15139ab9', N'application_received', N'sdfsdfsfsf {ad}', 1, 0, 1, N'Simulated', NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-19T12:44:31.5375684' AS DateTime2), CAST(N'2026-10-19T12:44:31.4333782' AS DateTime2))
INSERT [dbo].[SmsBatches] ([Id], [Purpose], [Text], [RecipientCount], [SkippedCount], [TotalParts], [Status], [ProviderCampaignId], [ProviderError], [CreatedById], [CreatedByName], [CompletedAt], [CreatedAt]) VALUES (N'01a14e72-812c-718b-bbad-de100c574a5b', N'payment_overdue', N'sefsfsefsef {ad}, {tutar}', 1, 0, 1, N'Simulated', NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-18T09:58:09.5384180' AS DateTime2), CAST(N'2026-10-18T09:58:09.5063949' AS DateTime2))
INSERT [dbo].[SmsBatches] ([Id], [Purpose], [Text], [RecipientCount], [SkippedCount], [TotalParts], [Status], [ProviderCampaignId], [ProviderError], [CreatedById], [CreatedByName], [CompletedAt], [CreatedAt]) VALUES (N'01a14186-ec55-74e6-afa4-ee56fe2cbf16', N'announcement', N'sayın {ad}, yarın temizlikçi gelemeyecekmiş, bilginize.', 1, 0, 1, N'Simulated', NULL, NULL, N'01a14096-4b50-7a09-bc8b-72ddf00697e5', N'Yönetici', CAST(N'2026-10-15T21:45:23.8767869' AS DateTime2), CAST(N'2026-10-15T21:45:23.8484366' AS DateTime2))
GO
INSERT [dbo].[SmsMessages] ([Id], [BatchId], [PeriodId], [EnrollmentId], [ApplicationId], [StudentId], [RecipientName], [Phone], [Body], [Parts], [Status], [ProviderStatus], [ProviderMessageId], [GsmError], [Credits], [SentAt], [DoneAt], [UpdatedAt], [CreatedAt]) VALUES (N'01a14186-ec6b-7af6-88aa-67c9dbae9518', N'01a14186-ec55-74e6-afa4-ee56fe2cbf16', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', NULL, N'01a1417b-a064-727a-a163-f45777b2e616', N'Feyza Demir', N'905464571142', N'sayın Feyza, yarın temizlikçi gelemeyecekmiş, bilginize.', 1, N'Simulated', NULL, NULL, NULL, NULL, NULL, NULL, NULL, CAST(N'2026-10-15T21:45:23.8484366' AS DateTime2))
INSERT [dbo].[SmsMessages] ([Id], [BatchId], [PeriodId], [EnrollmentId], [ApplicationId], [StudentId], [RecipientName], [Phone], [Body], [Parts], [Status], [ProviderStatus], [ProviderMessageId], [GsmError], [Credits], [SentAt], [DoneAt], [UpdatedAt], [CreatedAt]) VALUES (N'01a15431-2cfc-7343-bd64-abda3c91d114', N'01a15431-2cc7-7c06-bb5e-a31c15139ab9', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', NULL, N'01a1417b-a064-727a-a163-f45777b2e616', N'Feyza Demir', N'905464571142', N'sdfsdfsfsf Feyza', 1, N'Simulated', NULL, NULL, NULL, NULL, NULL, NULL, NULL, CAST(N'2026-10-19T12:44:31.4333782' AS DateTime2))
INSERT [dbo].[SmsMessages] ([Id], [BatchId], [PeriodId], [EnrollmentId], [ApplicationId], [StudentId], [RecipientName], [Phone], [Body], [Parts], [Status], [ProviderStatus], [ProviderMessageId], [GsmError], [Credits], [SentAt], [DoneAt], [UpdatedAt], [CreatedAt]) VALUES (N'01a14e72-8143-7138-abd1-bc9c40fe603d', N'01a14e72-812c-718b-bbad-de100c574a5b', N'01a14165-7e0b-7682-a6a6-7a6e25c1b55c', N'01a1417b-a0fc-7491-a47a-1f7de1e7fc33', NULL, N'01a1417b-a064-727a-a163-f45777b2e616', N'Feyza Demir', N'905464571142', N'sefsfsefsef Feyza, 76.620 TL', 1, N'Simulated', NULL, NULL, NULL, NULL, NULL, NULL, NULL, CAST(N'2026-10-18T09:58:09.5063949' AS DateTime2))
GO
INSERT [dbo].[StaticPages] ([Id], [Key], [Title], [Body], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-615d-7b70-96a3-3882b43b7e14', N'kvkk', N'{"tr":"KVKK Ayd\u0131nlatma Metni","en":"Privacy Notice"}', NULL, CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[StaticPages] ([Id], [Key], [Title], [Body], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-615c-7998-aed1-727f937d8562', N'contact', N'{"tr":"\u0130leti\u015Fim","en":"Contact"}', NULL, CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[StaticPages] ([Id], [Key], [Title], [Body], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a14141-611a-74da-bcc7-c239b13f5632', N'about', N'{"tr":"Hakk\u0131m\u0131zda","en":"About us"}', NULL, CAST(N'2026-10-15T20:29:26.3112817' AS DateTime2), NULL, NULL, 1, 0)
GO
INSERT [dbo].[StudentGuardians] ([Id], [StudentId], [Name], [Phone], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1417b-a0ad-70e8-9fd6-43457e42945f', N'01a1417b-a064-727a-a163-f45777b2e616', N'Makbule Demir', N'5536408195', CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2), NULL, NULL, 1, 0)
INSERT [dbo].[StudentGuardians] ([Id], [StudentId], [Name], [Phone], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1417b-a0ad-70ce-90d3-788f161fa6a1', N'01a1417b-a064-727a-a163-f45777b2e616', N'Nusret Demir', N'5058699193', CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2), NULL, NULL, 1, 1)
GO
INSERT [dbo].[Students] ([Id], [Tc], [FirstName], [LastName], [BirthDate], [Phone], [Address], [ProvinceId], [Province], [District], [School], [Faculty], [Department], [Grade], [Language], [PasswordHash], [PasswordChangedAt], [SecurityStamp], [LastLoginAt], [FailedLoginCount], [LockedUntil], [CreatedAt], [UpdatedAt], [DeletedAt], [IsActive], [OrderIndex]) VALUES (N'01a1417b-a064-727a-a163-f45777b2e616', N'10693492082', N'Feyza', N'Demir', CAST(N'2006-01-13' AS Date), N'5464571142', N'Kayalık mahallesi 2458.sokak no20 kat2 Adıyaman merkez', 2, N'Adıyaman', N'Merkez', N'KTÜ', N'Mühendislik Fak.', N'Bilgisayar Müh.', N'1', N'tr', N'AQAAAAIAAYagAAAAEMc8HF+KbM2PzWoDuQzTX/KG0kNst9wlIEOdVykCMlrTGiywufya8ga47Fyr5aIJUg==', NULL, N'b9b9fb8b-f7d4-4e5b-8bd0-9bab67561242', CAST(N'2026-10-19T12:50:18.0197789' AS DateTime2), 0, NULL, CAST(N'2026-10-15T21:33:03.7088765' AS DateTime2), CAST(N'2026-10-19T12:50:18.0203479' AS DateTime2), NULL, 1, 0)
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Accounts_Name]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_Accounts_Name] ON [dbo].[Accounts]
(
	[Name] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_AccountTransactions_AccountId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_AccountTransactions_AccountId] ON [dbo].[AccountTransactions]
(
	[AccountId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_AccountTransactions_PeriodId_AccountId_Date]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_AccountTransactions_PeriodId_AccountId_Date] ON [dbo].[AccountTransactions]
(
	[PeriodId] ASC,
	[AccountId] ASC,
	[Date] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_AccountTransactions_Source_SourceId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_AccountTransactions_Source_SourceId] ON [dbo].[AccountTransactions]
(
	[Source] ASC,
	[SourceId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UX_AccountTransactions_Opening]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [UX_AccountTransactions_Opening] ON [dbo].[AccountTransactions]
(
	[PeriodId] ASC,
	[AccountId] ASC
)
WHERE ([Source]='Opening')
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_AdminUsers_Email]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_AdminUsers_Email] ON [dbo].[AdminUsers]
(
	[Email] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ApartmentMedia_ApartmentId_MediaAssetId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_ApartmentMedia_ApartmentId_MediaAssetId] ON [dbo].[ApartmentMedia]
(
	[ApartmentId] ASC,
	[MediaAssetId] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ApartmentMedia_MediaAssetId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_ApartmentMedia_MediaAssetId] ON [dbo].[ApartmentMedia]
(
	[MediaAssetId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ApartmentMedia_RoomId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_ApartmentMedia_RoomId] ON [dbo].[ApartmentMedia]
(
	[RoomId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UX_ApartmentMedia_OneVideoPerApartment]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [UX_ApartmentMedia_OneVideoPerApartment] ON [dbo].[ApartmentMedia]
(
	[ApartmentId] ASC
)
WHERE ([IsVideo]=(1) AND [DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Apartments_Name]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_Apartments_Name] ON [dbo].[Apartments]
(
	[Name] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Apartments_Slug]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_Apartments_Slug] ON [dbo].[Apartments]
(
	[Slug] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Applications_No]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_Applications_No] ON [dbo].[Applications]
(
	[No] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Applications_PeriodId_Status_CreatedAt]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Applications_PeriodId_Status_CreatedAt] ON [dbo].[Applications]
(
	[PeriodId] ASC,
	[Status] ASC,
	[CreatedAt] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Applications_PreferredRoomId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Applications_PreferredRoomId] ON [dbo].[Applications]
(
	[PreferredRoomId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Applications_RoomTypeId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Applications_RoomTypeId] ON [dbo].[Applications]
(
	[RoomTypeId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UX_Applications_Period_Tc_Open]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [UX_Applications_Period_Tc_Open] ON [dbo].[Applications]
(
	[PeriodId] ASC,
	[Tc] ASC
)
WHERE ([Status]<>'Rejected' AND [DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_AuditLogs_CreatedAt]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_AuditLogs_CreatedAt] ON [dbo].[AuditLogs]
(
	[CreatedAt] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_AuditLogs_Entity_EntityId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_AuditLogs_Entity_EntityId] ON [dbo].[AuditLogs]
(
	[Entity] ASC,
	[EntityId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_AuditLogs_PeriodId_CreatedAt]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_AuditLogs_PeriodId_CreatedAt] ON [dbo].[AuditLogs]
(
	[PeriodId] ASC,
	[CreatedAt] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Bills_PeriodId_DueDate]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Bills_PeriodId_DueDate] ON [dbo].[Bills]
(
	[PeriodId] ASC,
	[DueDate] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Bills_Status]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Bills_Status] ON [dbo].[Bills]
(
	[Status] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Bills_SubscriptionId_Month]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_Bills_SubscriptionId_Month] ON [dbo].[Bills]
(
	[SubscriptionId] ASC,
	[Month] ASC
)
WHERE ([SubscriptionId] IS NOT NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_BillSubscriptions_Kind_SubscriberNo]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_BillSubscriptions_Kind_SubscriberNo] ON [dbo].[BillSubscriptions]
(
	[Kind] ASC,
	[SubscriberNo] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Charges_EnrollmentId_DueDate]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Charges_EnrollmentId_DueDate] ON [dbo].[Charges]
(
	[EnrollmentId] ASC,
	[DueDate] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Charges_PeriodId_DueDate]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Charges_PeriodId_DueDate] ON [dbo].[Charges]
(
	[PeriodId] ASC,
	[DueDate] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Charges_ReversalOfId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Charges_ReversalOfId] ON [dbo].[Charges]
(
	[ReversalOfId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ContactLogs_EnrollmentId_CreatedAt]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_ContactLogs_EnrollmentId_CreatedAt] ON [dbo].[ContactLogs]
(
	[EnrollmentId] ASC,
	[CreatedAt] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ContactLogs_PeriodId_CreatedAt]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_ContactLogs_PeriodId_CreatedAt] ON [dbo].[ContactLogs]
(
	[PeriodId] ASC,
	[CreatedAt] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Enrollments_ApplicationId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Enrollments_ApplicationId] ON [dbo].[Enrollments]
(
	[ApplicationId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Enrollments_PeriodId_Status]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Enrollments_PeriodId_Status] ON [dbo].[Enrollments]
(
	[PeriodId] ASC,
	[Status] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Enrollments_RoomTypeId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Enrollments_RoomTypeId] ON [dbo].[Enrollments]
(
	[RoomTypeId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Enrollments_StudentId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Enrollments_StudentId] ON [dbo].[Enrollments]
(
	[StudentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [UX_Enrollments_Period_Student_Open]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [UX_Enrollments_Period_Student_Open] ON [dbo].[Enrollments]
(
	[PeriodId] ASC,
	[StudentId] ASC
)
WHERE ([Status]<>'Cancelled' AND [DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_ExpenseCategories_Name]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_ExpenseCategories_Name] ON [dbo].[ExpenseCategories]
(
	[Name] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_ExpenseCategories_SystemKey]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_ExpenseCategories_SystemKey] ON [dbo].[ExpenseCategories]
(
	[SystemKey] ASC
)
WHERE ([SystemKey] IS NOT NULL AND [DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Expenses_AccountId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Expenses_AccountId] ON [dbo].[Expenses]
(
	[AccountId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Expenses_BillId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Expenses_BillId] ON [dbo].[Expenses]
(
	[BillId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Expenses_CategoryId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Expenses_CategoryId] ON [dbo].[Expenses]
(
	[CategoryId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Expenses_PeriodId_Date]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Expenses_PeriodId_Date] ON [dbo].[Expenses]
(
	[PeriodId] ASC,
	[Date] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_IdempotencyKeys_CreatedAt]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_IdempotencyKeys_CreatedAt] ON [dbo].[IdempotencyKeys]
(
	[CreatedAt] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_MaintenanceEvents_RequestId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_MaintenanceEvents_RequestId] ON [dbo].[MaintenanceEvents]
(
	[RequestId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_MaintenancePhotos_RequestId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_MaintenancePhotos_RequestId] ON [dbo].[MaintenancePhotos]
(
	[RequestId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_MaintenanceRequests_EnrollmentId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_MaintenanceRequests_EnrollmentId] ON [dbo].[MaintenanceRequests]
(
	[EnrollmentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_MaintenanceRequests_No]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_MaintenanceRequests_No] ON [dbo].[MaintenanceRequests]
(
	[No] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_MaintenanceRequests_PeriodId_Status]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_MaintenanceRequests_PeriodId_Status] ON [dbo].[MaintenanceRequests]
(
	[PeriodId] ASC,
	[Status] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_MaintenanceRequests_StudentId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_MaintenanceRequests_StudentId] ON [dbo].[MaintenanceRequests]
(
	[StudentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_MediaAssets_Kind_CreatedAt]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_MediaAssets_Kind_CreatedAt] ON [dbo].[MediaAssets]
(
	[Kind] ASC,
	[CreatedAt] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_MediaAssets_UploadedById]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_MediaAssets_UploadedById] ON [dbo].[MediaAssets]
(
	[UploadedById] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_MessageTemplates_Key]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_MessageTemplates_Key] ON [dbo].[MessageTemplates]
(
	[Key] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_NotificationBatches_CreatedAt]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_NotificationBatches_CreatedAt] ON [dbo].[NotificationBatches]
(
	[CreatedAt] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_NotificationDeliveries_BatchId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_NotificationDeliveries_BatchId] ON [dbo].[NotificationDeliveries]
(
	[BatchId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_PaymentAllocations_ChargeId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_PaymentAllocations_ChargeId] ON [dbo].[PaymentAllocations]
(
	[ChargeId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_PaymentAllocations_EnrollmentId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_PaymentAllocations_EnrollmentId] ON [dbo].[PaymentAllocations]
(
	[EnrollmentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_PaymentAllocations_PaymentId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_PaymentAllocations_PaymentId] ON [dbo].[PaymentAllocations]
(
	[PaymentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Payments_AccountId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Payments_AccountId] ON [dbo].[Payments]
(
	[AccountId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Payments_EnrollmentId_Date]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Payments_EnrollmentId_Date] ON [dbo].[Payments]
(
	[EnrollmentId] ASC,
	[Date] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Payments_PeriodId_Date]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Payments_PeriodId_Date] ON [dbo].[Payments]
(
	[PeriodId] ASC,
	[Date] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Periods_Name]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_Periods_Name] ON [dbo].[Periods]
(
	[Name] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Periods_Status_StartDate]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Periods_Status_StartDate] ON [dbo].[Periods]
(
	[Status] ASC,
	[StartDate] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Placements_EnrollmentId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Placements_EnrollmentId] ON [dbo].[Placements]
(
	[EnrollmentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Placements_PeriodId_StartDate]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Placements_PeriodId_StartDate] ON [dbo].[Placements]
(
	[PeriodId] ASC,
	[StartDate] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Placements_RoomId_StartDate_EndDate]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Placements_RoomId_StartDate_EndDate] ON [dbo].[Placements]
(
	[RoomId] ASC,
	[StartDate] ASC,
	[EndDate] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_PushSubscriptions_EndpointHash]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_PushSubscriptions_EndpointHash] ON [dbo].[PushSubscriptions]
(
	[EndpointHash] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_PushSubscriptions_OwnerType_OwnerId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_PushSubscriptions_OwnerType_OwnerId] ON [dbo].[PushSubscriptions]
(
	[OwnerType] ASC,
	[OwnerId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_RefreshTokens_ExpiresAt]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_RefreshTokens_ExpiresAt] ON [dbo].[RefreshTokens]
(
	[ExpiresAt] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_RefreshTokens_FamilyId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_RefreshTokens_FamilyId] ON [dbo].[RefreshTokens]
(
	[FamilyId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_RefreshTokens_Role_UserId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_RefreshTokens_Role_UserId] ON [dbo].[RefreshTokens]
(
	[Role] ASC,
	[UserId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_RefreshTokens_TokenHash]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_RefreshTokens_TokenHash] ON [dbo].[RefreshTokens]
(
	[TokenHash] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Rooms_ApartmentId_Name]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_Rooms_ApartmentId_Name] ON [dbo].[Rooms]
(
	[ApartmentId] ASC,
	[Name] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Rooms_RoomTypeId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Rooms_RoomTypeId] ON [dbo].[Rooms]
(
	[RoomTypeId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_RoomTypePrices_PeriodId_RoomTypeId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_RoomTypePrices_PeriodId_RoomTypeId] ON [dbo].[RoomTypePrices]
(
	[PeriodId] ASC,
	[RoomTypeId] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_RoomTypePrices_RoomTypeId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_RoomTypePrices_RoomTypeId] ON [dbo].[RoomTypePrices]
(
	[RoomTypeId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_RoomTypes_CoverMediaId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_RoomTypes_CoverMediaId] ON [dbo].[RoomTypes]
(
	[CoverMediaId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_RoomTypes_Slug]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_RoomTypes_Slug] ON [dbo].[RoomTypes]
(
	[Slug] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_SiteSettings_HeroVideoMediaId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_SiteSettings_HeroVideoMediaId] ON [dbo].[SiteSettings]
(
	[HeroVideoMediaId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_SiteSettings_MapMediaId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_SiteSettings_MapMediaId] ON [dbo].[SiteSettings]
(
	[MapMediaId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Slides_IsActive_OrderIndex]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Slides_IsActive_OrderIndex] ON [dbo].[Slides]
(
	[IsActive] ASC,
	[OrderIndex] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Slides_MediaId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Slides_MediaId] ON [dbo].[Slides]
(
	[MediaId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_SmsBatches_CreatedAt]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_SmsBatches_CreatedAt] ON [dbo].[SmsBatches]
(
	[CreatedAt] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_SmsMessages_BatchId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_SmsMessages_BatchId] ON [dbo].[SmsMessages]
(
	[BatchId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_SmsMessages_CreatedAt]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_SmsMessages_CreatedAt] ON [dbo].[SmsMessages]
(
	[CreatedAt] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_SmsMessages_EnrollmentId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_SmsMessages_EnrollmentId] ON [dbo].[SmsMessages]
(
	[EnrollmentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_SmsMessages_ProviderMessageId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_SmsMessages_ProviderMessageId] ON [dbo].[SmsMessages]
(
	[ProviderMessageId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_StaticPages_Key]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_StaticPages_Key] ON [dbo].[StaticPages]
(
	[Key] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_StudentGuardians_StudentId]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_StudentGuardians_StudentId] ON [dbo].[StudentGuardians]
(
	[StudentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Students_LastName_FirstName]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_Students_LastName_FirstName] ON [dbo].[Students]
(
	[LastName] ASC,
	[FirstName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Students_Phone]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_Students_Phone] ON [dbo].[Students]
(
	[Phone] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Students_Tc]    Script Date: 10/22/2026 6:16:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_Students_Tc] ON [dbo].[Students]
(
	[Tc] ASC
)
WHERE ([DeletedAt] IS NULL)
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
SET ANSI_PADDING ON
GO
ALTER TABLE [dbo].[Bills] ADD  DEFAULT (CONVERT([bit],(0))) FOR [AwaitingInvoice]
GO
ALTER TABLE [dbo].[AccountTransactions]  WITH CHECK ADD  CONSTRAINT [FK_AccountTransactions_Accounts_AccountId] FOREIGN KEY([AccountId])
REFERENCES [dbo].[Accounts] ([Id])
GO
ALTER TABLE [dbo].[AccountTransactions] CHECK CONSTRAINT [FK_AccountTransactions_Accounts_AccountId]
GO
ALTER TABLE [dbo].[AccountTransactions]  WITH CHECK ADD  CONSTRAINT [FK_AccountTransactions_Periods_PeriodId] FOREIGN KEY([PeriodId])
REFERENCES [dbo].[Periods] ([Id])
GO
ALTER TABLE [dbo].[AccountTransactions] CHECK CONSTRAINT [FK_AccountTransactions_Periods_PeriodId]
GO
ALTER TABLE [dbo].[ApartmentMedia]  WITH CHECK ADD  CONSTRAINT [FK_ApartmentMedia_Apartments_ApartmentId] FOREIGN KEY([ApartmentId])
REFERENCES [dbo].[Apartments] ([Id])
GO
ALTER TABLE [dbo].[ApartmentMedia] CHECK CONSTRAINT [FK_ApartmentMedia_Apartments_ApartmentId]
GO
ALTER TABLE [dbo].[ApartmentMedia]  WITH CHECK ADD  CONSTRAINT [FK_ApartmentMedia_MediaAssets_MediaAssetId] FOREIGN KEY([MediaAssetId])
REFERENCES [dbo].[MediaAssets] ([Id])
GO
ALTER TABLE [dbo].[ApartmentMedia] CHECK CONSTRAINT [FK_ApartmentMedia_MediaAssets_MediaAssetId]
GO
ALTER TABLE [dbo].[ApartmentMedia]  WITH CHECK ADD  CONSTRAINT [FK_ApartmentMedia_Rooms_RoomId] FOREIGN KEY([RoomId])
REFERENCES [dbo].[Rooms] ([Id])
GO
ALTER TABLE [dbo].[ApartmentMedia] CHECK CONSTRAINT [FK_ApartmentMedia_Rooms_RoomId]
GO
ALTER TABLE [dbo].[Applications]  WITH CHECK ADD  CONSTRAINT [FK_Applications_Periods_PeriodId] FOREIGN KEY([PeriodId])
REFERENCES [dbo].[Periods] ([Id])
GO
ALTER TABLE [dbo].[Applications] CHECK CONSTRAINT [FK_Applications_Periods_PeriodId]
GO
ALTER TABLE [dbo].[Applications]  WITH CHECK ADD  CONSTRAINT [FK_Applications_Rooms_PreferredRoomId] FOREIGN KEY([PreferredRoomId])
REFERENCES [dbo].[Rooms] ([Id])
GO
ALTER TABLE [dbo].[Applications] CHECK CONSTRAINT [FK_Applications_Rooms_PreferredRoomId]
GO
ALTER TABLE [dbo].[Applications]  WITH CHECK ADD  CONSTRAINT [FK_Applications_RoomTypes_RoomTypeId] FOREIGN KEY([RoomTypeId])
REFERENCES [dbo].[RoomTypes] ([Id])
GO
ALTER TABLE [dbo].[Applications] CHECK CONSTRAINT [FK_Applications_RoomTypes_RoomTypeId]
GO
ALTER TABLE [dbo].[Bills]  WITH CHECK ADD  CONSTRAINT [FK_Bills_BillSubscriptions_SubscriptionId] FOREIGN KEY([SubscriptionId])
REFERENCES [dbo].[BillSubscriptions] ([Id])
GO
ALTER TABLE [dbo].[Bills] CHECK CONSTRAINT [FK_Bills_BillSubscriptions_SubscriptionId]
GO
ALTER TABLE [dbo].[Bills]  WITH CHECK ADD  CONSTRAINT [FK_Bills_Periods_PeriodId] FOREIGN KEY([PeriodId])
REFERENCES [dbo].[Periods] ([Id])
GO
ALTER TABLE [dbo].[Bills] CHECK CONSTRAINT [FK_Bills_Periods_PeriodId]
GO
ALTER TABLE [dbo].[Charges]  WITH CHECK ADD  CONSTRAINT [FK_Charges_Charges_ReversalOfId] FOREIGN KEY([ReversalOfId])
REFERENCES [dbo].[Charges] ([Id])
GO
ALTER TABLE [dbo].[Charges] CHECK CONSTRAINT [FK_Charges_Charges_ReversalOfId]
GO
ALTER TABLE [dbo].[Charges]  WITH CHECK ADD  CONSTRAINT [FK_Charges_Enrollments_EnrollmentId] FOREIGN KEY([EnrollmentId])
REFERENCES [dbo].[Enrollments] ([Id])
GO
ALTER TABLE [dbo].[Charges] CHECK CONSTRAINT [FK_Charges_Enrollments_EnrollmentId]
GO
ALTER TABLE [dbo].[Charges]  WITH CHECK ADD  CONSTRAINT [FK_Charges_Periods_PeriodId] FOREIGN KEY([PeriodId])
REFERENCES [dbo].[Periods] ([Id])
GO
ALTER TABLE [dbo].[Charges] CHECK CONSTRAINT [FK_Charges_Periods_PeriodId]
GO
ALTER TABLE [dbo].[ContactLogs]  WITH CHECK ADD  CONSTRAINT [FK_ContactLogs_Enrollments_EnrollmentId] FOREIGN KEY([EnrollmentId])
REFERENCES [dbo].[Enrollments] ([Id])
GO
ALTER TABLE [dbo].[ContactLogs] CHECK CONSTRAINT [FK_ContactLogs_Enrollments_EnrollmentId]
GO
ALTER TABLE [dbo].[ContactLogs]  WITH CHECK ADD  CONSTRAINT [FK_ContactLogs_Periods_PeriodId] FOREIGN KEY([PeriodId])
REFERENCES [dbo].[Periods] ([Id])
GO
ALTER TABLE [dbo].[ContactLogs] CHECK CONSTRAINT [FK_ContactLogs_Periods_PeriodId]
GO
ALTER TABLE [dbo].[Enrollments]  WITH CHECK ADD  CONSTRAINT [FK_Enrollments_Applications_ApplicationId] FOREIGN KEY([ApplicationId])
REFERENCES [dbo].[Applications] ([Id])
GO
ALTER TABLE [dbo].[Enrollments] CHECK CONSTRAINT [FK_Enrollments_Applications_ApplicationId]
GO
ALTER TABLE [dbo].[Enrollments]  WITH CHECK ADD  CONSTRAINT [FK_Enrollments_Periods_PeriodId] FOREIGN KEY([PeriodId])
REFERENCES [dbo].[Periods] ([Id])
GO
ALTER TABLE [dbo].[Enrollments] CHECK CONSTRAINT [FK_Enrollments_Periods_PeriodId]
GO
ALTER TABLE [dbo].[Enrollments]  WITH CHECK ADD  CONSTRAINT [FK_Enrollments_RoomTypes_RoomTypeId] FOREIGN KEY([RoomTypeId])
REFERENCES [dbo].[RoomTypes] ([Id])
GO
ALTER TABLE [dbo].[Enrollments] CHECK CONSTRAINT [FK_Enrollments_RoomTypes_RoomTypeId]
GO
ALTER TABLE [dbo].[Enrollments]  WITH CHECK ADD  CONSTRAINT [FK_Enrollments_Students_StudentId] FOREIGN KEY([StudentId])
REFERENCES [dbo].[Students] ([Id])
GO
ALTER TABLE [dbo].[Enrollments] CHECK CONSTRAINT [FK_Enrollments_Students_StudentId]
GO
ALTER TABLE [dbo].[Expenses]  WITH CHECK ADD  CONSTRAINT [FK_Expenses_Accounts_AccountId] FOREIGN KEY([AccountId])
REFERENCES [dbo].[Accounts] ([Id])
GO
ALTER TABLE [dbo].[Expenses] CHECK CONSTRAINT [FK_Expenses_Accounts_AccountId]
GO
ALTER TABLE [dbo].[Expenses]  WITH CHECK ADD  CONSTRAINT [FK_Expenses_Bills_BillId] FOREIGN KEY([BillId])
REFERENCES [dbo].[Bills] ([Id])
GO
ALTER TABLE [dbo].[Expenses] CHECK CONSTRAINT [FK_Expenses_Bills_BillId]
GO
ALTER TABLE [dbo].[Expenses]  WITH CHECK ADD  CONSTRAINT [FK_Expenses_ExpenseCategories_CategoryId] FOREIGN KEY([CategoryId])
REFERENCES [dbo].[ExpenseCategories] ([Id])
GO
ALTER TABLE [dbo].[Expenses] CHECK CONSTRAINT [FK_Expenses_ExpenseCategories_CategoryId]
GO
ALTER TABLE [dbo].[Expenses]  WITH CHECK ADD  CONSTRAINT [FK_Expenses_Periods_PeriodId] FOREIGN KEY([PeriodId])
REFERENCES [dbo].[Periods] ([Id])
GO
ALTER TABLE [dbo].[Expenses] CHECK CONSTRAINT [FK_Expenses_Periods_PeriodId]
GO
ALTER TABLE [dbo].[MaintenanceEvents]  WITH CHECK ADD  CONSTRAINT [FK_MaintenanceEvents_MaintenanceRequests_RequestId] FOREIGN KEY([RequestId])
REFERENCES [dbo].[MaintenanceRequests] ([Id])
GO
ALTER TABLE [dbo].[MaintenanceEvents] CHECK CONSTRAINT [FK_MaintenanceEvents_MaintenanceRequests_RequestId]
GO
ALTER TABLE [dbo].[MaintenancePhotos]  WITH CHECK ADD  CONSTRAINT [FK_MaintenancePhotos_MaintenanceRequests_RequestId] FOREIGN KEY([RequestId])
REFERENCES [dbo].[MaintenanceRequests] ([Id])
GO
ALTER TABLE [dbo].[MaintenancePhotos] CHECK CONSTRAINT [FK_MaintenancePhotos_MaintenanceRequests_RequestId]
GO
ALTER TABLE [dbo].[MaintenanceRequests]  WITH CHECK ADD  CONSTRAINT [FK_MaintenanceRequests_Enrollments_EnrollmentId] FOREIGN KEY([EnrollmentId])
REFERENCES [dbo].[Enrollments] ([Id])
GO
ALTER TABLE [dbo].[MaintenanceRequests] CHECK CONSTRAINT [FK_MaintenanceRequests_Enrollments_EnrollmentId]
GO
ALTER TABLE [dbo].[MaintenanceRequests]  WITH CHECK ADD  CONSTRAINT [FK_MaintenanceRequests_Periods_PeriodId] FOREIGN KEY([PeriodId])
REFERENCES [dbo].[Periods] ([Id])
GO
ALTER TABLE [dbo].[MaintenanceRequests] CHECK CONSTRAINT [FK_MaintenanceRequests_Periods_PeriodId]
GO
ALTER TABLE [dbo].[MaintenanceRequests]  WITH CHECK ADD  CONSTRAINT [FK_MaintenanceRequests_Students_StudentId] FOREIGN KEY([StudentId])
REFERENCES [dbo].[Students] ([Id])
GO
ALTER TABLE [dbo].[MaintenanceRequests] CHECK CONSTRAINT [FK_MaintenanceRequests_Students_StudentId]
GO
ALTER TABLE [dbo].[MediaAssets]  WITH CHECK ADD  CONSTRAINT [FK_MediaAssets_AdminUsers_UploadedById] FOREIGN KEY([UploadedById])
REFERENCES [dbo].[AdminUsers] ([Id])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[MediaAssets] CHECK CONSTRAINT [FK_MediaAssets_AdminUsers_UploadedById]
GO
ALTER TABLE [dbo].[NotificationDeliveries]  WITH CHECK ADD  CONSTRAINT [FK_NotificationDeliveries_NotificationBatches_BatchId] FOREIGN KEY([BatchId])
REFERENCES [dbo].[NotificationBatches] ([Id])
GO
ALTER TABLE [dbo].[NotificationDeliveries] CHECK CONSTRAINT [FK_NotificationDeliveries_NotificationBatches_BatchId]
GO
ALTER TABLE [dbo].[PaymentAllocations]  WITH CHECK ADD  CONSTRAINT [FK_PaymentAllocations_Charges_ChargeId] FOREIGN KEY([ChargeId])
REFERENCES [dbo].[Charges] ([Id])
GO
ALTER TABLE [dbo].[PaymentAllocations] CHECK CONSTRAINT [FK_PaymentAllocations_Charges_ChargeId]
GO
ALTER TABLE [dbo].[PaymentAllocations]  WITH CHECK ADD  CONSTRAINT [FK_PaymentAllocations_Enrollments_EnrollmentId] FOREIGN KEY([EnrollmentId])
REFERENCES [dbo].[Enrollments] ([Id])
GO
ALTER TABLE [dbo].[PaymentAllocations] CHECK CONSTRAINT [FK_PaymentAllocations_Enrollments_EnrollmentId]
GO
ALTER TABLE [dbo].[PaymentAllocations]  WITH CHECK ADD  CONSTRAINT [FK_PaymentAllocations_Payments_PaymentId] FOREIGN KEY([PaymentId])
REFERENCES [dbo].[Payments] ([Id])
GO
ALTER TABLE [dbo].[PaymentAllocations] CHECK CONSTRAINT [FK_PaymentAllocations_Payments_PaymentId]
GO
ALTER TABLE [dbo].[Payments]  WITH CHECK ADD  CONSTRAINT [FK_Payments_Accounts_AccountId] FOREIGN KEY([AccountId])
REFERENCES [dbo].[Accounts] ([Id])
GO
ALTER TABLE [dbo].[Payments] CHECK CONSTRAINT [FK_Payments_Accounts_AccountId]
GO
ALTER TABLE [dbo].[Payments]  WITH CHECK ADD  CONSTRAINT [FK_Payments_Enrollments_EnrollmentId] FOREIGN KEY([EnrollmentId])
REFERENCES [dbo].[Enrollments] ([Id])
GO
ALTER TABLE [dbo].[Payments] CHECK CONSTRAINT [FK_Payments_Enrollments_EnrollmentId]
GO
ALTER TABLE [dbo].[Payments]  WITH CHECK ADD  CONSTRAINT [FK_Payments_Periods_PeriodId] FOREIGN KEY([PeriodId])
REFERENCES [dbo].[Periods] ([Id])
GO
ALTER TABLE [dbo].[Payments] CHECK CONSTRAINT [FK_Payments_Periods_PeriodId]
GO
ALTER TABLE [dbo].[Placements]  WITH CHECK ADD  CONSTRAINT [FK_Placements_Enrollments_EnrollmentId] FOREIGN KEY([EnrollmentId])
REFERENCES [dbo].[Enrollments] ([Id])
GO
ALTER TABLE [dbo].[Placements] CHECK CONSTRAINT [FK_Placements_Enrollments_EnrollmentId]
GO
ALTER TABLE [dbo].[Placements]  WITH CHECK ADD  CONSTRAINT [FK_Placements_Periods_PeriodId] FOREIGN KEY([PeriodId])
REFERENCES [dbo].[Periods] ([Id])
GO
ALTER TABLE [dbo].[Placements] CHECK CONSTRAINT [FK_Placements_Periods_PeriodId]
GO
ALTER TABLE [dbo].[Placements]  WITH CHECK ADD  CONSTRAINT [FK_Placements_Rooms_RoomId] FOREIGN KEY([RoomId])
REFERENCES [dbo].[Rooms] ([Id])
GO
ALTER TABLE [dbo].[Placements] CHECK CONSTRAINT [FK_Placements_Rooms_RoomId]
GO
ALTER TABLE [dbo].[Rooms]  WITH CHECK ADD  CONSTRAINT [FK_Rooms_Apartments_ApartmentId] FOREIGN KEY([ApartmentId])
REFERENCES [dbo].[Apartments] ([Id])
GO
ALTER TABLE [dbo].[Rooms] CHECK CONSTRAINT [FK_Rooms_Apartments_ApartmentId]
GO
ALTER TABLE [dbo].[Rooms]  WITH CHECK ADD  CONSTRAINT [FK_Rooms_RoomTypes_RoomTypeId] FOREIGN KEY([RoomTypeId])
REFERENCES [dbo].[RoomTypes] ([Id])
GO
ALTER TABLE [dbo].[Rooms] CHECK CONSTRAINT [FK_Rooms_RoomTypes_RoomTypeId]
GO
ALTER TABLE [dbo].[RoomTypePrices]  WITH CHECK ADD  CONSTRAINT [FK_RoomTypePrices_Periods_PeriodId] FOREIGN KEY([PeriodId])
REFERENCES [dbo].[Periods] ([Id])
GO
ALTER TABLE [dbo].[RoomTypePrices] CHECK CONSTRAINT [FK_RoomTypePrices_Periods_PeriodId]
GO
ALTER TABLE [dbo].[RoomTypePrices]  WITH CHECK ADD  CONSTRAINT [FK_RoomTypePrices_RoomTypes_RoomTypeId] FOREIGN KEY([RoomTypeId])
REFERENCES [dbo].[RoomTypes] ([Id])
GO
ALTER TABLE [dbo].[RoomTypePrices] CHECK CONSTRAINT [FK_RoomTypePrices_RoomTypes_RoomTypeId]
GO
ALTER TABLE [dbo].[RoomTypes]  WITH CHECK ADD  CONSTRAINT [FK_RoomTypes_MediaAssets_CoverMediaId] FOREIGN KEY([CoverMediaId])
REFERENCES [dbo].[MediaAssets] ([Id])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[RoomTypes] CHECK CONSTRAINT [FK_RoomTypes_MediaAssets_CoverMediaId]
GO
ALTER TABLE [dbo].[SiteSettings]  WITH CHECK ADD  CONSTRAINT [FK_SiteSettings_MediaAssets_HeroVideoMediaId] FOREIGN KEY([HeroVideoMediaId])
REFERENCES [dbo].[MediaAssets] ([Id])
GO
ALTER TABLE [dbo].[SiteSettings] CHECK CONSTRAINT [FK_SiteSettings_MediaAssets_HeroVideoMediaId]
GO
ALTER TABLE [dbo].[SiteSettings]  WITH CHECK ADD  CONSTRAINT [FK_SiteSettings_MediaAssets_MapMediaId] FOREIGN KEY([MapMediaId])
REFERENCES [dbo].[MediaAssets] ([Id])
GO
ALTER TABLE [dbo].[SiteSettings] CHECK CONSTRAINT [FK_SiteSettings_MediaAssets_MapMediaId]
GO
ALTER TABLE [dbo].[Slides]  WITH CHECK ADD  CONSTRAINT [FK_Slides_MediaAssets_MediaId] FOREIGN KEY([MediaId])
REFERENCES [dbo].[MediaAssets] ([Id])
GO
ALTER TABLE [dbo].[Slides] CHECK CONSTRAINT [FK_Slides_MediaAssets_MediaId]
GO
ALTER TABLE [dbo].[SmsMessages]  WITH CHECK ADD  CONSTRAINT [FK_SmsMessages_SmsBatches_BatchId] FOREIGN KEY([BatchId])
REFERENCES [dbo].[SmsBatches] ([Id])
GO
ALTER TABLE [dbo].[SmsMessages] CHECK CONSTRAINT [FK_SmsMessages_SmsBatches_BatchId]
GO
ALTER TABLE [dbo].[StudentGuardians]  WITH CHECK ADD  CONSTRAINT [FK_StudentGuardians_Students_StudentId] FOREIGN KEY([StudentId])
REFERENCES [dbo].[Students] ([Id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[StudentGuardians] CHECK CONSTRAINT [FK_StudentGuardians_Students_StudentId]
GO
ALTER TABLE [dbo].[AccountTransactions]  WITH CHECK ADD  CONSTRAINT [CK_AccountTransactions_Amount] CHECK  (([Amount]>(0)))
GO
ALTER TABLE [dbo].[AccountTransactions] CHECK CONSTRAINT [CK_AccountTransactions_Amount]
GO
ALTER TABLE [dbo].[Bills]  WITH CHECK ADD  CONSTRAINT [CK_Bills_Amount] CHECK  (([Amount]>(0)))
GO
ALTER TABLE [dbo].[Bills] CHECK CONSTRAINT [CK_Bills_Amount]
GO
ALTER TABLE [dbo].[BillSubscriptions]  WITH CHECK ADD  CONSTRAINT [CK_BillSubscriptions_Amount] CHECK  (([EstimatedAmount]>(0)))
GO
ALTER TABLE [dbo].[BillSubscriptions] CHECK CONSTRAINT [CK_BillSubscriptions_Amount]
GO
ALTER TABLE [dbo].[BillSubscriptions]  WITH CHECK ADD  CONSTRAINT [CK_BillSubscriptions_DueDay] CHECK  (([DueDay]>=(1) AND [DueDay]<=(31)))
GO
ALTER TABLE [dbo].[BillSubscriptions] CHECK CONSTRAINT [CK_BillSubscriptions_DueDay]
GO
ALTER TABLE [dbo].[Expenses]  WITH CHECK ADD  CONSTRAINT [CK_Expenses_Amount] CHECK  (([Amount]>(0)))
GO
ALTER TABLE [dbo].[Expenses] CHECK CONSTRAINT [CK_Expenses_Amount]
GO
ALTER TABLE [dbo].[Payments]  WITH CHECK ADD  CONSTRAINT [CK_Payments_Amount] CHECK  (([Amount]>(0)))
GO
ALTER TABLE [dbo].[Payments] CHECK CONSTRAINT [CK_Payments_Amount]
GO
ALTER TABLE [dbo].[Periods]  WITH CHECK ADD  CONSTRAINT [CK_Periods_Dates] CHECK  (([StartDate]<[EndDate]))
GO
ALTER TABLE [dbo].[Periods] CHECK CONSTRAINT [CK_Periods_Dates]
GO
ALTER TABLE [dbo].[Placements]  WITH CHECK ADD  CONSTRAINT [CK_Placements_Dates] CHECK  (([StartDate]<=[EndDate]))
GO
ALTER TABLE [dbo].[Placements] CHECK CONSTRAINT [CK_Placements_Dates]
GO
ALTER TABLE [dbo].[Rooms]  WITH CHECK ADD  CONSTRAINT [CK_Rooms_Beds] CHECK  (([Beds]>=(1) AND [Beds]<=(12)))
GO
ALTER TABLE [dbo].[Rooms] CHECK CONSTRAINT [CK_Rooms_Beds]
GO
ALTER TABLE [dbo].[RoomTypePrices]  WITH CHECK ADD  CONSTRAINT [CK_RoomTypePrices_Deposit] CHECK  (([Deposit]>=(0)))
GO
ALTER TABLE [dbo].[RoomTypePrices] CHECK CONSTRAINT [CK_RoomTypePrices_Deposit]
GO
ALTER TABLE [dbo].[RoomTypePrices]  WITH CHECK ADD  CONSTRAINT [CK_RoomTypePrices_Monthly] CHECK  (([Monthly]>(0)))
GO
ALTER TABLE [dbo].[RoomTypePrices] CHECK CONSTRAINT [CK_RoomTypePrices_Monthly]
GO
SET NOEXEC OFF
GO
