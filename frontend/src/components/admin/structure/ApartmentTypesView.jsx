"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import LocalizedField, { TranslateAllButton, toLocalized } from "@/components/admin/LocalizedField";
import MediaPicker from "@/components/admin/content/MediaPicker";
import { RoomTypeDialog } from "@/components/admin/structure/RoomTypesView";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { Field, Switch } from "@/components/admin/fields";
import { deleteApartmentType, saveApartmentType } from "@/lib/admin/commands/structure";
import { mediaUrl } from "@/lib/media";
import { money } from "@/lib/admin/labels";

/**
 * Daire türleri: sitenin ana sayfasında listelenen kategoriler. Her türün altında oda seçenekleri (kendi fiyatlarıyla)
 * ve aynı türden fiziksel daireler bulunur. Kontenjan türdeki daire ve odalardan hesaplanır.
 */
export default function ApartmentTypesView({ apartmentTypes }) {
    const [editing, setEditing] = useState(null); // null | "new" | type
    const [option, setOption] = useState(null); // { typeId }
    const [removing, setRemoving] = useState(null);
    const { exec } = useCommand();

    const confirmRemove = async () => {
        const out = await exec(deleteApartmentType, { id: removing.id }, "Daire türü silindi.");
        if (out.ok) setRemoving(null);
    };

    return (
        <div>
            <PageHeader
                title="Daire Türleri"
                description="Sitenin ana sayfasında listelenen daire türleri. Türün altına oda seçenekleri (balkonlu/balkonsuz, zemin kat/üst kat…) eklenir ve her seçeneğin kendi fiyatı olur. Aynı türden birden fazla daire varsa Daireler & Odalar sayfasında dairenin yanındaki “Kopyala” ile çoğaltılır; kontenjan oradan otomatik hesaplanır."
                actions={<button type="button" onClick={() => setEditing("new")} className="ad-btn ad-btn-primary"><Icon name="add" className="text-[20px]" />Daire türü ekle</button>}
            />
            {apartmentTypes.length === 0 ? <EmptyState icon="apartment" title="Daire türü yok" description="İlk daire türünü ekleyin, sonra Daireler & Odalar sayfasında dairelerin türünü seçin." /> : (
                <div className="grid gap-5 lg:grid-cols-2">
                    {apartmentTypes.map((t) => (
                        <Card key={t.id} padded={false} className="overflow-hidden">
                            <div className="aspect-[16/6] bg-ad-sunken">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {t.coverUrl ? <img src={mediaUrl(t.coverUrl, "md")} alt={t.name.tr} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-ad-faint"><Icon name="image" className="text-[40px]" /></div>}
                            </div>
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0"><h2 className="ad-display truncate text-xl font-semibold">{t.name.tr}</h2><p className="truncate text-xs text-ad-muted">{t.name.en || "İngilizce adı yok"}</p></div>
                                    {!t.active && <Badge tone="neutral">Pasif</Badge>}
                                </div>
                                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-xl bg-ad-sunken py-2"><dd className="ad-num text-base font-extrabold">{t.apartments}</dd><dt className="text-[10px] font-bold uppercase text-ad-muted">Daire</dt></div>
                                    <div className="rounded-xl bg-ad-sunken py-2"><dd className="ad-num text-base font-extrabold">{t.rooms}</dd><dt className="text-[10px] font-bold uppercase text-ad-muted">Oda</dt></div>
                                    <div className="rounded-xl bg-ad-sunken py-2"><dd className="ad-num text-base font-extrabold">{t.beds}</dd><dt className="text-[10px] font-bold uppercase text-ad-muted">Yatak</dt></div>
                                </dl>
                                <div className="mt-4">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-ad-muted">Oda seçenekleri</p>
                                    {t.options.length === 0 ? <p className="mt-2 text-sm text-ad-warn">Henüz seçenek yok; öğrenci oda seçemez.</p> : (
                                        <ul className="mt-2 divide-y divide-ad-line text-sm">
                                            {t.options.map((o) => (
                                                <li key={o.id} className={`flex items-center justify-between gap-3 py-2 ${o.active ? "" : "opacity-50"}`}>
                                                    <span className="min-w-0"><b className="block truncate">{o.name.tr}</b><span className="text-[11px] text-ad-muted">{o.rooms} oda · {o.beds} yatak</span></span>
                                                    <span className="ad-num shrink-0 text-end font-bold">{o.monthly != null ? money(o.monthly) : <Badge tone="warn">Fiyat yok</Badge>}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    <p className="mt-2 text-[11px] text-ad-muted">Fiyatlar seçili dönemindir; <Link href="/admin/donemler" className="font-bold text-ad-brand hover:underline">Dönemler & Fiyatlar</Link> sayfasından girilir.</p>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setOption({ typeId: t.id })} className="ad-btn ad-btn-soft"><Icon name="add" className="text-[18px]" />Oda seçeneği ekle</button>
                                    <button type="button" onClick={() => setEditing(t)} className="ad-btn ad-btn-outline"><Icon name="edit" className="text-[18px]" />Düzenle</button>
                                    {t.apartments === 0 && t.options.length === 0 && <button type="button" onClick={() => setRemoving(t)} className="ad-btn ad-btn-danger-soft">Sil</button>}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            {editing && <ApartmentTypeDialog type={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
            {option && <RoomTypeDialog roomType={null} apartmentTypes={apartmentTypes} defaultApartmentTypeId={option.typeId} onClose={() => setOption(null)} />}
            <ConfirmDialog open={!!removing} title="Daire türü silinsin mi?" message={removing ? `${removing.name.tr} kalıcı olarak silinecek.` : ""} confirmLabel="Sil" onConfirm={confirmRemove} onCancel={() => setRemoving(null)} />
        </div>
    );
}

function ApartmentTypeDialog({ type, onClose }) {
    const { exec, busy } = useCommand();
    const [f, setF] = useState(() => ({
        name: toLocalized(type?.name), description: toLocalized(type?.description),
        mediaId: type?.coverMediaId ?? null, active: type?.active ?? true,
    }));
    const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(saveApartmentType, { id: type?.id, slug: type?.slug, order: type?.order, ...f }, "Daire türü kaydedildi.");
        if (out.ok) onClose();
    };
    const translatable = [
        { name: "name", label: "Ad", value: f.name, set: set("name") },
        { name: "description", label: "Açıklama", value: f.description, set: set("description") },
    ];

    return (
        <FormDialog open size="xl" title={type ? "Daire türünü düzenle" : "Daire türü ekle"} description={type ? type.name.tr : "Örn. 2+1 Salonlu, 1+1 Tek Kişilik"} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" columns={1}
            footer={<div className="me-auto"><TranslateAllButton fields={translatable} /></div>}>
            <LocalizedField label="Daire türü adı" name="name" required value={f.name} onChange={set("name")} />
            <LocalizedField label="Açıklama" name="description" multiline rows={4} value={f.description} onChange={set("description")} hint="Türün tanıtımı (isteğe bağlı): kaç kişilik, salon/balkon durumu, kimler için uygun…" />
            <Field label="Kapak görseli" hint="Ana sayfadaki tür kartında görünür."><MediaPicker value={f.mediaId} onChange={set("mediaId")} allowNone /></Field>
            <Switch checked={f.active} onChange={set("active")} label="Sitede ve başvuruda göster" hint="Kapalıysa ana sayfada listelenmez ve yeni başvuruda seçilemez; mevcut kayıtlar etkilenmez." />
        </FormDialog>
    );
}
