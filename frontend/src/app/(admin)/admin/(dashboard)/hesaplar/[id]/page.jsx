import StudentAccountView from "@/components/admin/accounting/StudentAccountView";

export const metadata = { title: "Öğrenci Hesabı" };

export default async function StudentAccountPage({ params }) {
    const { id } = await params;
    return <StudentAccountView enrollmentId={id} />;
}
