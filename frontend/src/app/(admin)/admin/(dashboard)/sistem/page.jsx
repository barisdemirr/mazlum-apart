import AdminsView from "@/components/admin/system/AdminsView";
import { adminGet } from "@/lib/admin/data";

export const metadata = { title: "Yöneticiler" };

export default async function Page() {
    return <AdminsView users={await adminGet("/users")} />;
}
