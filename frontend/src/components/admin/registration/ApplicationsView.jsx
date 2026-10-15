"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import DataTable from "@/components/admin/DataTable";
import { Avatar, Chips, PageHeader, StatusBadge } from "@/components/admin/ui";
import { SelectInput } from "@/components/admin/fields";
import { turkeyDate } from "@/lib/format";
import { APPLICATION_STATUS, PAY_WINDOW, SOURCE, TERM, date, money } from "@/lib/admin/labels";
import ApplicationDialog from "./ApplicationDialog";
import OfficeApplicationDialog from "./OfficeApplicationDialog";

/**
 * Başvurular. Liste backend'den gelir (en yeni üstte, en çok 200); sekmeler ve oda tipi süzgeci tarayıcıda uygulanır.
 * Satıra tıklayınca başvurunun tamamı (form bilgileri + ödeme planı önizlemesi) backend'den okunur.
 */
export default function ApplicationsView({ applications, roomTypes }) {
    const { period } = useAdmin();
    const [tab, setTab] = useState("pending");
    const [roomType, setRoomType] = useState("");
    const [openId, setOpenId] = useState(null);
    const [officeOpen, setOfficeOpen] = useState(false);

    const all = applications.items;
    const count = (s) => all.filter((a) => a.status === s).length;
    const rows = useMemo(() => all.filter((a) => (tab === "all" || a.status === tab) && (!roomType || a.roomTypeId === roomType)), [all, tab, roomType]);
    const current = all.find((a) => a.id === openId) ?? null;
    const canCreate = period.status === "active" && period.applicationsOpen;

    const columns = [
        {
            key: "name", header: "Başvuran", sort: (a) => a.fullName,
            render: (a) => (
                <div className="flex items-center gap-2.5">
                    <Avatar name={a.fullName} />
                    <div className="min-w-0">
                        <div className="truncate font-bold">{a.fullName}</div>
                        <div className="text-[11px] text-ad-muted">{a.no}{a.preferredRoom ? ` · tercih: ${a.preferredRoom}` : ""}</div>
                    </div>
                </div>
            ),
            export: { value: (a) => a.fullName, width: 24 },
        },
        { key: "tc", header: "T.C. No", render: (a) => <span className="ad-num">{a.tc}</span>, export: { value: (a) => a.tc } },
        { key: "phone", header: "Telefon", render: (a) => <span className="ad-num whitespace-nowrap">+90 {a.phone}</span>, export: { value: (a) => a.phone } },
        { key: "room", header: "Oda tipi", sort: (a) => a.roomTypeName, render: (a) => <span className="whitespace-nowrap">{a.roomTypeName}</span>, export: { value: (a) => a.roomTypeName } },
        { key: "entry", header: "Giriş", sort: (a) => a.entryDate, render: (a) => <span className="ad-num">{date(a.entryDate)}</span>, export: { type: "date", value: (a) => a.entryDate } },
        { key: "term", header: "Süre", render: (a) => TERM[a.term], export: { value: (a) => TERM[a.term] } },
        { key: "window", header: "Ödeme günü", render: (a) => PAY_WINDOW[a.payWindow], export: { value: (a) => PAY_WINDOW[a.payWindow] } },
        { key: "price", header: "Aylık kira", align: "end", sort: (a) => a.priceMonthly, render: (a) => <span className="ad-num">{money(a.priceMonthly)}</span>, export: { type: "money", value: (a) => a.priceMonthly } },
        { key: "source", header: "Kaynak", render: (a) => SOURCE[a.source], export: { value: (a) => SOURCE[a.source] } },
        { key: "created", header: "Tarih", sort: (a) => a.createdAt, render: (a) => <span className="ad-num">{date(turkeyDate(a.createdAt))}</span>, export: { type: "date", value: (a) => turkeyDate(a.createdAt) } },
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
                        { value: "all", label: "Tümü", count: applications.total },
                    ]}
                />
                {applications.total > all.length && (
                    <span className="text-xs text-ad-warn">İlk {all.length} başvuru gösteriliyor (toplam {applications.total}). Aramak için T.C. no ya da ad kullanın.</span>
                )}
            </div>

            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(a) => a.id}
                searchText={(a) => `${a.fullName} ${a.tc} ${a.phone} ${a.no}`}
                searchPlaceholder="Ad, T.C. no, telefon veya başvuru no ara"
                filters={
                    <div className="w-full sm:w-52">
                        <SelectInput value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                            <option value="">Tüm oda tipleri</option>
                            {roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name.tr}</option>)}
                        </SelectInput>
                    </div>
                }
                onRowClick={(a) => setOpenId(a.id)}
                exportName="basvurular"
                empty={{ icon: "inbox", title: "Bu görünümde başvuru yok", description: tab === "pending" ? "Bekleyen başvuru kalmadı." : "Arama ya da filtreleri değiştirin." }}
            />

            {current && <ApplicationDialog key={current.id} application={current} onClose={() => setOpenId(null)} />}
            <OfficeApplicationDialog open={officeOpen} roomTypes={roomTypes} onClose={() => setOfficeOpen(false)} onCreated={(app) => { setTab("pending"); setOpenId(app.id); }} />
        </div>
    );
}
