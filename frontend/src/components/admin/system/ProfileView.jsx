"use client";

import { useState } from "react";
import { Card, PageHeader } from "@/components/admin/ui";
import { Field, TextInput } from "@/components/admin/fields";
import useCommand from "@/components/admin/useCommand";
import { changePassword, updateProfile } from "@/lib/admin/commands/finance";

/** Kendi adınızı ve şifrenizi güncelleyin. Şifre değişince diğer cihazlardaki oturumlar kapanır. */
export default function ProfileView({ me }) {
    const { exec, busy } = useCommand();
    const [name, setName] = useState(me.name);
    const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
    return (
        <div>
            <PageHeader title="Profilim" description={me.email} />
            <div className="grid gap-5 lg:grid-cols-2">
                <Card title="Bilgiler"><form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); exec(updateProfile, { name }, "Profil güncellendi."); }}>
                    <Field label="Ad soyad" required><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
                    <button type="submit" disabled={busy} className="ad-btn ad-btn-primary">Kaydet</button></form></Card>
                <Card title="Şifre değiştir"><form className="mt-4 space-y-3" onSubmit={async (e) => { e.preventDefault(); const out = await exec(changePassword, pw, "Şifre değiştirildi."); if (out.ok) setPw({ currentPassword: "", newPassword: "" }); }}>
                    <Field label="Mevcut şifre" required><TextInput type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
                    <Field label="Yeni şifre" required hint="En az 8 karakter."><TextInput type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
                    <button type="submit" disabled={busy} className="ad-btn ad-btn-primary">Şifreyi değiştir</button></form></Card>
            </div>
        </div>
    );
}
