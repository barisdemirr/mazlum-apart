import AccountsView from "@/components/admin/accounting/AccountsView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Öğrenci Hesapları" };

export default async function Page() {
    const { period } = await getAdminContext();
    return <AccountsView enrollments={await adminGet("/enrollments", { periodId: period.id })} />;
}
