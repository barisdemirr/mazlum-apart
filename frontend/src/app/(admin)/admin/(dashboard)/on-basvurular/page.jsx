import PreRegistrationsView from "@/components/admin/registration/PreRegistrationsView";
import { adminGet } from "@/lib/admin/data";

export const metadata = { title: "Ön Başvurular" };

/** Ön başvurular dönemden bağımsızdır (yeni dönem fiyatları açıklanmadan önce toplanır) */
export default async function Page() {
    const [items, settings, roomTypes, smsStatus] = await Promise.all([
        adminGet("/pre-registrations"),
        adminGet("/pre-registrations/settings"),
        adminGet("/room-types"),
        adminGet("/sms/status").catch(() => null),
    ]);
    return <PreRegistrationsView items={items} settings={settings} roomTypes={roomTypes} smsStatus={smsStatus} />;
}
