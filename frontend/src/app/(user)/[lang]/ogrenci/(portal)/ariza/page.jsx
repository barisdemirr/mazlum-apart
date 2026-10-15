import MaintenanceView from "@/components/portal/maintenance/MaintenanceView";
import { settle } from "@/lib/api";
import { getMaintenanceRequests } from "@/services";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    return { title: getDictionary(lang).studentPortal.nav.maintenance };
}

export default async function MaintenancePage() {
    const requests = await settle(getMaintenanceRequests(), []);
    return <MaintenanceView initial={requests.data} />;
}
