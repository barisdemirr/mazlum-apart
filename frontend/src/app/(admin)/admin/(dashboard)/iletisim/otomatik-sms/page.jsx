import AutoSmsView from "@/components/admin/support/AutoSmsView";
import { adminGet } from "@/lib/admin/data";

export const metadata = { title: "Otomatik SMS" };

export default async function Page() {
    return <AutoSmsView items={await adminGet("/sms/auto")} />;
}
