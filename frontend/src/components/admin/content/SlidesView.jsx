"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import LocalizedField, { TranslateAllButton, toLocalized } from "@/components/admin/LocalizedField";
import { Badge, Card, EmptyState } from "@/components/admin/ui";
import { Field, Switch } from "@/components/admin/fields";
import { deleteSlide, reorderSlides, saveSlide } from "@/lib/admin/commands/content";
import { mediaUrl } from "@/lib/media";
import MediaPicker from "./MediaPicker";

/** Ana sayfa slaytı: görsel + isteğe bağlı başlık. Sıralama oklarla, kapalı slayt sitede görünmez. */
export default function SlidesView({ slides: initial }) {
    const { exec } = useCommand();
    const [editing, setEditing] = useState(null);
    const [removing, setRemoving] = useState(null);
    const slides = [...initial].sort((a, b) => a.order - b.order);
    const move = (index, direction) => {
        const ids = slides.map((x) => x.id);
        const target = direction === "up" ? index - 1 : index + 1;
        [ids[index], ids[target]] = [ids[target], ids[index]];
        return exec(reorderSlides, { ids });
    };

    const confirmRemove = async () => {
        const out = await exec(deleteSlide, { id: removing.id }, "Slayt silindi.");
        if (out.ok) setRemoving(null);
    };

    return (
        <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-2xl text-sm text-ad-muted">Ana sayfanın üstünde dönen görseller. Başlık ve alt başlık isteğe bağlıdır.</p>
                <button type="button" onClick={() => setEditing("new")} className="ad-btn ad-btn-primary"><Icon name="add" className="text-[20px]" />Slayt ekle</button>
            </div>
            {slides.length === 0 ? <EmptyState icon="slideshow" title="Slayt yok" description="Slayt eklenmezse sitede varsayılan ana görsel kullanılır." /> : (
                <ul className="space-y-3">
                    {slides.map((s, i) => {
                        return (
                            <li key={s.id}>
                                <Card padded={false}>
                                    <div className="flex flex-wrap items-center gap-4 p-4">
                                        <div className="flex flex-col gap-1">
                                            <button type="button" disabled={i === 0} onClick={() => move(i, "up")} aria-label="Yukarı" className="ad-btn ad-btn-icon ad-btn-outline !h-7 !w-7 disabled:opacity-30"><Icon name="keyboard_arrow_up" className="text-[18px]" /></button>
                                            <button type="button" disabled={i === slides.length - 1} onClick={() => move(i, "down")} aria-label="Aşağı" className="ad-btn ad-btn-icon ad-btn-outline !h-7 !w-7 disabled:opacity-30"><Icon name="keyboard_arrow_down" className="text-[18px]" /></button>
                                        </div>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {s.url ? <img src={mediaUrl(s.url, "md")} alt="" className="h-20 w-32 rounded-xl object-cover" /> : <div className="h-20 w-32 rounded-xl bg-ad-sunken" />}
                                        <div className="min-w-0 flex-1"><p className="truncate font-bold">{s.title.tr || <span className="font-normal text-ad-muted">Başlıksız slayt</span>}</p><p className="truncate text-xs text-ad-muted">{s.subtitle.tr}</p></div>
                                        <Badge tone={s.active ? "ok" : "neutral"}>{s.active ? "Yayında" : "Kapalı"}</Badge>
                                        <div className="flex gap-1.5"><button type="button" onClick={() => setEditing(s)} className="ad-btn ad-btn-outline ad-btn-sm">Düzenle</button><button type="button" onClick={() => setRemoving(s)} className="ad-btn ad-btn-danger-soft ad-btn-sm">Sil</button></div>
                                    </div>
                                </Card>
                            </li>
                        );
                    })}
                </ul>
            )}
            {editing && <SlideDialog slide={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
            <ConfirmDialog open={!!removing} title="Slayt silinsin mi?" message="Slayt kalıcı olarak kaldırılır; görsel medya kitaplığında kalır." confirmLabel="Sil" onConfirm={confirmRemove} onCancel={() => setRemoving(null)} />
        </div>
    );
}

function SlideDialog({ slide, onClose }) {
    const { exec, busy } = useCommand();
    const [f, setF] = useState({ mediaId: slide?.mediaId ?? null, title: toLocalized(slide?.title), subtitle: toLocalized(slide?.subtitle), active: slide?.active ?? true });
    const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(saveSlide, { id: slide?.id, ...f }, "Slayt kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open size="lg" title={slide ? "Slaydı düzenle" : "Slayt ekle"} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" columns={1} footer={<div className="me-auto"><TranslateAllButton fields={[{ name: "title", label: "Başlık", value: f.title, set: set("title") }, { name: "subtitle", label: "Alt başlık", value: f.subtitle, set: set("subtitle") }]} /></div>}>
            <Field label="Görsel" required><MediaPicker value={f.mediaId} onChange={set("mediaId")} /></Field>
            <LocalizedField label="Başlık" name="title" required value={f.title} onChange={set("title")} />
            <LocalizedField label="Alt başlık" name="subtitle" value={f.subtitle} onChange={set("subtitle")} />
            <Switch checked={f.active} onChange={set("active")} label="Sitede yayında" />
        </FormDialog>
    );
}
