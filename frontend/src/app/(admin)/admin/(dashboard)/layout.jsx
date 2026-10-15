import { requireSession } from "@/lib/admin/server";
import { getAdminContext } from "@/lib/admin/data";
import AdminDataProvider from "@/components/admin/data/AdminDataProvider";
import FirstPeriod from "@/components/admin/periods/FirstPeriod";
import AdminShell from "./AdminShell";

export default async function DashboardLayout({ children }) {
    const { payload } = await requireSession();
    const { periods, period, badges, today } = await getAdminContext();

    const user = {
        id: payload.sub,
        name: payload.name || "Yönetici",
        email: payload.email || "",
    };

    return (
        <AdminDataProvider user={user} periods={periods} period={period} badges={badges} today={today}>
            <AdminShell user={user}>{period ? children : <FirstPeriod />}</AdminShell>
        </AdminDataProvider>
    );
}
