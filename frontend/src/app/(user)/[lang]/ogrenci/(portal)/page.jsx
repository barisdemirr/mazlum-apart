import SummaryView from "@/components/portal/summary/SummaryView";
import { buildLedger } from "@/lib/ledger";
import { settle } from "@/lib/api";
import { getStudentPayments, getStudentProfile } from "@/services";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    return { title: getDictionary(lang).studentPortal.nav.summary };
}

export default async function SummaryPage() {
    const [student, payments] = await Promise.all([getStudentProfile(), settle(getStudentPayments(), null)]);
    if (!payments.data) return null;

    const ledger = buildLedger({ charges: payments.data.charges, payments: payments.data.payments });
    return <SummaryView student={student} ledger={ledger} period={payments.data.period} />;
}
