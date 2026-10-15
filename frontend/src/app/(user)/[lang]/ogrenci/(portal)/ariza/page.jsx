import PageHeader from "@/components/portal/PageHeader";
import ComingSoon from "@/components/portal/ComingSoon";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    return { title: getDictionary(lang).studentPortal.nav.maintenance };
}

export default async function Page({ params }) {
    const { lang } = await params;
    const t = getDictionary(lang).studentPortal;

    return (
        <>
            <PageHeader title={t.nav.maintenance} />
            <ComingSoon />
        </>
    );
}
