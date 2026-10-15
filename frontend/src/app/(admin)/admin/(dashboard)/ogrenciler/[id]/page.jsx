import StudentDetailView from "@/components/admin/registration/StudentDetailView";

export const metadata = { title: "Öğrenci" };

export default async function StudentDetailPage({ params }) {
    const { id } = await params;
    return <StudentDetailView enrollmentId={id} />;
}
