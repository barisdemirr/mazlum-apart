import SummaryView from "@/components/portal/summary/SummaryView";
import { getStudentLedger, getStudentProfile } from "@/services/studentData";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    return { title: getDictionary(lang).studentPortal.nav.summary };
}

export default async function SummaryPage() {
    const [student, { ledger, period }] = await Promise.all([getStudentProfile(), getStudentLedger()]);
    return <SummaryView student={student} ledger={ledger} period={period} />;
}
