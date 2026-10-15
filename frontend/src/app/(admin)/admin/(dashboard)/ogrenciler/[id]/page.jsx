import { notFound } from "next/navigation";
import StudentDetailView from "@/components/admin/registration/StudentDetailView";
import { adminGet, adminGetOrNull } from "@/lib/admin/data";

export const metadata = { title: "Öğrenci" };

export default async function StudentDetailPage({ params }) {
    const { id } = await params;
    const detail = await adminGetOrNull(`/enrollments/${id}`);
    if (!detail) notFound();

    const periodId = detail.enrollment.periodId;
    const [contacts, maintenance] = await Promise.all([
        adminGet("/contacts", { periodId, enrollmentId: id }),
        adminGet("/maintenance", { periodId }),
    ]);
    return <StudentDetailView detail={detail} contacts={contacts} maintenance={maintenance.filter((m) => m.enrollmentId === id)} />;
}
