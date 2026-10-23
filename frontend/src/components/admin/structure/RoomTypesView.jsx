"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import LocalizedField, { TranslateAllButton, toLocalized } from "@/components/admin/LocalizedField";
import MediaPicker from "@/components/admin/content/MediaPicker";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { Field, SelectInput, Switch } from "@/components/admin/fields";
import { saveRoomType } from "@/lib/admin/commands/structure";
import { mediaUrl } from "@/lib/media";
import { money } from "@/lib/admin/labels";

/** Oda tipleri: sitede görünen tanıtım içeriği. Fiyatlar dönemden döneme değiştiği için Dönemler & Fiyatlar sayfasındadır. */
export default function RoomTypesView({ roomTypes, apartmentTypes = [] }) {
    const [editing, setEditing] = useState(null); // null | "new" | roomType

    return (
        <div>
            <PageHeader
                title="Oda Tipleri"
                description="Her oda tipi bir daire türünün “oda seçeneğidir” (örn. Balkonlu 2 kişilik, Zemin kat tek kişilik) ve kendi fiyatı vardır; fiyat Dönemler & Fiyatlar sayfasından girilir. Kategori düzeyinde içerik: ad, açıklama, özellikler, kapak görseli. Fotoğraf ve video DAİRELERE eklenir (Daireler & Odalar sayfası); çünkü aynı tipte birden fazla daire olabilir. Boş bırakılan bölümler sitede gösterilmez."
                actions={<button type="button" onClick={() => setEditing("new")} className="ad-btn ad-btn-primary"><Icon name="add" className="text-[20px]" />Oda tipi ekle</button>}
            />
            {roomTypes.length === 0 ? <EmptyState icon="meeting_room" title="Oda tipi yok" description="İlk oda tipini ekleyin." /> : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {roomTypes.map((rt) => {
                        return (
                            <Card key={rt.id} padded={false} className="overflow-hidden">
                                <div className="aspect-[16/9] bg-ad-sunken">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {rt.coverUrl ? <img src={mediaUrl(rt.coverUrl, "md")} alt={rt.name.tr} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-ad-faint"><Icon name="image" className="text-[40px]" /></div>}
                                </div>
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0"><h2 className="ad-display truncate text-xl font-semibold">{rt.name.tr}</h2><p className="truncate text-[11px] font-bold text-ad-brand">{rt.apartmentTypeName ?? "Daire türü atanmamış"}</p><p className="truncate text-xs text-ad-muted">{rt.name.en || "İngilizce adı yok"}</p></div>
                                        {!rt.active && <Badge tone="neutral">Pasif</Badge>}
                                    </div>
                                    <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                                        <div className="rounded-xl bg-ad-sunken py-2"><dd className="ad-num text-base font-extrabold">{rt.rooms}</dd><dt className="text-[10px] font-bold uppercase text-ad-muted">Oda</dt></div>
                                        <div className="rounded-xl bg-ad-sunken py-2"><dd className="ad-num text-base font-extrabold">{rt.beds}</dd><dt className="text-[10px] font-bold uppercase text-ad-muted">Yatak</dt></div>
                                        <div className="rounded-xl bg-ad-sunken py-2"><dd className="ad-num text-base font-extrabold">{rt.monthly != null ? money(rt.monthly) : "—"}</dd><dt className="text-[10px] font-bold uppercase text-ad-muted">Aylık</dt></div>
                                    </dl>
                                    <p className="mt-3 text-xs text-ad-muted">{rt.description?.tr ? "Açıklama girildi" : "Açıklama yok"} · {rt.coverUrl ? "kapak görseli var" : "kapak görseli yok"}</p>
                                    <button type="button" onClick={() => setEditing(rt)} className="ad-btn ad-btn-outline mt-4 w-full"><Icon name="edit" className="text-[18px]" />Düzenle</button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
            {editing && <RoomTypeDialog roomType={editing === "new" ? null : editing} apartmentTypes={apartmentTypes} onClose={() => setEditing(null)} />}
        </div>
    );
}

export function RoomTypeDialog({ roomType, apartmentTypes = [], defaultApartmentTypeId = "", onClose }) {
    const { exec, busy } = useCommand();
    const [f, setF] = useState(() => ({
        name: toLocalized(roomType?.name), description: toLocalized(roomType?.description),
        mediaId: roomType?.coverMediaId ?? null, active: roomType?.active ?? true, apartmentTypeId: roomType?.apartmentTypeId ?? defaultApartmentTypeId ?? "",
    }));
    const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(saveRoomType, { id: roomType?.id, slug: roomType?.slug, order: roomType?.order, ...f }, "Oda tipi kaydedildi.");
        if (out.ok) onClose();
    };

    const translatable = [
        { name: "name", label: "Ad", value: f.name, set: set("name") },
        { name: "description", label: "Açıklama", value: f.description, set: set("description") },
    ];

    return (
        <FormDialog open size="xl" title={roomType ? "Oda tipini düzenle" : "Oda tipi ekle"} description={roomType ? roomType.name.tr : "Fiyatı Dönemler & Fiyatlar sayfasından girersiniz."} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" columns={1}
            footer={<div className="me-auto"><TranslateAllButton fields={translatable} /></div>}>
            <Field label="Daire türü" hint="Bu oda seçeneğinin hangi daire türüne ait olduğu. Sitede o türün sayfasında, kendi fiyatıyla listelenir.">
                <SelectInput value={f.apartmentTypeId} onChange={(e) => set("apartmentTypeId")(e.target.value)}>
                    <option value="">— Atanmamış —</option>
                    {apartmentTypes.map((t) => <option key={t.id} value={t.id}>{t.name.tr}</option>)}
                </SelectInput>
            </Field>
            <LocalizedField label="Oda tipi adı" name="name" required value={f.name} onChange={set("name")} />
            <LocalizedField label="Açıklama" name="description" multiline rows={4} value={f.description} onChange={set("description")} hint="Tipin genel tanıtımı (isteğe bağlı). Daireye ve odaya özel bilgi (ortak alanlar, oda özellikleri, kişi sayıları) Daireler & Odalar sayfasındadır." />
            <Field label="Kapak görseli" hint="Tip kartlarında ve oda tipi sayfasının üstünde görünür. Buradan yeni görsel yükleyebilir, kullanılmayan görselleri silebilirsiniz."><MediaPicker value={f.mediaId} onChange={set("mediaId")} allowNone /></Field>
            <Switch checked={f.active} onChange={set("active")} label="Sitede ve başvuruda göster" hint="Kapalıysa yeni başvurularda seçilemez; mevcut kayıtlar etkilenmez." />
        </FormDialog>
    );
}
