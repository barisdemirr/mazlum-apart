using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Shared;

namespace MazlumApart.Infrastructure.Database;

/// <summary>
/// Sabit anahtarlı içerikleri bir kez oluşturur (yoksa): sabit sayfalar, mesaj şablonları, site ayarları satırı,
/// gider kategorileri ve ilk nakit kasa.
/// Var olanlara DOKUNMAZ; yönetici panelden düzenledikten sonra yeniden başlatmak içeriği ezmez.
/// Tek istisna: Hakkımızda metni BOŞSA örnek metin konur (panelde metin boş bırakılamaz, yani yönetici metnini asla ezmez).
/// </summary>
public static class ContentSeeder
{
    private static readonly (string Key, string Tr, string En)[] Pages =
    [
        ("about", "Hakkımızda", "About us"),
        ("kvkk", "KVKK Aydınlatma Metni", "Privacy Notice")
    ];

    /// <summary>
    /// Hakkımızda örnek metni: düz yazı, boş satır paragraf ayırır (site öyle gösterir). Yönetici panelden değiştirir.
    /// Yalnızca sitede zaten yazan bilgilere dayanır (kız öğrencilere özel, faturalar dahil, 1 Eylül – 30 Haziran, online başvuru, öğrenci portalı).
    /// </summary>
    private static readonly LocalizedText AboutSample = new()
    {
        Tr = """
            Mazlum Apart, Trabzon'da üniversite okuyan kız öğrenciler için kurulmuş bir öğrenci apartıdır. Amacımız; ailesinden uzakta okuyan her öğrencinin kendini güvende ve evinde hissettiği, derslerine huzurla odaklanabildiği bir yaşam alanı sunmak.

            Apartımızda yalnızca kız öğrenciler konaklar. Tüm faturalar kira fiyatına dahildir; ay sonunda sürpriz bir ödemeyle karşılaşmazsın. Konaklama dönemimiz akademik takvime uygun olarak 1 Eylül'de başlar, 30 Haziran'da sona erer.

            Odalarımızı fotoğraf ve videolarıyla inceleyebilir, başvurunu birkaç dakikada online yapabilirsin. Kayıtlı öğrencilerimiz öğrenci portalından ödeme planlarını takip eder, arıza kaydı oluşturup durumunu anlık izler.

            Her öğrencimizi ailemizin bir parçası olarak görüyoruz. Sorularını yanıtlamak ve sana en uygun odayı birlikte seçmek için her zaman buradayız.
            """,
        En = """
            Mazlum Apart is a student residence in Trabzon built for female university students. Our goal is to offer every student studying away from home a place where she feels safe and at home, and can focus on her studies in peace.

            Only female students stay at our residence. All bills are included in the rent, so there are no surprise payments at the end of the month. Our accommodation term follows the academic calendar, starting on 1 September and ending on 30 June.

            You can explore our rooms with photos and videos and apply online in a few minutes. Registered students use the student portal to follow their payment plan, report maintenance issues and track their status in real time.

            We see every student as part of our family. We are always here to answer your questions and help you choose the room that suits you best.
            """
    };

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
        ("payment_received", "Ödeme alındı (otomatik SMS)",
            "Sevgili {ad}, {tarih} tarihli {tutar} tutarındaki ödemeniz alınmıştır. Teşekkür ederiz.",
            "Dear {ad}, your payment of {tutar} dated {tarih} has been received. Thank you."),
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
        ("Diğer", null),
        ("Maaş", null),
        ("Reklam", null),
        ("Tadilat", null)
    ];

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (!await db.Database.CanConnectAsync()) return;
        if ((await db.Database.GetPendingMigrationsAsync()).Any()) return;

        var pageKeys = await db.StaticPages.IgnoreQueryFilters().Select(x => x.Key).ToListAsync();
        foreach (var (key, tr, en) in Pages.Where(p => !pageKeys.Contains(p.Key)))
            db.StaticPages.Add(new StaticPage { Key = key, Title = new LocalizedText { Tr = tr, En = en }, Body = key == "about" ? AboutSample : null });

        // Var olan Hakkımızda sayfasının metni boşsa örnek metin konur
        var about = await db.StaticPages.FirstOrDefaultAsync(x => x.Key == "about");
        if (about is not null && about.Body.IsBlank()) about.Body = AboutSample;

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
