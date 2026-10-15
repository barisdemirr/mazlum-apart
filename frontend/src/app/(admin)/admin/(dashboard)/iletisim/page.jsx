import ContactsView from "@/components/admin/support/ContactsView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "İletişim Geçmişi" };

export default async function Page() {
    const { period } = await getAdminContext();
    return <ContactsView items={await adminGet("/contacts", { periodId: period.id })} />;
}
