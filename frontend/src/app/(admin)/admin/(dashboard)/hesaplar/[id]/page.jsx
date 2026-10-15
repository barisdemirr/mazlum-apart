import { notFound } from "next/navigation";
import StudentAccountView from "@/components/admin/accounting/StudentAccountView";
import { adminGet, adminGetOrNull } from "@/lib/admin/data";

export const metadata = { title: "Öğrenci Hesabı" };

export default async function Page({ params }) {
    const { id } = await params;
    const [account, accounts] = await Promise.all([adminGetOrNull(`/enrollments/${id}/account`), adminGet("/accounts")]);
    if (!account) notFound();
    return <StudentAccountView account={account} accounts={accounts.filter((a) => a.active)} />;
}
