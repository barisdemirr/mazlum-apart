import { requireSession, readSelectedPeriodId } from "@/lib/admin/server";
import AdminDataProvider from "@/components/admin/data/AdminDataProvider";
import AdminShell from "./AdminShell";

export default async function DashboardLayout({ children }) {
    const { payload } = await requireSession();

    const user = {
        name: payload.name || "Yönetici",
        email: payload.email || "",
    };

    return (
        <AdminDataProvider user={user} initialPeriodId={await readSelectedPeriodId()}>
            <AdminShell user={user}>{children}</AdminShell>
        </AdminDataProvider>
    );
}
