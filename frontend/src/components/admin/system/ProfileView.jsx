"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import useCommand from "@/components/admin/useCommand";
import { Field, FormSection, TextInput } from "@/components/admin/fields";
import Icon from "@/components/ui/Icon";
import { changePassword, updateProfile } from "@/lib/admin/domain/config";

export default function ProfileView() {
    const { state, user } = useAdmin();
    const id = user?.id ?? "admin-1";
    const me = state.admins.find((a) => a.id === id);
    const { exec, busy } = useCommand();
    const [name, setName] = useState(me?.name ?? "");
    const [pw, setPw] = useState({ current: "", next: "", repeat: "" });
    const [pwBusy, setPwBusy] = useState(false);
    const { exec: execPw } = useCommand();

    const saveName = async (e) => {
        e.preventDefault();
        await exec(updateProfile, { id, name }, "Profil güncellendi.");
    };
    const savePw = async (e) => {
        e.preventDefault();
        setPwBusy(true);
        const out = await execPw(changePassword, { id, ...pw }, "Şifre değiştirildi.");
        setPwBusy(false);
        if (out.ok) setPw({ current: "", next: "", repeat: "" });
    };

    return (
        <div className="max-w-2xl space-y-5">
            <form onSubmit={saveName} noValidate>
                <FormSection title="Profilim" columns={1}>
                    <Field label="E-posta"><TextInput value={me?.email ?? user?.email ?? ""} disabled readOnly /></Field>
                    <Field label="Ad soyad" required><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
                    <div><button type="submit" disabled={busy} className="ad-btn ad-btn-primary">{busy && <Icon name="progress_activity" className="animate-spin text-[17px]" />}Kaydet</button></div>
                </FormSection>
            </form>
            <form onSubmit={savePw} noValidate>
                <FormSection title="Şifre değiştir" description="En az 8 karakter." columns={1}>
                    <Field label="Mevcut şifre" required><TextInput type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
                    <Field label="Yeni şifre" required><TextInput type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
                    <Field label="Yeni şifre (tekrar)" required><TextInput type="password" autoComplete="new-password" value={pw.repeat} onChange={(e) => setPw({ ...pw, repeat: e.target.value })} /></Field>
                    <div><button type="submit" disabled={pwBusy} className="ad-btn ad-btn-primary">{pwBusy && <Icon name="progress_activity" className="animate-spin text-[17px]" />}Şifreyi değiştir</button></div>
                </FormSection>
            </form>
        </div>
    );
}
