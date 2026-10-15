import PageHeader from "@/components/portal/PageHeader";
import ComingSoon from "@/components/portal/ComingSoon";
import { getStudentProfile } from "@/services/student";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { interpolate } from "@/lib/i18n/dictionaries";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    return { title: getDictionary(lang).studentPortal.nav.summary };
}

export default async function SummaryPage({ params }) {
    const { lang } = await params;
    const t = getDictionary(lang).studentPortal;
    const student = await getStudentProfile();

    return (
        <>
            <PageHeader title={interpolate(t.shell.greeting, { name: student.firstName })} />
            <ComingSoon />
        </>
    );
}
