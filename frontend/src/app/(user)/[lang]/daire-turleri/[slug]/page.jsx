import { notFound } from "next/navigation";
import ApartmentTypeBody from "@/components/apartment-type/ApartmentTypeBody";
import { getApartmentTypeBySlug } from "@/services";
import { localized } from "@/lib/i18n/localized";
import { mediaUrl } from "@/lib/media";

export async function generateMetadata({ params }) {
    const { lang, slug } = await params;
    const type = await getApartmentTypeBySlug(slug);
    if (!type) return {};

    const name = localized(type.name, lang);
    return { title: name, openGraph: type.image ? { title: name, images: [mediaUrl(type.image.url)] } : { title: name } };
}

export default async function ApartmentTypePage({ params }) {
    const { slug } = await params;
    const type = await getApartmentTypeBySlug(slug);
    if (!type) notFound();

    return (
        <main className="min-h-screen pb-24 lg:pb-0">
            <ApartmentTypeBody type={type} />
        </main>
    );
}
