import PaymentsView from "@/components/portal/payments/PaymentsView";
import { buildLedger } from "@/lib/ledger";
import { settle } from "@/lib/api";
import { getStudentPayments } from "@/services";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    return { title: getDictionary(lang).studentPortal.nav.payments };
}

export default async function PaymentsPage() {
    const payments = await settle(getStudentPayments(), null);
    if (!payments.data) return null;

    const { charges, payments: records, period, bank } = payments.data;
    return <PaymentsView ledger={buildLedger({ charges, payments: records })} period={period} bank={bank} />;
}
