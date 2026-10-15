import { PageHeader } from "@/components/admin/ui";
import SectionTabs from "@/components/admin/SectionTabs";

const TABS = [
    { href: "/admin/iletisim", label: "İletişim Geçmişi", icon: "forum" },
    { href: "/admin/iletisim/toplu-sms", label: "Toplu SMS", icon: "sms" },
];

export default function ContactLayout({ children }) {
    return (
        <div>
            <PageHeader title="İletişim" description="Öğrencilerle yapılan tüm yazışmalar ve toplu SMS gönderimi." />
            <SectionTabs tabs={TABS} />
            {children}
        </div>
    );
}
