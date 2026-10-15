import BillsView from "@/components/admin/accounting/BillsView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Faturalar" };

export default async function Page() {
    const { period } = await getAdminContext();
    const [data, accounts] = await Promise.all([adminGet("/bills", { periodId: period.id }), adminGet("/accounts")]);
    return <BillsView data={data} accounts={accounts.filter((a) => a.active)} />;
}
