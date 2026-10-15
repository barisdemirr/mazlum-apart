using System.Reflection;
using System.Text.Json;

namespace MazlumApart.Shared;

/// <summary>81 il ve ilçeleri (frontend lib/data/turkeyLocations.json ile aynı dosya, derlemeye gömülü)</summary>
public static class TurkeyLocations
{
    public record Province(int Id, string Name, List<string> Districts);

    private static readonly Lazy<Dictionary<int, Province>> Data = new(() =>
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("MazlumApart.Shared.Data.turkey-locations.json")
            ?? throw new InvalidOperationException("turkey-locations.json gömülü kaynak olarak bulunamadı.");
        var list = JsonSerializer.Deserialize<List<Province>>(stream, new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? [];
        return list.ToDictionary(p => p.Id);
    });

    public static IEnumerable<Province> All => Data.Value.Values.OrderBy(p => p.Id);

    public static Province? Find(int id) => Data.Value.GetValueOrDefault(id);

    public static bool IsValid(int provinceId, string? district) =>
        Find(provinceId) is { } p && district is not null && p.Districts.Contains(district);
}
