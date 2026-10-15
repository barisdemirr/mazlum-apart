import SettingsView from "@/components/admin/content/SettingsView";
import { adminGet } from "@/lib/admin/data";

export const metadata = { title: "Site Ayarları" };

export default async function Page() {
    return <SettingsView settings={await adminGet("/site-settings")} />;
}
