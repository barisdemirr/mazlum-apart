"use client";

import { useState } from "react";
import Link from "next/link";
import ActionDialog from "@/components/admin/ActionDialog";
import DataTable from "@/components/admin/DataTable";
import Icon from "@/components/ui/Icon";
import MaintenanceCreateDialog from "@/components/admin/support/MaintenanceCreateDialog";
import MaintenancePhotos from "@/components/admin/support/MaintenancePhotos";
import { Chips, PageHeader, StatusBadge } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { updateMaintenance } from "@/lib/admin/commands/finance";
import { turkeyDate } from "@/lib/format";
import { MAINT_AREA, MAINT_STATUS, date } from "@/lib/admin/labels";

/** Öğrencilerin arıza bildirimleri: durumu ve yönetici notunu güncelleyin; öğrenci kendi sayfasında görür. */
export default function MaintenanceView({ items }) {
    const { period } = useAdmin();
    const [tab, setTab] = useState("open");
    const [edit, setEdit] = useState(null);
    const [creating, setCreating] = useState(false);
    const rows = items.filter((m) => (tab === "open" ? m.status !== "done" : tab === "done" ? m.status === "done" : true));
    const columns = [
        { key: "no", header: "No", render: (m) => <span className="ad-num text-xs">{m.no}</span>, export: { value: (m) => m.no } },
        { key: "title", header: "Konu", render: (m) => <div className="min-w-0"><div className="flex items-center gap-1.5"><span className="truncate font-bold">{m.title}</span>{m.photos?.length > 0 && <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-ad-muted" title={`${m.photos.length} fotoğraf`}><Icon name="image" className="text-[15px]" />{m.photos.length}</span>}</div><div className="truncate text-[11px] text-ad-muted">{MAINT_AREA[m.area] ?? m.area} · {m.roomLabel}</div></div>, export: { value: (m) => m.title, width: 30 } },
        { key: "student", header: "Öğrenci", render: (m) => <Link href={`/admin/ogrenciler/${m.enrollmentId}`} onClick={(e) => e.stopPropagation()} className="hover:text-ad-brand">{m.student.firstName} {m.student.lastName}</Link>, export: { value: (m) => `${m.student.firstName} ${m.student.lastName}` } },
        { key: "date", header: "Tarih", sort: (m) => m.createdAt, render: (m) => <span className="ad-num">{date(turkeyDate(m.createdAt))}</span>, export: { type: "date", value: (m) => turkeyDate(m.createdAt) } },
        { key: "status", header: "Durum", render: (m) => <StatusBadge map={MAINT_STATUS} value={m.status} />, export: { value: (m) => MAINT_STATUS[m.status].label } },
    ];
    return (
        <div>
            <PageHeader title="Arıza Kayıtları" description="Öğrencilerin Arıza sayfasından ilettiği bildirimler; ofisten de öğrenci adına kayıt açabilirsiniz."
                actions={period.status !== "closed" && <button type="button" onClick={() => setCreating(true)} className="ad-btn ad-btn-primary"><Icon name="add" className="text-[20px]" />Arıza kaydı aç</button>} />
            <div className="mb-4"><Chips value={tab} onChange={setTab} items={[{ value: "open", label: "Açık", count: items.filter((m) => m.status !== "done").length }, { value: "done", label: "Tamamlanan", count: items.filter((m) => m.status === "done").length }, { value: "all", label: "Tümü", count: items.length }]} /></div>
            <DataTable columns={columns} rows={rows} rowKey={(m) => m.id} searchText={(m) => `${m.no} ${m.title} ${m.student.firstName} ${m.student.lastName}`} searchPlaceholder="Arıza ara" onRowClick={(m) => period.status !== "closed" && setEdit(m)} exportName="ariza-kayitlari" empty={{ icon: "build", title: "Arıza bildirimi yok" }} />
            {creating && <MaintenanceCreateDialog onClose={() => setCreating(false)} />}
            {edit && <ActionDialog title={edit.title} description={`${edit.no} · ${edit.student.firstName} ${edit.student.lastName} · ${edit.roomLabel}`} command={updateMaintenance} extra={{ id: edit.id }} initial={{ status: edit.status, adminNote: edit.adminNote ?? "" }} success="Arıza güncellendi." onClose={() => setEdit(null)}
                note={edit.description}
                top={<MaintenancePhotos requestId={edit.id} photos={edit.photos} />}
                fields={[{ name: "status", label: "Durum", type: "select", options: Object.entries(MAINT_STATUS).map(([k, v]) => [k, v.label]) }, { name: "adminNote", label: "Öğrenciye görünen not", type: "textarea" }]} />}
        </div>
    );
}
