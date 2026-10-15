using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Shared;

namespace MazlumApart.Features.Gallery;

/// <summary>Galeri etiketi (frontend lib/gallery.js ile aynı şekil): { key, tr, en }</summary>
public record TagDto(string Key, string Tr, string En);

/// <summary>Etiket girişi: key = "room:{odaId}" | "kitchen" | "bathroom" | ... | "custom" (+ tr/en) | null (etiketsiz)</summary>
public record TagInput(string? Key, string? Tr, string? En);

public static class GalleryTags
{
    public const string RoomPrefix = "room:";

    /// <summary>Kayıttaki etiketten görünen etiket. Oda silinmişse ya da yoksa null (etiketsiz sayılır).</summary>
    public static TagDto? ToDto(ApartmentMedia item, IReadOnlyDictionary<Guid, Room> rooms) => item.TagKind switch
    {
        GalleryTagKind.Room when item.RoomId is { } id && rooms.TryGetValue(id, out var room) =>
            new TagDto($"{RoomPrefix}{room.Id}", room.Name, RoomNames.RoomEn(room.Name)),
        GalleryTagKind.Area when GalleryAreas.Find(item.AreaKey) is { } area =>
            new TagDto(area.Key, area.Label.Tr, area.Label.En ?? area.Label.Tr),
        GalleryTagKind.Custom when item.CustomLabel is { } label =>
            new TagDto($"custom:{SlugHelper.From(label.Tr)}", label.Tr, string.IsNullOrWhiteSpace(label.En) ? label.Tr : label.En!),
        _ => null
    };

    /// <summary>Herkese açık galeride kategori (ikon/rozet): room | kitchen | bathroom | flat | other</summary>
    public static string Category(ApartmentMedia item, IReadOnlyDictionary<Guid, Room> rooms) => item.TagKind switch
    {
        GalleryTagKind.Room when item.RoomId is { } id && rooms.ContainsKey(id) => "room",
        GalleryTagKind.Area => GalleryAreas.Find(item.AreaKey)?.Category ?? "other",
        _ => "other"
    };

    /// <summary>Girişi doğrular ve kayda uygular. Oda etiketi yalnızca bu dairenin odalarından olabilir.</summary>
    public static void Apply(ApartmentMedia item, TagInput? input, ICollection<Guid> apartmentRoomIds, Validator validator, string field)
    {
        var key = input?.Key?.Trim();

        if (string.IsNullOrEmpty(key))
        {
            Set(item, GalleryTagKind.None);
            return;
        }

        if (key.StartsWith(RoomPrefix, StringComparison.Ordinal))
        {
            if (!Guid.TryParse(key[RoomPrefix.Length..], out var roomId) || !apartmentRoomIds.Contains(roomId))
            {
                validator.AddError(field, "Bu oda bu dairede değil.");
                return;
            }
            Set(item, GalleryTagKind.Room, roomId: roomId);
            return;
        }

        if (key == "custom" || key.StartsWith("custom:", StringComparison.Ordinal))
        {
            var tr = input!.Tr?.Trim() ?? "";
            var en = input.En?.Trim();
            if (tr.Length is 0 or > 60 || en?.Length > 60)
            {
                validator.AddError(field, "Özel etiketin Türkçe metnini yazın (en fazla 60 karakter).");
                return;
            }
            Set(item, GalleryTagKind.Custom, custom: new LocalizedText { Tr = tr, En = string.IsNullOrEmpty(en) ? null : en });
            return;
        }

        if (GalleryAreas.Find(key) is null)
        {
            validator.AddError(field, "Geçersiz etiket.");
            return;
        }
        Set(item, GalleryTagKind.Area, areaKey: key);
    }

    private static void Set(ApartmentMedia item, GalleryTagKind kind, Guid? roomId = null, string? areaKey = null, LocalizedText? custom = null)
    {
        item.TagKind = kind;
        item.RoomId = roomId;
        item.AreaKey = areaKey;
        item.CustomLabel = custom;
    }
}
