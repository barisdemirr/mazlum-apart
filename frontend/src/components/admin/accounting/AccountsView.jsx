"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/admin/DataTable";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import { Avatar, Chips, PageHeader, StatusBadge } from "@/components/admin/ui";
import { adaptRow, describeCovered } from "@/lib/admin/adapters";
import { ENROLLMENT_STATUS, PAY_STATUS, money } from "@/lib/admin/labels";

/** Öğrenci hesapları: kim ne kadar ödedi, kim ne kadar borçlu. Satıra tıklayınca hesap ekstresi açılır. */
export default function AccountsView({ enrollments }) {
    const router = useRouter();
    const [tab, setTab] = useState("debt");
    const all = useMemo(() => enrollments.map(adaptRow), [enrollments]);
    const live = (r) => !["cancelled", "left"].includes(r.enrollment.status);
    const rows = all.filter((r) => (tab === "debt" ? live(r) && r.summary.remaining > 0 : tab === "overdue" ? r.summary.status === "overdue" : tab === "advance" ? r.summary.advance > 0 : true));
    const count = (f) => all.filter(f).length;

    const columns = [
        { key: "name", header: "Öğrenci", sort: (r) => r.student.lastName, render: (r) => <div className="flex items-center gap-2.5"><Avatar name={`${r.student.firstName} ${r.student.lastName}`} /><div className="min-w-0"><div className="truncate font-bold">{r.student.firstName} {r.student.lastName}</div><div className="text-[11px] text-ad-muted">{r.room?.label ?? "Yerleşmedi"}</div></div></div>, export: { value: (r) => `${r.student.firstName} ${r.student.lastName}`, width: 24 } },
        { key: "status", header: "Kayıt", render: (r) => <StatusBadge map={ENROLLMENT_STATUS} value={r.enrollment.status} />, export: { value: (r) => ENROLLMENT_STATUS[r.enrollment.status].label } },
        { key: "covered", header: "Ödenen süre", render: (r) => <span className="block min-w-44 text-xs">{describeCovered(r.summary.covered, money)}</span>, export: { value: (r) => describeCovered(r.summary.covered, money), width: 40 } },
        { key: "charged", header: "Toplam borç", align: "end", sort: (r) => r.summary.charged, render: (r) => <span className="ad-num">{money(r.summary.charged)}</span>, export: { type: "money", value: (r) => r.summary.charged } },
        { key: "paid", header: "Ödenen", align: "end", sort: (r) => r.summary.allocated, render: (r) => <span className="ad-num text-ad-ok">{money(r.summary.allocated)}</span>, export: { type: "money", value: (r) => r.summary.allocated } },
        { key: "remaining", header: "Kalan", align: "end", sort: (r) => r.summary.remaining, render: (r) => <span className={`ad-num font-bold ${r.summary.overdue > 0 ? "text-ad-danger" : ""}`}>{money(r.summary.remaining)}</span>, export: { type: "money", value: (r) => r.summary.remaining } },
        { key: "pay", header: "Durum", render: (r) => <StatusBadge map={PAY_STATUS} value={r.summary.status} />, export: { value: (r) => PAY_STATUS[r.summary.status].label } },
        { key: "act", header: "", align: "end", render: (r) => live(r) && r.summary.remaining > 0 ? <span onClick={(e) => e.stopPropagation()}><WhatsAppButton row={r} item={r.summary.next ?? undefined} purpose={r.summary.status === "overdue" ? "payment_overdue" : "payment_reminder"} /></span> : null },
    ];

    return (
        <div>
            <PageHeader title="Öğrenci Hesapları" description="Dönem boyunca her öğrencinin borç, tahsilat ve avansı. Satıra tıklayarak ekstreye, tahsilat girişine ulaşın." />
            <div className="mb-4"><Chips value={tab} onChange={setTab} items={[
                { value: "debt", label: "Borcu olanlar", count: count((r) => live(r) && r.summary.remaining > 0) },
                { value: "overdue", label: "Geciken", count: count((r) => r.summary.status === "overdue") },
                { value: "advance", label: "Avansı olan", count: count((r) => r.summary.advance > 0) },
                { value: "all", label: "Tümü", count: all.length },
            ]} /></div>
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.enrollment.id} searchText={(r) => `${r.student.firstName} ${r.student.lastName} ${r.student.tc} ${r.student.phone}`} searchPlaceholder="Ad, T.C. no veya telefon ara" onRowClick={(r) => router.push(`/admin/hesaplar/${r.enrollment.id}`)} exportName="ogrenci-hesaplari" empty={{ icon: "account_balance_wallet", title: "Bu görünümde hesap yok", description: "Filtreyi değiştirin." }} />
        </div>
    );
}
