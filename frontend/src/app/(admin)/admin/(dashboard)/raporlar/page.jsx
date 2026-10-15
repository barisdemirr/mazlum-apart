import ReportsView from "@/components/admin/support/ReportsView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Raporlar" };

const isDay = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function Page({ searchParams }) {
    const { period } = await getAdminContext();
    const { from, to } = await searchParams;
    const report = await adminGet("/reports/finance", { periodId: period.id, from: isDay(from) ? from : undefined, to: isDay(to) ? to : undefined });
    return <ReportsView report={report} />;
}
