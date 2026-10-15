"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import DataTable from "@/components/admin/DataTable";
import { Avatar, Chips, PageHeader, StatusBadge } from "@/components/admin/ui";
import { SelectInput } from "@/components/admin/fields";
import { APPLICATION_STATUS, PAY_WINDOW, SOURCE, date, money } from "@/lib/admin/labels";
import ApplicationDialog from "./ApplicationDialog";
import OfficeApplicationDialog, { GRADE_LABELS } from "./OfficeApplicationDialog";

export default function ApplicationsView() {
    const { state, period } = useAdmin();
    const [tab, setTab] = useState("pending");
    const [roomType, setRoomType] = useState("");
    const [openId, setOpenId] = useState(null);
    const [officeOpen, setOfficeOpen] = useState(false);

    const all = useMemo(() => state.applications.filter((a) => a.periodId === period.id), [state.applications, period.id]);
    const count = (s) => all.filter((a) => a.status === s).length;
    const rows = all.filter((a) => (tab === "all" || a.status === tab) && (!roomType || a.roomTypeId === roomType));
    const current = state.applications.find((a) => a.id === openId) ?? null;
    const canCreate = period.status === "active" && period.applicationsOpen;
    const roomName = (id) => state.roomTypes.find((r) => r.id === id)?.name.tr ?? "";

    const columns = [
        {
            key: "name", header: "Başvuran", sort: (a) => a.student.lastName,
            render: (a) => (
                <div className="flex items-center gap-2.5">
                    <Avatar name={`${a.student.firstName} ${a.student.lastName}`} />
                    <div className="min-w-0">
                        <div className="truncate font-bold">{a.student.firstName} {a.student.lastName}</div>
                        <div className="text-[11px] text-ad-muted">{a.student.department || "—"} · {GRADE_LABELS[a.student.grade]}</div>
                    </div>
                </div>
            ),
            export: { value: (a) => `${a.student.firstName} ${a.student.lastName}`, width: 24 },
        },
        { key: "tc", header: "T.C. No", render: (a) => <span className="ad-num">{a.student.tc}</span>, export: { value: (a) => a.student.tc } },
        { key: "phone", header: "Telefon", render: (a) => <span className="ad-num whitespace-nowrap">+90 {a.student.phone}</span>, export: { value: (a) => a.student.phone } },
        { key: "room", header: "Oda tipi", sort: (a) => roomName(a.roomTypeId), render: (a) => <span className="whitespace-nowrap">{roomName(a.roomTypeId)}</span>, export: { value: (a) => roomName(a.roomTypeId) } },
        { key: "entry", header: "Giriş", sort: (a) => a.entryDate, render: (a) => <span className="ad-num">{date(a.entryDate)}</span>, export: { type: "date", value: (a) => a.entryDate } },
        { key: "window", header: "Ödeme günü", render: (a) => PAY_WINDOW[a.payWindow], export: { value: (a) => PAY_WINDOW[a.payWindow] } },
        { key: "price", header: "Aylık kira", align: "end", sort: (a) => a.priceSnapshot.monthly, render: (a) => <span className="ad-num">{money(a.priceSnapshot.monthly)}</span>, export: { type: "money", value: (a) => a.priceSnapshot.monthly } },
        { key: "source", header: "Kaynak", render: (a) => SOURCE[a.source], export: { value: (a) => SOURCE[a.source] } },
        { key: "created", header: "Tarih", sort: (a) => a.createdAt, render: (a) => <span className="ad-num">{date(a.createdAt.slice(0, 10))}</span>, export: { type: "date", value: (a) => a.createdAt.slice(0, 10) } },
        { key: "status", header: "Durum", render: (a) => <StatusBadge map={APPLICATION_STATUS} value={a.status} />, export: { value: (a) => APPLICATION_STATUS[a.status].label } },
    ];

    return (
        <div>
            <PageHeader
                title="Başvurular"
                description="Web sitesinden ve ofisten gelen başvurular. Onaylanınca kayıt, öğrenci hesabı ve ödeme planı oluşur; yerleşim ayrıca elle yapılır."
                actions={
                    <button type="button" onClick={() => setOfficeOpen(true)} disabled={!canCreate} title={canCreate ? "" : "Bu dönem yeni başvuruya kapalı"} className="ad-btn ad-btn-primary">
                        <Icon name="add_circle" className="text-[20px]" />
                        Ofis kaydı ekle
                    </button>
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Chips
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: "pending", label: "Bekleyen", count: count("pending") },
                        { value: "approved", label: "Onaylanan", count: count("approved") },
                        { value: "rejected", label: "Reddedilen", count: count("rejected") },
                        { value: "all", label: "Tümü", count: all.length },
                    ]}
                />
            </div>

            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(a) => a.id}
                searchText={(a) => `${a.student.firstName} ${a.student.lastName} ${a.student.tc} ${a.student.phone}`}
                searchPlaceholder="Ad, T.C. no veya telefon ara"
                filters={
                    <div className="w-full sm:w-52">
                        <SelectInput value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                            <option value="">Tüm oda tipleri</option>
                            {state.roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name.tr}</option>)}
                        </SelectInput>
                    </div>
                }
                onRowClick={(a) => setOpenId(a.id)}
                exportName="basvurular"
                empty={{ icon: "inbox", title: "Bu görünümde başvuru yok", description: tab === "pending" ? "Bekleyen başvuru kalmadı." : "Arama ya da filtreleri değiştirin." }}
            />

            {current && <ApplicationDialog key={current.id} application={current} onClose={() => setOpenId(null)} />}
            <OfficeApplicationDialog open={officeOpen} onClose={() => setOfficeOpen(false)} onCreated={(app) => { setTab("pending"); setOpenId(app.id); }} />
        </div>
    );
}
