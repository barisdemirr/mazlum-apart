import ContactView from "@/components/contact/ContactView";
import { getMapImage } from "@/services";
import { settle } from "@/lib/api";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    const t = getDictionary(lang);
    return { title: t.contactPage.metaTitle, description: t.contactPage.metaDescription };
}

/** İletişim: telefon, WhatsApp, e-posta, Instagram, adres ve harita yönetim panelindeki Site Ayarları'ndan gelir */
export default async function ContactPage() {
    const map = await settle(getMapImage(), "");
    return <ContactView mapImage={map.data ?? ""} />;
}
