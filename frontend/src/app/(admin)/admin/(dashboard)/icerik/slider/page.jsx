import SlidesView from "@/components/admin/content/SlidesView";
import { adminGet } from "@/lib/admin/data";

export const metadata = { title: "Slider" };

export default async function Page() {
    return <SlidesView slides={await adminGet("/slides")} />;
}
