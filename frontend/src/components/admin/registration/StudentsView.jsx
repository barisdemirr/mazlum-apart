"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import DataTable from "@/components/admin/DataTable";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import { Avatar, Badge, Chips, PageHeader, StatusBadge } from "@/components/admin/ui";
import { SelectInput } from "@/components/admin/fields";
import { describeCovered } from "@/lib/admin/domain/accounting";
import { ENROLLMENT_STATUS, PAY_STATUS, date, money } from "@/lib/admin/labels";

/** Seçili dönemin kayıtlı öğrencileri. Satıra tıklayınca öğrenci detayı açılır. */
export default function StudentsView() {
    const router = useRouter();
    const { state, view } = useAdmin();
    const [tab, setTab] = useState("live");
    const [roomType, setRoomType] = useState("");
    const [pay, setPay] = useState("");

    const isLive = (r) => !["cancelled", "left"].includes(r.enrollment.status);
    const counts = useMemo(
        () => ({
            live: view.rows.filter(isLive).length,
            unplaced: view.rows.filter((r) => isLive(r) && !r.room).length,
            ended: view.rows.filter((r) => !isLive(r)).length,
        }),
        [view.rows]
    );

    const rows = view.rows.filter((r) => {
        if (tab === "live" && !isLive(r)) return false;
        if (tab === "unplaced" && !(isLive(r) && !r.room)) return false;
        if (tab === "ended" && isLive(r)) return false;
        if (roomType && r.enrollment.roomTypeId !== roomType) return false;
        if (pay && r.summary.status !== pay) return false;
        return true;
    });

    const columns = [
        {
            key: "name", header: "Öğrenci", sort: (r) => r.student.lastName,
            render: (r) => (
                <div className="flex items-center gap-2.5">
                    <Avatar name={`${r.student.firstName} ${r.student.lastName}`} />
                    <div className="min-w-0">
                        <div className="truncate font-bold">{r.student.firstName} {r.student.lastName}</div>
                        <div className="text-[11px] text-ad-muted">{r.student.department || r.student.school || "—"}</div>
                    </div>
                </div>
            ),
            export: { value: (r) => `${r.student.firstName} ${r.student.lastName}`, width: 24 },
        },
        { key: "tc", header: "T.C. No", render: (r) => <span className="ad-num">{r.student.tc}</span>, export: { value: (r) => r.student.tc } },
        { key: "phone", header: "Telefon", render: (r) => <span className="ad-num whitespace-nowrap">+90 {r.student.phone}</span>, export: { value: (r) => r.student.phone } },
        {
            key: "room", header: "Oda", sort: (r) => r.room?.label ?? "~",
            render: (r) => r.room ? <span className="whitespace-nowrap font-semibold">{r.room.label}</span> : isLive(r) ? <Badge tone="warn">Yerleşmedi</Badge> : <span className="text-ad-faint">—</span>,
            export: { value: (r) => r.room?.label ?? "" },
        },
        { key: "type", header: "Oda tipi", render: (r) => <span className="whitespace-nowrap">{r.roomType?.name.tr}</span>, export: { value: (r) => r.roomType?.name.tr ?? "" } },
        { key: "entry", header: "Giriş", sort: (r) => r.enrollment.entryDate, render: (r) => <span className="ad-num">{date(r.enrollment.entryDate)}</span>, export: { type: "date", value: (r) => r.enrollment.entryDate } },
        { key: "status", header: "Durum", render: (r) => <StatusBadge map={ENROLLMENT_STATUS} value={r.enrollment.status} />, export: { value: (r) => ENROLLMENT_STATUS[r.enrollment.status].label } },
        {
            key: "covered", header: "Ödenen süre",
            render: (r) => <span className="block min-w-44 text-xs text-ad-body">{describeCovered(r.summary.covered, money)}</span>,
            export: { value: (r) => describeCovered(r.summary.covered, money), width: 40 },
        },
        {
            key: "remaining", header: "Kalan borç", align: "end", sort: (r) => r.summary.remaining,
            render: (r) => <span className={`ad-num font-bold ${r.summary.remaining > 0 ? (r.summary.status === "overdue" ? "text-ad-danger" : "") : "text-ad-faint"}`}>{money(r.summary.remaining)}</span>,
            export: { type: "money", value: (r) => r.summary.remaining },
        },
        { key: "pay", header: "Ödeme", render: (r) => <StatusBadge map={PAY_STATUS} value={r.summary.status} />, export: { value: (r) => PAY_STATUS[r.summary.status].label } },
        {
            key: "act", header: "", align: "end",
            render: (r) => isLive(r) && r.summary.remaining > 0 ? <span onClick={(e) => e.stopPropagation()}><WhatsAppButton row={r} item={r.summary.next} purpose={r.summary.status === "overdue" ? "payment_overdue" : "payment_reminder"} compact /></span> : null,
        },
    ];

    return (
        <div>
            <PageHeader
                title="Öğrenciler"
                description="Bu dönem kayıtlı öğrenciler. Satıra tıklayarak bilgilerine, odasına ve hesabına ulaşın."
            />
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Chips
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: "live", label: "Konaklayanlar", count: counts.live },
                        { value: "unplaced", label: "Yerleşmeyi bekleyen", count: counts.unplaced },
                        { value: "ended", label: "Ayrılan / iptal", count: counts.ended },
                        { value: "all", label: "Tümü", count: view.rows.length },
                    ]}
                />
            </div>
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(r) => r.enrollment.id}
                searchText={(r) => `${r.student.firstName} ${r.student.lastName} ${r.student.tc} ${r.student.phone}`}
                searchPlaceholder="Ad, T.C. no veya telefon ara"
                filters={
                    <>
                        <div className="w-full sm:w-44">
                            <SelectInput value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                                <option value="">Tüm oda tipleri</option>
                                {state.roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name.tr}</option>)}
                            </SelectInput>
                        </div>
                        <div className="w-full sm:w-44">
                            <SelectInput value={pay} onChange={(e) => setPay(e.target.value)}>
                                <option value="">Tüm ödeme durumları</option>
                                <option value="overdue">Gecikmiş</option>
                                <option value="ok">Güncel</option>
                                <option value="paid">Ödendi</option>
                            </SelectInput>
                        </div>
                    </>
                }
                onRowClick={(r) => router.push(`/admin/ogrenciler/${r.enrollment.id}`)}
                exportName="ogrenciler"
                empty={{ icon: "groups", title: "Bu görünümde öğrenci yok", description: "Arama ya da filtreleri değiştirin." }}
            />
        </div>
    );
}
