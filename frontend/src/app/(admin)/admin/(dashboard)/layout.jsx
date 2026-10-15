import { requireSession, readSelectedPeriodId } from "@/lib/admin/server";
import { getPeriods, pickPeriod } from "@/services/admin/periods";
import AdminShell from "./AdminShell";

export default async function DashboardLayout({ children }) {
    const { payload } = await requireSession();
    const periods = await getPeriods();
    const selected = pickPeriod(periods, await readSelectedPeriodId());

    const user = {
        name: payload.name || "Yönetici",
        email: payload.email || "",
    };

    return (
        <AdminShell user={user} periods={periods} selectedId={selected.id}>
            {children}
        </AdminShell>
    );
}
