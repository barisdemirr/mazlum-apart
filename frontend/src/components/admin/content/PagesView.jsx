"use client";

import { useState } from "react";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import LocalizedField, { TranslateAllButton, toLocalized } from "@/components/admin/LocalizedField";
import { Badge, Card } from "@/components/admin/ui";
import { savePage } from "@/lib/admin/commands/content";
import { turkeyDate } from "@/lib/format";
import { date } from "@/lib/admin/labels";

/** Sabit sayfalar: Hakkımızda, İletişim, KVKK. İçerik boşsa sayfa sitede “yakında” olarak kalır; uydurma metin konmaz. */
export default function PagesView({ pages }) {
    const [editing, setEditing] = useState(null);
    return (
        <div>
            <p className="mb-5 max-w-2xl text-sm text-ad-muted">Sitedeki sabit sayfaların başlığı ve metni, Türkçe ve İngilizce.</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pages.map((p) => (
                    <Card key={p.key}>
                        <div className="flex items-start justify-between gap-2"><h2 className="ad-display text-lg font-semibold">{p.title.tr}</h2><Badge tone={p.body.tr ? "ok" : "warn"}>{p.body.tr ? "Dolu" : "Boş"}</Badge></div>
                        <p className="mt-2 line-clamp-3 min-h-12 text-xs text-ad-muted">{p.body.tr || "Henüz içerik girilmedi."}</p>
                        <p className="mt-2 text-[11px] text-ad-faint">{p.updatedAt ? `Son güncelleme ${date(turkeyDate(p.updatedAt))}` : ""}{p.body.tr && !p.body.en ? " · İngilizcesi eksik" : ""}</p>
                        <button type="button" onClick={() => setEditing(p)} className="ad-btn ad-btn-outline mt-4 w-full">Düzenle</button>
                    </Card>
                ))}
            </div>
            {editing && <PageDialog page={editing} onClose={() => setEditing(null)} />}
        </div>
    );
}

function PageDialog({ page, onClose }) {
    const { exec, busy } = useCommand();
    const [title, setTitle] = useState(toLocalized(page.title));
    const [body, setBody] = useState(toLocalized(page.body));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(savePage, { key: page.key, title, body }, "Sayfa kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open size="xl" title={page.title.tr} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" columns={1} footer={<div className="me-auto"><TranslateAllButton fields={[{ name: "title", label: "Başlık", value: title, set: setTitle }, { name: "body", label: "Metin", value: body, set: setBody }]} /></div>}>
            <LocalizedField label="Başlık" name="title" required value={title} onChange={setTitle} />
            <LocalizedField label="Metin" name="body" multiline rows={14} value={body} onChange={setBody} hint="Paragraflar arasına boş satır bırakın." />
        </FormDialog>
    );
}
