"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import LocalizedField, { TranslateAllButton, toLocalized } from "@/components/admin/LocalizedField";
import MediaPicker from "@/components/admin/content/MediaPicker";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { Field, NumberInput, Switch, TextInput } from "@/components/admin/fields";
import { saveRoomType } from "@/lib/admin/domain/config";
import { money } from "@/lib/admin/labels";
import ListEditor from "./ListEditor";
import GalleryDialog from "./GalleryDialog";

/** Oda tipleri: sitede görünen tanıtım içeriği. Fiyatlar dönemden döneme değiştiği için Dönemler & Fiyatlar sayfasındadır. */
export default function RoomTypesView() {
    const { state, period } = useAdmin();
    const [editing, setEditing] = useState(null); // null | "new" | roomType
    const [galleryFor, setGalleryFor] = useState(null); // roomTypeId

    const info = (rt) => {
        const rooms = state.rooms.filter((r) => r.roomTypeId === rt.id);
        return { rooms: rooms.length, beds: rooms.filter((r) => r.status === "active").reduce((s, r) => s + r.beds, 0), price: state.roomTypePrices.find((p) => p.periodId === period.id && p.roomTypeId === rt.id) };
    };

    return (
        <div>
            <PageHeader
                title="Oda Tipleri"
                description="Sitede görünen oda tipi içerikleri: ad, açıklama, özellikler, görsel ve “dairede kaç kişi kalıyor” bilgisi. Boş bırakılan bölümler sitede gösterilmez."
                actions={<button type="button" onClick={() => setEditing("new")} className="ad-btn ad-btn-primary"><Icon name="add" className="text-[20px]" />Oda tipi ekle</button>}
            />
            {state.roomTypes.length === 0 ? <EmptyState icon="meeting_room" title="Oda tipi yok" description="İlk oda tipini ekleyin." /> : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {state.roomTypes.map((rt) => {
                        const i = info(rt);
                        return (
                            <Card key={rt.id} padded={false} className="overflow-hidden">
                                <div className="aspect-[16/9] bg-ad-sunken">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {rt.image?.url ? <img src={rt.image.url} alt={rt.name.tr} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-ad-faint"><Icon name="image" className="text-[40px]" /></div>}
                                </div>
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0"><h2 className="ad-display truncate text-xl font-semibold">{rt.name.tr}</h2><p className="truncate text-xs text-ad-muted">{rt.name.en || "İngilizce adı yok"}</p></div>
                                        {!rt.active && <Badge tone="neutral">Pasif</Badge>}
                                    </div>
                                    <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                                        <div className="rounded-xl bg-ad-sunken py-2"><dd className="ad-num text-base font-extrabold">{i.rooms}</dd><dt className="text-[10px] font-bold uppercase text-ad-muted">Oda</dt></div>
                                        <div className="rounded-xl bg-ad-sunken py-2"><dd className="ad-num text-base font-extrabold">{i.beds}</dd><dt className="text-[10px] font-bold uppercase text-ad-muted">Yatak</dt></div>
                                        <div className="rounded-xl bg-ad-sunken py-2"><dd className="ad-num text-base font-extrabold">{i.price ? money(i.price.monthly) : "—"}</dd><dt className="text-[10px] font-bold uppercase text-ad-muted">Aylık</dt></div>
                                    </dl>
                                    <p className="mt-3 text-xs text-ad-muted">{rt.features.length} oda özelliği · {rt.sharedAreas.length} ortak alan{rt.peopleInFlat ? ` · dairede ${rt.peopleInFlat} kişi` : ""}</p>
                                    <p className="mt-1 text-xs text-ad-muted" data-gallery-count>
                                        {(rt.gallery ?? []).filter((g) => g.type !== "video").length} fotoğraf · {(rt.gallery ?? []).some((g) => g.type === "video") ? "1 video" : <span className="text-ad-warn">video yok</span>}
                                    </p>
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <button type="button" onClick={() => setGalleryFor(rt.id)} className="ad-btn ad-btn-soft"><Icon name="photo_library" className="text-[18px]" />Galeri</button>
                                        <button type="button" onClick={() => setEditing(rt)} className="ad-btn ad-btn-outline"><Icon name="edit" className="text-[18px]" />Düzenle</button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
            {galleryFor && <GalleryDialog roomTypeId={galleryFor} onClose={() => setGalleryFor(null)} />}
            {editing && <RoomTypeDialog roomType={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
        </div>
    );
}

function RoomTypeDialog({ roomType, onClose }) {
    const { state } = useAdmin();
    const { exec, busy } = useCommand();
    const [f, setF] = useState(() => ({
        name: toLocalized(roomType?.name), description: toLocalized(roomType?.description),
        peopleInFlat: roomType?.peopleInFlat ?? "", peopleSharingKitchen: roomType?.peopleSharingKitchen ?? "", peopleSharingBathroom: roomType?.peopleSharingBathroom ?? "",
        features: roomType?.features ?? [], sharedAreas: roomType?.sharedAreas ?? [], mediaId: roomType?.image?.mediaId ?? null, active: roomType?.active ?? true,
    }));
    const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
    const num = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        const media = state.media.find((m) => m.id === f.mediaId);
        const out = await exec(saveRoomType, { id: roomType?.id, ...f, image: media ? { mediaId: media.id, url: media.url } : null }, "Oda tipi kaydedildi.");
        if (out.ok) onClose();
    };

    const translatable = [
        { name: "name", label: "Ad", value: f.name, set: set("name") },
        { name: "description", label: "Açıklama", value: f.description, set: set("description") },
        ...f.features.map((it, i) => ({ name: `feat-${i}`, label: "Özellik", value: it.text, set: (v) => set("features")(f.features.map((x, idx) => (idx === i ? { ...x, text: v } : x))) })),
        ...f.sharedAreas.map((it, i) => ({ name: `shared-${i}`, label: "Ortak alan", value: it.text, set: (v) => set("sharedAreas")(f.sharedAreas.map((x, idx) => (idx === i ? { ...x, text: v } : x))) })),
    ];

    return (
        <FormDialog open size="xl" title={roomType ? "Oda tipini düzenle" : "Oda tipi ekle"} description={roomType ? roomType.name.tr : "Fiyatı Dönemler & Fiyatlar sayfasından girersiniz."} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" columns={1}
            footer={<div className="me-auto"><TranslateAllButton fields={translatable} /></div>}>
            <LocalizedField label="Oda tipi adı" name="name" required value={f.name} onChange={set("name")} />
            <LocalizedField label="Açıklama" name="description" multiline rows={4} value={f.description} onChange={set("description")} hint="İsteğe bağlı; oda sayfasında görünür." />
            <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Dairede kalan kişi" hint="Tanıtım bilgisi"><NumberInput min="0" value={f.peopleInFlat} onChange={num("peopleInFlat")} /></Field>
                <Field label="Mutfağı paylaşan" hint="Tanıtım bilgisi"><NumberInput min="0" value={f.peopleSharingKitchen} onChange={num("peopleSharingKitchen")} /></Field>
                <Field label="Banyoyu paylaşan" hint="Tanıtım bilgisi"><NumberInput min="0" value={f.peopleSharingBathroom} onChange={num("peopleSharingBathroom")} /></Field>
            </div>
            <Field label="Kapak görseli"><MediaPicker value={f.mediaId} onChange={set("mediaId")} allowNone /></Field>
            <ListEditor title="Oda özellikleri" hint="Yatak, çalışma masası, gardırop…" prefix="feat" items={f.features} onChange={set("features")} />
            <ListEditor title="Ortak alanlar" hint="Mutfak, banyo, balkon…" prefix="shared" items={f.sharedAreas} onChange={set("sharedAreas")} />
            <Switch checked={f.active} onChange={set("active")} label="Sitede ve başvuruda göster" hint="Kapalıysa yeni başvurularda seçilemez; mevcut kayıtlar etkilenmez." />
        </FormDialog>
    );
}
