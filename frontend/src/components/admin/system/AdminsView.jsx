"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import DataTable from "@/components/admin/DataTable";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import { useToast } from "@/components/admin/Toast";
import { Avatar, Badge } from "@/components/admin/ui";
import { Field, TextInput } from "@/components/admin/fields";
import { addAdmin, setAdminActive } from "@/lib/admin/domain/config";
import { date } from "@/lib/admin/labels";

export default function AdminsView() {
    const { state, user } = useAdmin();
    const { exec } = useCommand();
    const [adding, setAdding] = useState(false);
    const [created, setCreated] = useState(null);
    const [toggling, setToggling] = useState(null);

    const confirmToggle = async () => {
        const out = await exec(setAdminActive, { id: toggling.id, active: !toggling.active }, toggling.active ? "Yönetici pasife alındı." : "Yönetici aktifleştirildi.");
        if (out.ok) setToggling(null);
    };

    const columns = [
        { key: "name", header: "Yönetici", sort: (a) => a.name, render: (a) => <div className="flex items-center gap-2.5"><Avatar name={a.name} /><div className="min-w-0"><div className="truncate font-bold">{a.name}{a.id === (user?.id ?? "admin-1") && <span className="ms-2 text-xs font-normal text-ad-muted">(siz)</span>}</div><div className="text-[11px] text-ad-muted">{a.email}</div></div></div> },
        { key: "created", header: "Eklenme", sort: (a) => a.createdAt, render: (a) => <span className="ad-num">{date(a.createdAt.slice(0, 10))}</span> },
        { key: "status", header: "Durum", render: (a) => <Badge tone={a.active ? "ok" : "neutral"}>{a.active ? "Aktif" : "Pasif"}</Badge> },
        { key: "act", header: "", align: "end", render: (a) => a.id === (user?.id ?? "admin-1") ? null : <button type="button" onClick={() => setToggling(a)} className={`text-xs font-bold hover:underline ${a.active ? "text-ad-danger" : "text-ad-brand"}`}>{a.active ? "Pasife al" : "Aktifleştir"}</button> },
    ];

    return (
        <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-2xl text-sm text-ad-muted">Panele giriş yapabilen yöneticiler. Yönetici silinmez, pasife alınır; geçmiş işlemlerde adı kalır.</p>
                <button type="button" onClick={() => setAdding(true)} className="ad-btn ad-btn-primary"><Icon name="person_add" className="text-[20px]" />Yönetici ekle</button>
            </div>
            <DataTable columns={columns} rows={state.admins} rowKey={(a) => a.id} empty={{ icon: "admin_panel_settings", title: "Yönetici yok" }} />
            {adding && <AddAdminDialog onClose={() => setAdding(false)} onCreated={setCreated} />}
            {created && <CreatedDialog data={created} onClose={() => setCreated(null)} />}
            <ConfirmDialog open={!!toggling} title={toggling?.active ? "Yönetici pasife alınsın mı?" : "Yönetici aktifleştirilsin mi?"} message={toggling ? `${toggling.name} ${toggling.active ? "artık panele giriş yapamaz." : "yeniden giriş yapabilir."}` : ""} confirmLabel={toggling?.active ? "Pasife al" : "Aktifleştir"} danger={!!toggling?.active} onConfirm={confirmToggle} onCancel={() => setToggling(null)} />
        </div>
    );
}

function AddAdminDialog({ onClose, onCreated }) {
    const { exec, busy } = useCommand();
    const [f, setF] = useState({ name: "", email: "" });
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(addAdmin, f, "Yönetici eklendi.");
        if (out.ok) { onCreated(out.result); onClose(); }
    };
    return (
        <FormDialog open title="Yönetici ekle" onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Ekle" columns={1}>
            <Field label="Ad soyad" required><TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
            <Field label="E-posta" required><TextInput type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        </FormDialog>
    );
}

function CreatedDialog({ data, onClose }) {
    const toast = useToast();
    const copy = async () => {
        try { await navigator.clipboard.writeText(data.initialPassword); toast.success("Şifre kopyalandı."); } catch { toast.error("Kopyalanamadı."); }
    };
    return (
        <FormDialog open title="Yönetici eklendi" description={`${data.admin.name} · ${data.admin.email}`} onClose={onClose} hideFooter columns={1}>
            <div className="rounded-2xl border border-ad-line p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">İlk şifre</p>
                <p className="mt-2 flex items-center gap-3"><code className="rounded bg-ad-sunken px-3 py-1 text-lg tracking-widest">{data.initialPassword}</code><button type="button" onClick={copy} className="ad-btn ad-btn-soft ad-btn-sm"><Icon name="content_copy" className="text-[16px]" />Kopyala</button></p>
                <p className="mt-3 text-xs text-ad-warn">Bu şifre yalnızca şimdi gösterilir. Kişiye güvenli bir yoldan iletin; ilk girişte değiştirmesi önerilir.</p>
            </div>
            <button type="button" onClick={onClose} className="ad-btn ad-btn-outline">Kapat</button>
        </FormDialog>
    );
}
