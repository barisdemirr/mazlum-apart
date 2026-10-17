using MazlumApart.Shared;

namespace MazlumApart.Features.Catalog;

/// <summary>Herkese açık katalog uçları (frontend services/roomTypes.js)</summary>
public static class GetRoomTypes
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/room-types", async (CatalogQueryHandler catalog, CancellationToken ct) =>
                Results.Ok(await catalog.RoomTypesAsync(ct))).AllowAnonymous();
    }
}

public static class GetRoomTypeBySlug
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/room-types/{slug}", async (string slug, CatalogQueryHandler catalog, CancellationToken ct) =>
                await catalog.RoomTypeAsync(slug, ct) is { } detail ? Results.Ok(detail) : Error.NotFound("Oda tipi bulunamadı.").ToProblem())
                .AllowAnonymous();
    }
}

public static class GetRoomTypeApartments
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/room-types/{slug}/apartments", async (string slug, CatalogQueryHandler catalog, CancellationToken ct) =>
                await catalog.ApartmentsAsync(slug, ct) is { } list ? Results.Ok(list) : Error.NotFound("Oda tipi bulunamadı.").ToProblem())
                .AllowAnonymous();
    }
}

public static class GetRoomTypeRooms
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/room-types/{slug}/rooms", async (string slug, CatalogQueryHandler catalog, CancellationToken ct) =>
                await catalog.RoomsAsync(slug, ct) is { } list ? Results.Ok(list) : Error.NotFound("Oda tipi bulunamadı.").ToProblem())
                .AllowAnonymous();
    }
}

public static class GetApartmentDetail
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/room-types/{slug}/apartments/{apartmentSlug}",
                    async (string slug, string apartmentSlug, CatalogQueryHandler catalog, CancellationToken ct) =>
                        await catalog.ApartmentAsync(slug, apartmentSlug, ct) is { } detail
                            ? Results.Ok(detail)
                            : Error.NotFound("Daire bulunamadı.").ToProblem())
                .AllowAnonymous();
    }
}

public static class GetRoomTypeAvailability
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/room-types/{slug}/availability", async (string slug, CatalogQueryHandler catalog, CancellationToken ct) =>
                await catalog.AvailabilityAsync(slug, ct) is { } data ? Results.Ok(data) : Error.NotFound("Oda tipi bulunamadı.").ToProblem())
                .AllowAnonymous();
    }
}
