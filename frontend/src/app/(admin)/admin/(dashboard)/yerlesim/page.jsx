import OccupancyView from "@/components/admin/registration/OccupancyView";
import { adaptRow } from "@/lib/admin/adapters";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Yerleşim & Doluluk" };

const isDay = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function OccupancyPage({ searchParams }) {
    const { period } = await getAdminContext();
    const { day } = await searchParams;
    const [occupancy, enrollments] = await Promise.all([
        adminGet("/occupancy", { periodId: period.id, day: isDay(day) ? day : undefined }),
        adminGet("/enrollments", { periodId: period.id, status: "approved" }),
    ]);
    // Onaylı ama odası olmayan kayıtlar (yerleşmeyi bekleyenler)
    const waiting = enrollments.filter((e) => !e.room).map(adaptRow);
    return <OccupancyView occupancy={occupancy} waiting={waiting} />;
}
