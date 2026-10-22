/*
  Mazlum Apart — canlı veritabanı kurulum script'i (yalnızca şema + EF migration geçmişi)
  - SSMS'te Plesk'te oluşturduğun BOŞ veritabanını seçip (üstteki açılır listeden) çalıştır.
  - CREATE/ALTER DATABASE, USE, HangFire şeması ve tüm test verileri çıkarıldı.
  - HangFire tablolarını uygulama ilk açılışta kendisi oluşturur.
  - Yönetici, sabit sayfalar, mesaj şablonları, site ayarları, gider kategorileri ve kasa hesabı ilk açılışta seeder'larca eklenir.
*/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF DB_NAME() IN (N'master', N'model', N'msdb', N'tempdb')
    THROW 50000, N'Yanlis veritabani secili: SSMS''te Plesk veritabanini secip tekrar calistir.', 1;
GO
IF OBJECT_ID(N'[dbo].[__EFMigrationsHistory]') IS NOT NULL
    THROW 50000, N'Bu veritabaninda tablolar zaten var: script yalnizca BOS veritabaninda calistirilir.', 1;
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
