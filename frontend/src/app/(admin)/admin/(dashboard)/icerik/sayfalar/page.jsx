import PagesView from "@/components/admin/content/PagesView";
import { adminGet } from "@/lib/admin/data";

export const metadata = { title: "Sayfalar" };

export default async function Page() {
    return <PagesView pages={await adminGet("/pages")} />;
}
