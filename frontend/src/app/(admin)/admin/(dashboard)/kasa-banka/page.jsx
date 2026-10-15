import CashBankView from "@/components/admin/accounting/CashBankView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Kasa & Banka" };

export default async function Page() {
    const { period } = await getAdminContext();
    return <CashBankView data={await adminGet("/cash-bank", { periodId: period.id })} />;
}
