import RenewalView from "@/components/portal/renewal/RenewalView";
import { getStudentRenewal } from "@/services/studentData";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    return { title: getDictionary(lang).studentPortal.nav.renewal };
}

export default async function RenewalPage() {
    const data = await getStudentRenewal();
    return <RenewalView data={data} />;
}
