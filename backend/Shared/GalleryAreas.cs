using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Shared;

/// <summary>Galeri için hazır ortak alan etiketleri (frontend lib/gallery.js AREA_TAGS ile aynı anahtarlar)</summary>
public static class GalleryAreas
{
    public record Area(string Key, LocalizedText Label, string Category);

    public static readonly IReadOnlyList<Area> All =
    [
        new("kitchen", new() { Tr = "Mutfak", En = "Kitchen" }, "kitchen"),
        new("bathroom", new() { Tr = "Banyo", En = "Bathroom" }, "bathroom"),
        new("living", new() { Tr = "Salon", En = "Living room" }, "flat"),
        new("hall", new() { Tr = "Koridor", En = "Hallway" }, "flat"),
        new("balcony", new() { Tr = "Balkon", En = "Balcony" }, "flat"),
        new("building", new() { Tr = "Bina", En = "Building" }, "other")
    ];

    public static Area? Find(string? key) => All.FirstOrDefault(a => a.Key == key);
}
