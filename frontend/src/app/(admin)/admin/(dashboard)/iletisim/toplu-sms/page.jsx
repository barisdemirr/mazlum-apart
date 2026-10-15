import BulkSmsView from "@/components/admin/support/BulkSmsView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Toplu SMS" };

export default async function Page() {
    const { period } = await getAdminContext();
    const [enrollments, status] = await Promise.all([adminGet("/enrollments", { periodId: period.id }), adminGet("/sms/status")]);
    return <BulkSmsView enrollments={enrollments} status={status} />;
}
