import ApartmentTypesView from "@/components/admin/structure/ApartmentTypesView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Daire Türleri" };

export default async function Page() {
    const { period } = await getAdminContext();
    const apartmentTypes = await adminGet("/apartment-types", { periodId: period.id });
    return <ApartmentTypesView apartmentTypes={apartmentTypes} />;
}
