import StudentsView from "@/components/admin/registration/StudentsView";
import { adminGet, getAdminContext } from "@/lib/admin/data";

export const metadata = { title: "Öğrenciler" };

export default async function StudentsPage() {
    const { period } = await getAdminContext();
    const [enrollments, roomTypes] = await Promise.all([
        adminGet("/enrollments", { periodId: period.id }),
        adminGet("/room-types", { periodId: period.id }),
    ]);
    return <StudentsView enrollments={enrollments} roomTypes={roomTypes} />;
}
