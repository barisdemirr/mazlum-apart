import { PageHeader } from "@/components/admin/ui";
import SectionTabs from "@/components/admin/SectionTabs";

const TABS = [
    { href: "/admin/icerik/medya", label: "Medya", icon: "photo_library" },
    { href: "/admin/icerik/slider", label: "Slider", icon: "slideshow" },
    { href: "/admin/icerik/sayfalar", label: "Sayfalar", icon: "article" },
    { href: "/admin/icerik/site-ayarlari", label: "Site Ayarları", icon: "tune" },
    { href: "/admin/icerik/sablonlar", label: "Mesaj Şablonları", icon: "chat" },
];

export default function ContentLayout({ children }) {
    return (
        <div>
            <PageHeader title="İçerik & Site" description="Tanıtım sitesinde görünen her şey buradan yönetilir. İçerik dönemden bağımsızdır." />
            <SectionTabs tabs={TABS} />
            {children}
        </div>
    );
}
