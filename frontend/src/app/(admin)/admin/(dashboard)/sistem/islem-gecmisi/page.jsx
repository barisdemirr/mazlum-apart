import AuditView from "@/components/admin/accounting/AuditView";
import { adminGet } from "@/lib/admin/data";

export const metadata = { title: "İşlem Geçmişi" };

export default async function Page({ searchParams }) {
    const { page } = await searchParams;
    return <AuditView audit={await adminGet("/audit", { page: Math.max(1, Number.parseInt(page ?? "1", 10) || 1), pageSize: 50 })} />;
}
