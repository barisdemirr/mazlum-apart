import { PageHeader } from "@/components/admin/ui";
import SectionTabs from "@/components/admin/SectionTabs";

const TABS = [
    { href: "/admin/iletisim", label: "İletişim Geçmişi", icon: "forum" },
    { href: "/admin/iletisim/toplu-sms", label: "Toplu SMS", icon: "sms" },
    { href: "/admin/iletisim/otomatik-sms", label: "Otomatik SMS", icon: "schedule_send" },
    { href: "/admin/iletisim/bildirim", label: "Toplu Bildirim", icon: "notifications_active" },
];

export default function ContactLayout({ children }) {
    return (
        <div>
            <PageHeader title="İletişim" description="Öğrencilerle yapılan tüm yazışmalar; toplu SMS ve toplu bildirim gönderimi." />
            <SectionTabs tabs={TABS} />
            {children}
        </div>
    );
}
