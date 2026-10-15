import PaymentsView from "@/components/admin/accounting/PaymentsView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Tahsilatlar" };

export default async function Page() {
    const { period } = await getAdminContext();
    return <PaymentsView data={await adminGet("/payments", { periodId: period.id })} />;
}
