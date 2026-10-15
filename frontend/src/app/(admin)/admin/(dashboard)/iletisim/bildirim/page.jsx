import BulkPushView from "@/components/admin/support/BulkPushView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Toplu Bildirim" };

export default async function Page() {
    const { period } = await getAdminContext();
    return <BulkPushView enrollments={await adminGet("/enrollments", { periodId: period.id })} />;
}
