import PaymentsView from "@/components/portal/payments/PaymentsView";
import { getStudentLedger } from "@/services/studentData";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    return { title: getDictionary(lang).studentPortal.nav.payments };
}

export default async function PaymentsPage() {
    const { ledger, period, bank } = await getStudentLedger();
    return <PaymentsView ledger={ledger} period={period} bank={bank} />;
}
