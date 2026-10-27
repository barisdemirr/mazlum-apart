import DeparturesView from "@/components/portal/departures/DeparturesView";
import { getStudentDepartures } from "@/services/studentData";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    return { title: getDictionary(lang).studentPortal.nav.departures };
}

export default async function DeparturesPage() {
    const initial = await getStudentDepartures();
    return <DeparturesView initial={initial} />;
}
