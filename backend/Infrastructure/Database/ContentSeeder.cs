using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Infrastructure.Database;

/// <summary>
/// Sabit anahtarlı içerikleri bir kez oluşturur (yoksa): sabit sayfalar, mesaj şablonları, site ayarları satırı,
/// gider kategorileri ve ilk nakit kasa.
/// Var olanlara DOKUNMAZ; yönetici panelden düzenledikten sonra yeniden başlatmak içeriği ezmez.
/// </summary>
public static class ContentSeeder
{
    private static readonly (string Key, string Tr, string En)[] Pages =
    [
        ("about", "Hakkımızda", "About us"),
        ("contact", "İletişim", "Contact"),
        ("kvkk", "KVKK Aydınlatma Metni", "Privacy Notice")
    ];

    private static readonly (string Key, string Name, string Tr, string En)[] Templates =
    [
        ("payment_reminder", "Ödeme hatırlatma",
            "Merhaba {ad}, {oda} için {kalem} ({tutar}) {vade} tarihinde ödenmelidir. Ödemeyi yaptıktan sonra bize bilgi verirseniz seviniriz.",
            "Hello {ad}, your {kalem} ({tutar}) for {oda} is due on {vade}. Please let us know once you have paid."),
        ("payment_overdue", "Geciken ödeme",
            "Merhaba {ad}, {kalem} ödemenizin vadesi {vade} tarihinde geçti. Kalan tutar: {tutar}. Ödeme yaptıysanız lütfen dekontu paylaşın.",
            "Hello {ad}, your {kalem} payment was due on {vade}. Remaining amount: {tutar}. If you have already paid, please share the receipt."),
        ("application_received", "Başvuru alındı",
            "Merhaba {ad}, başvurunuz bize ulaştı. İnceleyip size dönüş yapacağız.",
            "Hello {ad}, we have received your application and will get back to you shortly."),
        ("maintenance_update", "Arıza durumu",
            "Merhaba {ad}, “{konu}” arıza kaydınızın durumu: {durum}.",
            "Hello {ad}, the status of your maintenance request “{konu}” is: {durum}."),
        ("enrollment_approved", "Kayıt onayı ve giriş bilgisi",
            "Merhaba {ad}, kaydınız onaylandı. Öğrenci alanı giriş bilgileriniz: telefon {telefon}, şifre {sifre}.",
            "Hello {ad}, your registration is confirmed. Your student area login: phone {telefon}, password {sifre}.")
    ];

    private static readonly (string Name, string? SystemKey)[] Categories =
    [
        ("Bakım & Onarım", null),
        ("Temizlik", null),
        ("Malzeme", null),
        ("Vergi & Harç", null),
        ("Faturalar", ExpenseCategoryKeys.Bills),
        ("Diğer", null)
    ];

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (!await db.Database.CanConnectAsync()) return;
        if ((await db.Database.GetPendingMigrationsAsync()).Any()) return;

        var pageKeys = await db.StaticPages.IgnoreQueryFilters().Select(x => x.Key).ToListAsync();
        foreach (var (key, tr, en) in Pages.Where(p => !pageKeys.Contains(p.Key)))
            db.StaticPages.Add(new StaticPage { Key = key, Title = new LocalizedText { Tr = tr, En = en } });

        var templateKeys = await db.MessageTemplates.IgnoreQueryFilters().Select(x => x.Key).ToListAsync();
        foreach (var (key, name, tr, en) in Templates.Where(t => !templateKeys.Contains(t.Key)))
            db.MessageTemplates.Add(new MessageTemplate { Key = key, Name = name, BodyTr = tr, BodyEn = en });

        if (!await db.SiteSettings.IgnoreQueryFilters().AnyAsync(x => x.Id == SiteSetting.SingletonId))
            db.SiteSettings.Add(new SiteSetting { Id = SiteSetting.SingletonId });

        // Gider kategorileri (aşama 5): "Faturalar" sistem kategorisidir, fatura ödemeleri buraya düşer
        var categoryNames = await db.ExpenseCategories.IgnoreQueryFilters().Select(x => x.Name).ToListAsync();
        var order = 0;
        foreach (var (name, systemKey) in Categories)
        {
            order++;
            if (!categoryNames.Contains(name))
                db.ExpenseCategories.Add(new ExpenseCategory { Name = name, SystemKey = systemKey, OrderIndex = order });
        }

        // Hiç kasa/banka hesabı yoksa bir nakit kasa açılır; banka hesapları panelden eklenir
        if (!await db.Accounts.IgnoreQueryFilters().AnyAsync())
            db.Accounts.Add(new Account { Type = AccountType.Cash, Name = "Nakit Kasa" });

        await db.SaveChangesAsync();
    }
}
