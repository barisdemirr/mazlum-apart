/**
 * Panel menüsü. Yeni sayfa eklerken sadece burayı güncelle.
 * Bölüm adları Stitch tasarımındaki gruplarla aynıdır.
 * badge: kenar çubuğunda sayaç gösterilecek anahtar (veriden hesaplanır).
 */
export const NAV_GROUPS = [
    {
        key: "genel",
        label: "Genel",
        items: [{ href: "/admin", label: "Ana Panel", icon: "dashboard", exact: true }],
    },
    {
        key: "kayit",
        label: "Öğrenci & Yerleşim",
        items: [
            { href: "/admin/basvurular", label: "Başvurular", icon: "assignment_ind", badge: "newApplications" },
            { href: "/admin/on-basvurular", label: "Ön Başvurular", icon: "notifications_active", badge: "newPreRegistrations" },
            { href: "/admin/ogrenciler", label: "Öğrenciler", icon: "school" },
            { href: "/admin/indirim-kodlari", label: "İndirim Kodları", icon: "sell" },
            { href: "/admin/yerlesim", label: "Yerleşim & Doluluk", icon: "domain_verification" },
        ],
    },
    {
        key: "finans",
        label: "Finans",
        items: [
            { href: "/admin/hesaplar", label: "Öğrenci Hesapları", icon: "manage_accounts" },
            { href: "/admin/tahsilatlar", label: "Tahsilatlar", icon: "payments" },
            { href: "/admin/kasa-banka", label: "Kasa & Banka", icon: "account_balance" },
            { href: "/admin/giderler", label: "Giderler", icon: "receipt_long" },
            { href: "/admin/faturalar", label: "Faturalar", icon: "description", badge: "dueBills" },
            { href: "/admin/raporlar", label: "Raporlar", icon: "analytics" },
        ],
    },
    {
        key: "operasyon",
        label: "Operasyon & Yapı",
        items: [
            { href: "/admin/ariza", label: "Arıza Kayıtları", icon: "build", badge: "openMaintenance" },
            { href: "/admin/iletisim", label: "İletişim Geçmişi", icon: "forum" },
            { href: "/admin/oda-tipleri", label: "Oda Tipleri", icon: "meeting_room" },
            { href: "/admin/daireler", label: "Daireler & Odalar", icon: "holiday_village" },
        ],
    },
    {
        key: "yonetim",
        label: "Yönetim",
        items: [
            { href: "/admin/donemler", label: "Dönemler & Fiyatlar", icon: "date_range" },
            { href: "/admin/icerik", label: "İçerik & Site", icon: "web" },
            { href: "/admin/sistem", label: "Yöneticiler & Sistem", icon: "admin_panel_settings" },
        ],
    },
];

export const isActiveItem = (item, pathname) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

/** Başlıktaki yol: hangi bölüm ve sayfa */
export function findNavItem(pathname) {
    for (const group of NAV_GROUPS) {
        const item = group.items.find((i) => isActiveItem(i, pathname));
        if (item) return { group: group.label, item };
    }
    return null;
}
