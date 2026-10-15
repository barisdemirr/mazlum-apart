"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import ActionDialog from "@/components/admin/ActionDialog";
import useCommand from "@/components/admin/useCommand";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { createAdmin, resetAdminPassword, updateAdmin } from "@/lib/admin/commands/finance";
import { turkeyDate } from "@/lib/format";
import { date } from "@/lib/admin/labels";

/** Yöneticiler: ekleme, pasife alma, şifre sıfırlama. Yeni şifre yalnızca bir kez gösterilir. */
export default function AdminsView({ users }) {
    const { user } = useAdmin();
    const { exec } = useCommand();
    const [dialog, setDialog] = useState(null);
    const [secret, setSecret] = useState(null);
    const act = async (fn, input, msg, label) => { const out = await exec(fn, input, msg); if (out.ok && out.result?.initialPassword) setSecret({ label, password: out.result.initialPassword }); };
    return (
        <div>
            <PageHeader title="Yöneticiler" description="Panele giriş yapabilen kişiler. Hepsi tam yetkilidir." actions={<button type="button" onClick={() => setDialog({ type: "add" })} className="ad-btn ad-btn-primary"><Icon name="person_add" className="text-[20px]" />Yönetici ekle</button>} />
            {secret && <div className="mb-4 rounded-2xl bg-ad-ok-soft p-4 text-sm text-ad-ok">{secret.label}: <code className="rounded bg-ad-surface px-2 py-0.5 tracking-widest">{secret.password}</code> · yalnızca şimdi gösterilir.</div>}
            <div className="grid gap-4 md:grid-cols-2">
                {users.map((u) => (
                    <Card key={u.id}>
                        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-bold">{u.name}</p><p className="truncate text-xs text-ad-muted">{u.email}</p></div><Badge tone={u.active ? "ok" : "neutral"}>{u.active ? "Aktif" : "Pasif"}</Badge></div>
                        <p className="mt-2 text-xs text-ad-faint">{u.lastLoginAt ? `Son giriş ${date(turkeyDate(u.lastLoginAt))}` : "Henüz giriş yapmadı"}</p>
                        <div className="mt-3 flex gap-3 text-xs font-bold">
                            <button type="button" className="text-ad-brand hover:underline" onClick={() => setDialog({ type: "edit", item: u })}>Düzenle</button>
                            <button type="button" className="text-ad-brand hover:underline" onClick={() => act(resetAdminPassword, { id: u.id }, "Şifre sıfırlandı.", `${u.name} yeni şifre`)}>Şifre sıfırla</button>
                            {u.id !== user?.id && <button type="button" className="text-ad-danger hover:underline" onClick={() => act(updateAdmin, { id: u.id, name: u.name, email: u.email, active: !u.active }, u.active ? "Pasife alındı." : "Aktifleştirildi.")}>{u.active ? "Pasife al" : "Aktifleştir"}</button>}
                        </div>
                    </Card>
                ))}
            </div>
            {dialog?.type === "add" && <ActionDialog title="Yönetici ekle" command={createAdmin} success="Yönetici eklendi." onClose={() => setDialog(null)} onDone={(r) => setSecret({ label: `${r.admin.name} ilk şifre`, password: r.initialPassword })} note="İlk şifre oluşturulur ve yalnızca bir kez gösterilir." fields={[{ name: "name", label: "Ad soyad", type: "text", required: true }, { name: "email", label: "E-posta", type: "text", required: true }]} />}
            {dialog?.type === "edit" && <ActionDialog title="Yöneticiyi düzenle" command={updateAdmin} extra={{ id: dialog.item.id, active: dialog.item.active }} initial={dialog.item} success="Kaydedildi." onClose={() => setDialog(null)} fields={[{ name: "name", label: "Ad soyad", type: "text", required: true }, { name: "email", label: "E-posta", type: "text", required: true }]} />}
        </div>
    );
}
