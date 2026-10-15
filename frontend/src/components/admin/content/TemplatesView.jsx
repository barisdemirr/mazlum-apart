"use client";

import { useState } from "react";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import LocalizedField, { TranslateAllButton } from "@/components/admin/LocalizedField";
import { Card } from "@/components/admin/ui";
import { Field, TextInput } from "@/components/admin/fields";
import { saveTemplate } from "@/lib/admin/commands/content";

const VARS = [
    ["{ad}", "Öğrencinin adı"], ["{telefon}", "Telefon"], ["{oda}", "Daire ve oda"], ["{tutar}", "Tutar"],
    ["{vade}", "Vade tarihi"], ["{kalem}", "Borç kalemi"], ["{sifre}", "İlk şifre (kayıt onayında)"], ["{konu}", "Arıza konusu"], ["{durum}", "Arıza durumu"],
];

/** WhatsApp ve SMS için hazır mesajlar. Gönderirken yine de düzenlenebilir; buradaki metin başlangıç metnidir. */
export default function TemplatesView({ templates }) {
    const [editing, setEditing] = useState(null);
    return (
        <div>
            <p className="mb-5 max-w-2xl text-sm text-ad-muted">WhatsApp ve SMS mesajlarında <code className="rounded bg-ad-sunken px-1.5">{"{ad}"}</code> gibi değişkenler gönderirken gerçek bilgiyle dolar.</p>
            <div className="grid gap-4 lg:grid-cols-2">
                {templates.map((t) => (
                    <Card key={t.id} title={t.name}>
                        <p className="mt-3 rounded-xl bg-ad-sunken p-3 text-sm leading-relaxed">{t.tr}</p>
                        <p className="mt-2 text-xs text-ad-muted">{t.en ? "İngilizcesi hazır" : "İngilizcesi eksik"}</p>
                        <button type="button" onClick={() => setEditing(t)} className="ad-btn ad-btn-outline mt-4">Düzenle</button>
                    </Card>
                ))}
            </div>
            {editing && <TemplateDialog template={editing} onClose={() => setEditing(null)} />}
        </div>
    );
}

function TemplateDialog({ template, onClose }) {
    const { exec, busy } = useCommand();
    const [name, setName] = useState(template.name);
    const [text, setText] = useState({ tr: template.tr, en: template.en });
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(saveTemplate, { id: template.id, name, tr: text.tr, en: text.en }, "Şablon kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open size="lg" title="Mesaj şablonu" description={template.name} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" columns={1} footer={<div className="me-auto"><TranslateAllButton fields={[{ name: "text", label: "Mesaj", value: text, set: setText }]} /></div>}>
            <Field label="Şablon adı" required><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <LocalizedField label="Mesaj" name="text" multiline rows={5} required value={text} onChange={setText} />
            <div>
                <p className="mb-2 text-xs font-semibold text-ad-body">Kullanılabilir değişkenler</p>
                <ul className="flex flex-wrap gap-2">{VARS.map(([v, d]) => <li key={v} title={d} className="rounded-full bg-ad-sunken px-2.5 py-1 text-xs font-semibold"><code>{v}</code> <span className="font-normal text-ad-muted">{d}</span></li>)}</ul>
            </div>
        </FormDialog>
    );
}
