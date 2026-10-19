"use client";

import { useState } from "react";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import LocalizedField, { TranslateAllButton, toLocalized } from "@/components/admin/LocalizedField";
import Icon from "@/components/ui/Icon";
import { Badge, Card } from "@/components/admin/ui";
import { savePage } from "@/lib/admin/commands/content";
import { toParagraphs } from "@/lib/paragraphs";
import { turkeyDate } from "@/lib/format";
import { date } from "@/lib/admin/labels";

/**
 * Hakkımızda sayfasının METNİ (Türkçe ve İngilizce). Başlık ve sayfa tasarımı sabittir.
 * Yazdığınız gibi görünür: Enter alt satıra geçer, boş satır yeni paragraf başlatır.
 * İletişim sayfası ayrı metin tutmaz; telefon, adres, Instagram ve harita "Site Ayarları"ndan gelir.
 */
export default function PagesView({ pages }) {
    const [editing, setEditing] = useState(null);
    const about = pages.find((p) => p.key === "about");

    if (!about) return <p className="text-sm text-ad-muted">Hakkımızda sayfası bulunamadı. Backend'i yeniden başlatınca otomatik oluşur.</p>;

    const paragraphs = toParagraphs(about.body.tr);

    return (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card
                title="Hakkımızda metni"
                description="Sitedeki “Hakkımızda” sayfasında görünen yazı. Yalnızca metin düzenlenir; sayfa tasarımı sabittir."
                actions={<button type="button" onClick={() => setEditing(about)} className="ad-btn ad-btn-primary"><Icon name="edit" className="text-[18px]" />Metni düzenle</button>}
            >
                <div className="mt-4 rounded-2xl border border-ad-line bg-ad-sunken/60 p-5">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge tone={about.body.tr ? "ok" : "warn"}>{about.body.tr ? "Türkçe dolu" : "Türkçe boş"}</Badge>
                        <Badge tone={about.body.en ? "ok" : "neutral"}>{about.body.en ? "İngilizce dolu" : "İngilizce yok (Türkçe gösterilir)"}</Badge>
                        <span className="text-[11px] text-ad-faint">{about.updatedAt ? `Son güncelleme ${date(turkeyDate(about.updatedAt))}` : ""}</span>
                    </div>
                    {paragraphs.length ? (
                        <div className="space-y-3 text-sm leading-relaxed text-ad-ink">
                            {paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
                        </div>
                    ) : (
                        <p className="text-sm text-ad-muted">Henüz metin girilmedi.</p>
                    )}
                </div>
            </Card>

            <Card title="Nasıl yazılır?">
                <ul className="mt-3 space-y-3 text-xs leading-relaxed text-ad-body">
                    <li className="flex gap-2"><Icon name="keyboard_return" className="text-[16px] text-ad-brand" /><span><b>Enter</b> sitede de alt satıra geçer.</span></li>
                    <li className="flex gap-2"><Icon name="segment" className="text-[16px] text-ad-brand" /><span><b>Boş satır</b> bırakırsanız yeni paragraf başlar; paragraflar arasında boşluk olur.</span></li>
                    <li className="flex gap-2"><Icon name="translate" className="text-[16px] text-ad-brand" /><span>İngilizcesi boşsa İngilizce sitede Türkçe metin gösterilir. “Tümünü çevir” ile otomatik çevirebilirsiniz.</span></li>
                    <li className="flex gap-2"><Icon name="contact_phone" className="text-[16px] text-ad-brand" /><span>Telefon, WhatsApp, adres, Instagram ve harita <b>Site Ayarları</b> sekmesinden düzenlenir; İletişim sayfası oradan beslenir.</span></li>
                </ul>
            </Card>

            {editing && <PageDialog page={editing} onClose={() => setEditing(null)} />}
        </div>
    );
}

function PageDialog({ page, onClose }) {
    const { exec, busy } = useCommand();
    const [body, setBody] = useState(toLocalized(page.body));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(savePage, { key: page.key, body }, "Metin kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open size="xl" title={`${page.title.tr} metni`} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" columns={1} footer={<div className="me-auto"><TranslateAllButton fields={[{ name: "body", label: "Metin", value: body, set: setBody }]} /></div>}>
            <LocalizedField label="Metin" name="body" required multiline rows={16} value={body} onChange={setBody} hint="Enter alt satıra geçer; paragraflar arasına boş satır bırakın." />
        </FormDialog>
    );
}
