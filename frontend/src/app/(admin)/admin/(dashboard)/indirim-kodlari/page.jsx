import DiscountCodesView from "@/components/admin/registration/DiscountCodesView";
import { adminGet } from "@/lib/admin/data";

export const metadata = { title: "İndirim Kodları" };

/** İndirim kodları dönemden bağımsızdır (kayıt yenileyen eski öğrenciler için) */
export default async function Page() {
    const items = await adminGet("/discount-codes");
    return <DiscountCodesView items={items} />;
}
