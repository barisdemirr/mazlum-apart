namespace MazlumApart.Shared;

/// <summary>Her özellik (slice) kendi endpoint'ini bu arayüzle tanımlar; Program.cs'e dokunmadan otomatik eşlenir.</summary>
public interface IEndpoint
{
    void MapEndpoint(IEndpointRouteBuilder app);
}
