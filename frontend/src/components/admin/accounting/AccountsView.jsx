"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import DataTable from "@/components/admin/DataTable";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import { Avatar, Card, Chips, PageHeader, StatusBadge } from "@/components/admin/ui";
import { SelectInput } from "@/components/admin/fields";
import { describeCovered, round, sum } from "@/lib/admin/domain/accounting";
import { ENROLLMENT_STATUS, PAY_STATUS, date, money } from "@/lib/admin/labels";
import PaymentDialog from "./PaymentDialog";

/** Öğrenci cari hesapları: her öğrencinin borç / ödenen / kalan / avans durumu. Satır → hesap ekstresi. */
export default function AccountsView() {
    const router = useRouter();
    const { state, view } = useAdmin();
    const [tab, setTab] = useState("debt");
    const [roomType, setRoomType] = useState("");
    const [paying, setPaying] = useState(null);

    const rows = useMemo(
        () => view.rows.filter((r) => r.summary.items.length > 0 || r.summary.collected > 0),
        [view.rows]
    );
    const filtered = rows.filter((r) => {
        if (roomType && r.enrollment.roomTypeId !== roomType) return false;
        if (tab === "debt") return r.summary.remaining > 0;
        if (tab === "overdue") return r.summary.overdue > 0;
        if (tab === "advance") return r.summary.advance > 0;
        return true;
    });
    const count = (f) => rows.filter(f).length;
    const totals = {
        charged: sum(filtered, (r) => r.summary.charged),
        paid: sum(filtered, (r) => r.summary.allocated),
        remaining: sum(filtered, (r) => r.summary.remaining),
        overdue: sum(filtered, (r) => r.summary.overdue),
        advance: sum(filtered, (r) => r.summary.advance),
    };

    const columns = [
        {
            key: "name", header: "Öğrenci", sort: (r) => r.student.lastName,
            render: (r) => (
                <div className="flex items-center gap-2.5">
                    <Avatar name={`${r.student.firstName} ${r.student.lastName}`} />
                    <div className="min-w-0">
                        <div className="truncate font-bold">{r.student.firstName} {r.student.lastName}</div>
                        <div className="text-[11px] text-ad-muted">{r.room?.label ?? "Yerleşmedi"}{["cancelled", "left"].includes(r.enrollment.status) ? ` · ${ENROLLMENT_STATUS[r.enrollment.status].label}` : ""}</div>
                    </div>
                </div>
            ),
            export: { value: (r) => `${r.student.firstName} ${r.student.lastName}`, width: 24 },
        },
        { key: "charged", header: "Toplam borç", align: "end", sort: (r) => r.summary.charged, render: (r) => <span className="ad-num">{money(r.summary.charged)}</span>, export: { type: "money", value: (r) => r.summary.charged } },
        { key: "paid", header: "Ödenen", align: "end", sort: (r) => r.summary.allocated, render: (r) => <span className="ad-num text-ad-ok">{money(r.summary.allocated)}</span>, export: { type: "money", value: (r) => r.summary.allocated } },
        { key: "remaining", header: "Kalan", align: "end", sort: (r) => r.summary.remaining, render: (r) => <span className={`ad-num font-bold ${r.summary.status === "overdue" ? "text-ad-danger" : ""}`}>{money(r.summary.remaining)}</span>, export: { type: "money", value: (r) => r.summary.remaining } },
        { key: "overdue", header: "Vadesi geçen", align: "end", sort: (r) => r.summary.overdue, render: (r) => <span className={`ad-num ${r.summary.overdue > 0 ? "font-bold text-ad-danger" : "text-ad-faint"}`}>{money(r.summary.overdue)}</span>, export: { type: "money", value: (r) => r.summary.overdue } },
        { key: "advance", header: "Avans", align: "end", sort: (r) => r.summary.advance, render: (r) => <span className={`ad-num ${r.summary.advance > 0 ? "font-bold text-ad-accent" : "text-ad-faint"}`}>{money(r.summary.advance)}</span>, export: { type: "money", value: (r) => r.summary.advance } },
        { key: "covered", header: "Ödenen süre", render: (r) => <span className="block min-w-44 text-xs">{describeCovered(r.summary.covered, money)}</span>, export: { value: (r) => describeCovered(r.summary.covered, money), width: 40 } },
        { key: "next", header: "Sıradaki ödeme", sort: (r) => r.summary.next?.dueDate ?? "~", render: (r) => r.summary.next ? <span className="whitespace-nowrap text-xs"><b className="ad-num">{money(r.summary.next.remaining)}</b> · {date(r.summary.next.dueDate)}</span> : <span className="text-ad-faint">—</span>, export: { value: (r) => r.summary.next ? `${money(r.summary.next.remaining)} · ${date(r.summary.next.dueDate)}` : "", width: 24 } },
        { key: "status", header: "Durum", render: (r) => <StatusBadge map={PAY_STATUS} value={r.summary.status} />, export: { value: (r) => PAY_STATUS[r.summary.status].label } },
        {
            key: "act", header: "", align: "end",
            render: (r) => (
                <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => setPaying(r.enrollment.id)} className="ad-btn ad-btn-soft ad-btn-sm"><Icon name="payments" className="text-[16px]" />Tahsilat</button>
                    {r.summary.remaining > 0 && <WhatsAppButton row={r} item={r.summary.next} purpose={r.summary.status === "overdue" ? "payment_overdue" : "payment_reminder"} compact />}
                </span>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Öğrenci Hesapları"
                description="Her öğrencinin cari hesabı. Bakiyeler tahsilat ve borç kalemlerinden hesaplanır; elle yazılmaz."
                actions={<button type="button" onClick={() => setPaying("")} className="ad-btn ad-btn-primary"><Icon name="add_card" className="text-[20px]" />Tahsilat al</button>}
            />

            <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                    ["Toplam borç", totals.charged, ""],
                    ["Ödenen", totals.paid, "text-ad-ok"],
                    ["Kalan alacak", totals.remaining, ""],
                    ["Vadesi geçen", totals.overdue, totals.overdue > 0 ? "text-ad-danger" : ""],
                    ["Avans", totals.advance, "text-ad-accent"],
                ].map(([label, v, cls]) => (
                    <Card key={label}><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">{label}</p><p className={`ad-num mt-2 text-2xl font-extrabold ${cls}`}>{money(v)}</p></Card>
                ))}
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Chips
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: "debt", label: "Borcu olanlar", count: count((r) => r.summary.remaining > 0) },
                        { value: "overdue", label: "Vadesi geçenler", count: count((r) => r.summary.overdue > 0) },
                        { value: "advance", label: "Avansı olanlar", count: count((r) => r.summary.advance > 0) },
                        { value: "all", label: "Tümü", count: rows.length },
                    ]}
                />
            </div>

            <DataTable
                columns={columns}
                rows={filtered}
                rowKey={(r) => r.enrollment.id}
                searchText={(r) => `${r.student.firstName} ${r.student.lastName} ${r.student.tc} ${r.student.phone}`}
                searchPlaceholder="Öğrenci ara"
                filters={
                    <div className="w-full sm:w-48">
                        <SelectInput value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                            <option value="">Tüm oda tipleri</option>
                            {state.roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name.tr}</option>)}
                        </SelectInput>
                    </div>
                }
                onRowClick={(r) => router.push(`/admin/hesaplar/${r.enrollment.id}`)}
                exportName="ogrenci-hesaplari"
                empty={{ icon: "account_balance_wallet", title: "Bu görünümde hesap yok", description: tab === "overdue" ? "Vadesi geçen ödeme yok." : "Arama ya da filtreleri değiştirin." }}
            />

            {paying !== null && <PaymentDialog enrollmentId={paying || null} onClose={() => setPaying(null)} />}
        </div>
    );
}
