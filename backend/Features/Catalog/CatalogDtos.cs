using MazlumApart.Domain.ValueObjects;
using MazlumApart.Features.Gallery;

namespace MazlumApart.Features.Catalog;

/// <summary>Görsel referansı: url = lg varyantı (frontend md/thumb'ı türetir)</summary>
public record MediaRef(string Url, LocalizedText? Alt);

/// <summary>Paragraf listesi: { tr: [...], en: [...] } (frontend DetailSections listOf ile okur)</summary>
public record LocalizedList(List<string> Tr, List<string> En);

/// <summary>
/// Oda tipi kartı (anasayfa, /odalar, başvuru formu). Aynı tipteki odalar farklı dairelerde (ve bir dairede farklı tiplerle) bulunabilir;
/// bu yüzden dairenin kişi/mutfak/banyo sayıları tek değer değil ARALIKTIR: alan = en az, alanMax = en çok (aynıysa eşittir).
/// </summary>
public record RoomTypeCard(
    Guid Id,
    string Slug,
    LocalizedText Name,
    MediaRef? Image,
    bool HasVideo,
    int PhotoCount,
    int? PeopleInFlat,
    int? PeopleSharingKitchen,
    int? PeopleSharingBathroom,
    decimal? MonthlyPrice,
    decimal? DepositAmount,
    string Currency,
    int FlatCount,
    int BedsFree,
    int RoomCount,
    int? PeopleInFlatMax,
    int? PeopleSharingKitchenMax,
    int? PeopleSharingBathroomMax,
    string? ApartmentTypeSlug = null,
    LocalizedText? ApartmentTypeName = null);

public record RoomTypeDetail(
    Guid Id,
    string Slug,
    LocalizedText Name,
    MediaRef? Image,
    bool HasVideo,
    int PhotoCount,
    int? PeopleInFlat,
    int? PeopleSharingKitchen,
    int? PeopleSharingBathroom,
    decimal? MonthlyPrice,
    decimal? DepositAmount,
    string Currency,
    int FlatCount,
    int BedsFree,
    LocalizedList Description,
    int RoomCount,
    int? PeopleInFlatMax,
    int? PeopleSharingKitchenMax,
    int? PeopleSharingBathroomMax,
    string? ApartmentTypeSlug = null,
    LocalizedText? ApartmentTypeName = null);

/// <summary>
/// Daire türü kartı (ana sayfa ve tür sayfası). Altında, fiyatı girilmiş oda seçenekleri (her biri kendi fiyatıyla) listelenir.
/// Kontenjan hesaplanır: FlatCount = türdeki yayındaki daire sayısı, RoomCount/BedsFree = seçeneklerin odaları ve boş yatakları.
/// </summary>
public record ApartmentTypeCard(
    Guid Id,
    string Slug,
    LocalizedText Name,
    LocalizedList Description,
    MediaRef? Image,
    bool HasVideo,
    int PhotoCount,
    int FlatCount,
    int RoomCount,
    int BedsFree,
    decimal? MonthlyPriceFrom,
    decimal? MonthlyPriceTo,
    string Currency,
    List<RoomTypeCard> Options);

/// <summary>
/// Oda tipi sayfasındaki ODA kartı: tipin her odası ayrı listelenir, ait olduğu daireye bağlanır.
/// Cover: odanın kendi etiketli fotoğrafı; yoksa dairenin kapağı. PhotoCount yalnızca bu odanın fotoğraflarını sayar.
/// </summary>
public record RoomListing(
    Guid Id,
    LocalizedText Name,
    string ApartmentSlug,
    LocalizedText ApartmentName,
    int Floor,
    int Beds,
    int BedsFree,
    int PeopleInFlat,
    int? PeopleSharingKitchen,
    int? PeopleSharingBathroom,
    List<FeatureItem> Features,
    MediaRef? Cover,
    int PhotoCount,
    string RoomTypeSlug,
    LocalizedText RoomTypeName,
    decimal? MonthlyPrice,
    string Currency);

/// <summary>Daire kartı (daire sayfasında "aynı tipteki diğer daireler")</summary>
public record ApartmentSummary(
    Guid Id,
    string Slug,
    LocalizedText Name,
    int Floor,
    int PeopleInFlat,
    int? PeopleSharingKitchen,
    int? PeopleSharingBathroom,
    int BedsTotal,
    int BedsFree,
    MediaRef? Cover,
    bool HasVideo,
    int PhotoCount);

/// <summary>Herkese açık galeri öğesi: video her zaman başta</summary>
public record PublicGalleryItem(Guid Id, string Type, string Url, string? Poster, LocalizedText Label, string Category, TagDto? Tag);

public record PublicRoomInfo(Guid Id, LocalizedText Name, List<FeatureItem> Features, int BedCount);

public record BedDto(string Id, LocalizedText Label, string Status);

public record AvailabilityRoom(Guid Id, LocalizedText Name, string TagKey, List<BedDto> Beds);

public record AvailabilityFlat(
    Guid Id,
    string Slug,
    LocalizedText Name,
    int Floor,
    int PeopleInFlat,
    int? PeopleSharingKitchen,
    int? PeopleSharingBathroom,
    List<AvailabilityRoom> Rooms);

public record PeriodInfo(Guid Id, LocalizedText Name);

public record Availability(PeriodInfo? Period, List<AvailabilityFlat> Apartments);

public record ApartmentDetail(
    Guid Id,
    string Slug,
    LocalizedText Name,
    int Floor,
    int PeopleInFlat,
    int? PeopleSharingKitchen,
    int? PeopleSharingBathroom,
    int BedsTotal,
    int BedsFree,
    MediaRef? Cover,
    bool HasVideo,
    int PhotoCount,
    List<PublicGalleryItem> Gallery,
    List<FeatureItem> SharedAreas,
    List<PublicRoomInfo> Rooms,
    Availability Availability);
