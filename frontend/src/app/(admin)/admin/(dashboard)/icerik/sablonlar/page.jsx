import TemplatesView from "@/components/admin/content/TemplatesView";
import { adminGet } from "@/lib/admin/data";

export const metadata = { title: "Mesaj Şablonları" };

export default async function Page() {
    return <TemplatesView templates={await adminGet("/message-templates")} />;
}
