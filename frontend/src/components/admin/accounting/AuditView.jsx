"use client";

import { useRouter } from "next/navigation";
import { Card, PageHeader } from "@/components/admin/ui";
import { turkeyDate } from "@/lib/format";
import { AUDIT_ACTION, date } from "@/lib/admin/labels";

/** İşlem geçmişi: kim, ne zaman, ne yaptı. Kayıtlar değiştirilemez ve silinemez. */
export default function AuditView({ audit }) {
    const router = useRouter();
    const pages = Math.max(1, Math.ceil(audit.total / audit.pageSize));
    const go = (p) => router.push(`/admin/sistem/islem-gecmisi?page=${p}`);
    return (
        <div>
            <PageHeader title="İşlem Geçmişi" description={`${audit.total} kayıt`} />
            <Card padded={false}><div className="ad-scroll overflow-x-auto"><table className="ad-table">
                <thead><tr><th>Zaman</th><th>Kim</th><th>İşlem</th><th>Not</th></tr></thead>
                <tbody>{audit.items.map((a) => (
                    <tr key={a.id}><td className="ad-num whitespace-nowrap">{date(turkeyDate(a.at))} {new Date(a.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}</td><td>{a.by}</td><td className="font-semibold">{AUDIT_ACTION[a.action] ?? a.action}</td><td className="text-xs text-ad-muted">{a.note ?? a.entity}</td></tr>
                ))}</tbody>
            </table></div></Card>
            {pages > 1 && <div className="mt-5 flex items-center justify-center gap-3 text-sm"><button type="button" className="ad-btn ad-btn-outline ad-btn-sm" disabled={audit.page <= 1} onClick={() => go(audit.page - 1)}>Önceki</button><span className="ad-num text-ad-muted">{audit.page} / {pages}</span><button type="button" className="ad-btn ad-btn-outline ad-btn-sm" disabled={audit.page >= pages} onClick={() => go(audit.page + 1)}>Sonraki</button></div>}
        </div>
    );
}
