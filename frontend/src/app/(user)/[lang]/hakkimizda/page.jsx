import AboutView from "@/components/about/AboutView";
import { getPage, getRoomTypes } from "@/services";
import { settle } from "@/lib/api";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    const t = getDictionary(lang);
    return { title: t.aboutPage.metaTitle, description: t.aboutPage.metaDescription };
}

/** Hakkımızda: metin yönetim panelinden (İçerik > Hakkımızda), görseller oda tiplerinin kapak fotoğraflarından */
export default async function AboutPage() {
    const [page, rooms] = await Promise.all([settle(getPage("about"), null), settle(getRoomTypes(), [])]);
    const images = (rooms.data ?? []).map((room) => room.image).filter((image) => image?.url);
    return <AboutView page={page.data} images={images.slice(0, 8)} />;
}
