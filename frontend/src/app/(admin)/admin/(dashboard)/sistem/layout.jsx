import { PageHeader } from "@/components/admin/ui";
import SectionTabs from "@/components/admin/SectionTabs";

const TABS = [
    { href: "/admin/sistem", label: "Yöneticiler", icon: "admin_panel_settings" },
    { href: "/admin/sistem/islem-gecmisi", label: "İşlem Geçmişi", icon: "history" },
    { href: "/admin/sistem/profil", label: "Profilim", icon: "account_circle" },
];

export default function SystemLayout({ children }) {
    return (
        <div>
            <PageHeader title="Yöneticiler & Sistem" description="Yöneticiler, işlem geçmişi ve kendi hesabınız." />
            <SectionTabs tabs={TABS} />
            {children}
        </div>
    );
}
