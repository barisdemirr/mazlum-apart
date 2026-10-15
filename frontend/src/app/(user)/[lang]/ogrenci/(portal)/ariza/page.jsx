import MaintenanceView from "@/components/portal/maintenance/MaintenanceView";
import { getMaintenanceRequests } from "@/services/studentData";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    return { title: getDictionary(lang).studentPortal.nav.maintenance };
}

export default async function MaintenancePage() {
    return <MaintenanceView initial={await getMaintenanceRequests()} />;
}
