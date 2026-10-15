"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import DataTable from "@/components/admin/DataTable";
import FormDialog from "@/components/admin/FormDialog";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import useCommand from "@/components/admin/useCommand";
import { Avatar, Chips, PageHeader, StatusBadge } from "@/components/admin/ui";
import { Field, SelectInput, TextInput } from "@/components/admin/fields";
import { updateMaintenance } from "@/lib/admin/domain/support";
import { enrollmentRow } from "@/lib/admin/domain/selectors";
import { MAINT_AREA, MAINT_STATUS, date } from "@/lib/admin/labels";

/** Öğrencilerin bildirdiği arızalar (öğrenci alanından gelir). Durum güncellenir, öğrenciye WhatsApp ile haber verilir. */
export default function MaintenanceView() {
    const { state, period, today } = useAdmin();
    const [tab, setTab] = useState("open");
    const [openId, setOpenId] = useState(null);

    const all = useMemo(
        () => state.maintenance.filter((m) => m.periodId === period.id).map((m) => {
            const enrollment = state.enrollments.find((e) => e.id === m.enrollmentId);
            return { m, row: enrollment ? enrollmentRow(state, enrollment, today) : null };
        }),
        [state, period.id, today]
    );
    const rows = all.filter(({ m }) => tab === "all" || (tab === "open" ? m.status !== "done" : m.status === "done"));
    const current = all.find(({ m }) => m.id === openId) ?? null;

    const columns = [
        { key: "date", header: "Bildirim", sort: ({ m }) => m.createdAt, render: ({ m }) => <span className="ad-num whitespace-nowrap">{date(m.createdAt.slice(0, 10))}</span>, export: { type: "date", value: ({ m }) => m.createdAt.slice(0, 10) } },
        { key: "student", header: "Öğrenci", sort: ({ row }) => row?.student.lastName, render: ({ row }) => row ? <div className="flex items-center gap-2.5"><Avatar name={`${row.student.firstName} ${row.student.lastName}`} /><span className="font-bold">{row.student.firstName} {row.student.lastName}</span></div> : "—", export: { value: ({ row }) => row ? `${row.student.firstName} ${row.student.lastName}` : "", width: 24 } },
        { key: "room", header: "Oda", render: ({ m }) => <span className="whitespace-nowrap">{m.roomLabel}</span>, export: { value: ({ m }) => m.roomLabel } },
        { key: "area", header: "Alan", render: ({ m }) => MAINT_AREA[m.area] ?? m.area, export: { value: ({ m }) => MAINT_AREA[m.area] ?? m.area } },
        { key: "title", header: "Arıza", render: ({ m }) => <span className="font-semibold">{m.title}</span>, export: { value: ({ m }) => m.title, width: 28 } },
        { key: "status", header: "Durum", render: ({ m }) => <StatusBadge map={MAINT_STATUS} value={m.status} />, export: { value: ({ m }) => MAINT_STATUS[m.status].label } },
        { key: "note", header: "Not", render: ({ m }) => <span className="block max-w-56 truncate text-xs text-ad-muted">{m.adminNote}</span>, export: { value: ({ m }) => m.adminNote, width: 30 } },
    ];

    return (
        <div>
            <PageHeader title="Arıza Kayıtları" description="Öğrencilerin bildirdiği arızalar. Durumu güncelleyin; öğrenci kendi alanında durumu görür." />
            <div className="mb-4"><Chips value={tab} onChange={setTab} items={[{ value: "open", label: "Açık", count: all.filter(({ m }) => m.status !== "done").length }, { value: "done", label: "Tamamlanan", count: all.filter(({ m }) => m.status === "done").length }, { value: "all", label: "Tümü", count: all.length }]} /></div>
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={({ m }) => m.id}
                searchText={({ m, row }) => `${m.title} ${m.roomLabel} ${row?.student.firstName} ${row?.student.lastName}`}
                searchPlaceholder="Arıza, oda veya öğrenci ara"
                onRowClick={({ m }) => setOpenId(m.id)}
                initialSort={{ key: "date", dir: "desc" }}
                exportName="ariza-kayitlari"
                empty={{ icon: "build", title: "Arıza kaydı yok", description: tab === "open" ? "Açık arıza kalmadı." : "Bu görünümde kayıt yok." }}
            />
            {current && <MaintenanceDialog key={current.m.id} item={current.m} row={current.row} readOnly={period.status === "closed"} onClose={() => setOpenId(null)} />}
        </div>
    );
}

function MaintenanceDialog({ item, row, readOnly, onClose }) {
    const { exec, busy } = useCommand();
    const [status, setStatus] = useState(item.status);
    const [note, setNote] = useState(item.adminNote ?? "");

    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(updateMaintenance, { id: item.id, status, adminNote: note }, "Arıza kaydı güncellendi.");
        if (out.ok) onClose();
    };

    return (
        <FormDialog open title={item.title} description={`${item.roomLabel} · ${MAINT_AREA[item.area] ?? ""} · ${date(item.createdAt.slice(0, 10))}`} onClose={onClose} onSubmit={readOnly ? undefined : submit} busy={busy} saveLabel="Kaydet" columns={1} hideFooter={readOnly}>
            {row && <p className="text-sm">Bildiren: <Link href={`/admin/ogrenciler/${row.enrollment.id}`} className="font-bold text-ad-brand hover:underline">{row.student.firstName} {row.student.lastName}</Link></p>}
            <p className="rounded-2xl bg-ad-sunken p-4 text-sm leading-relaxed">{item.description || "Açıklama girilmemiş."}</p>
            <Field label="Durum"><SelectInput value={status} onChange={(e) => setStatus(e.target.value)} disabled={readOnly}>{Object.entries(MAINT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</SelectInput></Field>
            <Field label="Öğrenciye görünen not" hint="Örn. “Tesisatçı yarın gelecek.”"><TextInput as="textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} disabled={readOnly} /></Field>
            {row && <div><WhatsAppButton row={row} purpose="maintenance_update" defaultTemplate="maintenance_update" extraVars={{ konu: item.title, durum: MAINT_STATUS[status].label }} compact={false} label="Öğrenciye WhatsApp ile bildir" className="!h-10 !px-4" /></div>}
        </FormDialog>
    );
}
