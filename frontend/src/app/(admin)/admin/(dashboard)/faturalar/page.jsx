import BillsView from "@/components/admin/accounting/BillsView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Faturalar" };

export default async function Page() {
    const { period } = await getAdminContext();
    // Önce faturalar: bu çağrı eksik aylık abonelik kayıtlarını üretir, sonra abonelik listesi (bekleyen sayıları) okunur
    const data = await adminGet("/bills", { periodId: period.id });
    const [accounts, subscriptions] = await Promise.all([adminGet("/accounts"), adminGet("/bill-subscriptions")]);
    return <BillsView data={data} accounts={accounts.filter((a) => a.active)} subscriptions={subscriptions} />;
}
