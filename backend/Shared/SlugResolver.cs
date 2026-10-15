namespace MazlumApart.Shared;

public record SlugPlan(string? Slug, bool IsExplicit);

public static class SlugResolver
{
    // 1. adım (senkron): slug'ın biçimini doğrular, hataları validator'a ekler.
    // Verilmişse onu, güncellemede boşsa mevcut olanı, yeni kayıtta boşsa isimden üretileni kullanır.
    public static SlugPlan Plan(string? requested, string? currentSlug, string? name, Validator validator)
    {
        var explicitSlug = requested?.Trim().ToLowerInvariant();

        if (!string.IsNullOrWhiteSpace(explicitSlug))
        {
            if (explicitSlug.Length > 100 || !SlugHelper.IsValid(explicitSlug))
            {
                validator.AddError("slug",
                    "slug sadece küçük harf, rakam ve tire içerebilir (örn: iki-kisilik-oda), en fazla 100 karakter.");
                return new SlugPlan(null, true);
            }

            return new SlugPlan(explicitSlug, true);
        }

        if (currentSlug is not null) return new SlugPlan(currentSlug, false);

        var generated = SlugHelper.From(name);
        if (generated.Length == 0)
        {
            validator.AddError("slug", "Slug isimden üretilemedi, elle girin.");
            return new SlugPlan(null, false);
        }

        return new SlugPlan(generated, false);
    }

    // 2. adım (doğrulama başarılıysa): elle verilen slug başkasında varsa çakışma döner,
    // otomatik üretilen yeni kayıt slug'ı -2, -3... ekiyle benzersiz yapılır.
    // exists: slug başka bir kayıtta var mı? (düzenlenen kaydı hariç tutar)
    public static async Task<(string Slug, Error? Conflict)> EnsureUniqueAsync(
        SlugPlan plan, bool isNewRecord, Func<string, Task<bool>> exists)
    {
        var slug = plan.Slug!;

        if (plan.IsExplicit)
        {
            return await exists(slug)
                ? (slug, Error.Conflict($"'{slug}' adresi zaten kullanılıyor."))
                : (slug, null);
        }

        if (!isNewRecord) return (slug, null); // mevcut slug korunuyor

        var candidate = slug;
        var n = 2;
        while (await exists(candidate))
            candidate = $"{slug}-{n++}";

        return (candidate, null);
    }
}