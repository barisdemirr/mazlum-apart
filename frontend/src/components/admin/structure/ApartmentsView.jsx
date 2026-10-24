"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import DeleteImpactDialog from "@/components/admin/DeleteImpactDialog";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import { Badge, Card, EmptyState, PageHeader, StatusBadge } from "@/components/admin/ui";
import { Field, NumberInput, SelectInput, Switch, TextInput } from "@/components/admin/fields";
import { apartmentDeleteImpact, deleteApartment, deleteRoom, duplicateApartment, roomDeleteImpact, saveApartment, saveRoom } from "@/lib/admin/commands/structure";
import LocalizedField, { TranslateAllButton, toLocalized } from "@/components/admin/LocalizedField";
import ListEditor from "./ListEditor";
import { ROOM_STATUS } from "@/lib/admin/labels";
import ExportButton from "@/components/admin/ExportButton";
import GalleryDialog from "./GalleryDialog";

export default function ApartmentsView({ apartments, roomTypes, occupancy, apartmentTypes = [] }) {
    const { exec } = useCommand();
    const [dialog, setDialog] = useState(null); // {type:"apt"|"room"|"gallery", item?, apartmentId?}
    const [removing, setRemoving] = useState(null); // {type, item}

    const allRooms = apartments.flatMap((a) => a.rooms.map((r) => ({ ...r, apartmentId: a.id })));
    const typeName = (id) => roomTypes.find((r) => r.id === id)?.name.tr ?? "";
    const takenByRoom = new Map(occupancy.apartments.flatMap((a) => a.rooms.map((r) => [r.id, r.occupants.length])));
    const taken = (roomId) => takenByRoom.get(roomId) ?? 0;
    const totalBeds = allRooms.filter((r) => r.status === "active").reduce((s, r) => s + r.beds, 0);

    const exportRows = apartments.flatMap((apt) => apt.rooms.map((r) => ({ r, apt })));
    const exportColumns = [
        { key: "apt", header: "Daire", export: { value: ({ apt }) => apt?.name ?? "" } },
        { key: "aptType", header: "Daire türü", export: { value: ({ apt }) => apt?.apartmentTypeName ?? "" } },
        { key: "room", header: "Oda", export: { value: ({ r }) => r.name } },
        { key: "type", header: "Oda tipi", export: { value: ({ r }) => typeName(r.roomTypeId) } },
        { key: "beds", header: "Yatak", export: { type: "number", value: ({ r }) => r.beds } },
        { key: "status", header: "Durum", export: { value: ({ r }) => ROOM_STATUS[r.status].label } },
    ];

    const confirmRemove = async () => {
        const { type, item } = removing;
        const out = await exec(type === "apt" ? deleteApartment : deleteRoom, { id: item.id }, type === "apt" ? "Daire silindi." : "Oda silindi.");
        if (out.ok) setRemoving(null);
    };

    return (
        <div>
            <PageHeader
                title="Daireler & Odalar"
                description={`${apartments.length} daire · ${allRooms.length} oda · ${totalBeds} kullanılabilir yatak. Doluluk bugünkü yerleşimlerden hesaplanır. Fotoğraf ve video her dairenin “Galeri” düğmesinden eklenir.`}
                actions={<><ExportButton name="daire-oda-listesi" columns={exportColumns} rows={exportRows} /><button type="button" onClick={() => setDialog({ type: "apt" })} className="ad-btn ad-btn-primary"><Icon name="add" className="text-[20px]" />Daire ekle</button></>}
            />
            {apartments.length === 0 ? <EmptyState icon="holiday_village" title="Daire yok" description="İlk daireyi ekleyerek başlayın." /> : (
                <div className="space-y-5">
                    {apartments.map((apt) => {
                        const rooms = apt.rooms;
                        const cap = apt.capacity;
                        return (
                            <Card key={apt.id} title={apt.name} description={[apt.floor ? `${apt.floor}. kat` : "", `${apt.kitchens} mutfak`, `${apt.bathrooms} banyo`, apt.note].filter(Boolean).join(" · ")}
                                actions={<div className="flex gap-1.5"><button type="button" onClick={() => setDialog({ type: "gallery", apartmentId: apt.id })} className="ad-btn ad-btn-soft ad-btn-sm"><Icon name="photo_library" className="text-[16px]" />Galeri</button><button type="button" onClick={() => setDialog({ type: "room", apartmentId: apt.id })} className="ad-btn ad-btn-soft ad-btn-sm"><Icon name="add" className="text-[16px]" />Oda</button><button type="button" onClick={() => setDialog({ type: "copy", item: apt })} className="ad-btn ad-btn-soft ad-btn-sm"><Icon name="content_copy" className="text-[16px]" />Kopyala</button><button type="button" onClick={() => setDialog({ type: "apt", item: apt })} className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="edit" className="text-[16px]" />Düzenle</button>{rooms.length === 0 && <button type="button" onClick={() => setRemoving({ type: "apt", item: apt })} className="ad-btn ad-btn-danger-soft ad-btn-sm">Sil</button>}</div>}>
                                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ad-muted" data-gallery-count={apt.id}>
                                    <span data-flat-capacity>Dairede {cap.beds} kişi{cap.perKitchen ? ` · mutfağı ${cap.perKitchen} kişi` : ""}{cap.perBathroom ? ` · banyoyu ${cap.perBathroom} kişi paylaşır` : ""} <span className="text-ad-faint">(yataklardan otomatik)</span></span>
                                    <span>{(apt.sharedAreas ?? []).length} ortak alan</span>
                                    <span>{apt.gallery.photos} fotoğraf · {apt.gallery.hasVideo ? "1 video" : <span className="text-ad-warn">video yok</span>}</span>
                                    {apt.gallery.untagged > 0 && <span className="text-ad-warn">{apt.gallery.untagged} etiketsiz fotoğraf var</span>}
                                    {apt.apartmentTypeName ? <Badge tone="brand">{apt.apartmentTypeName}</Badge> : <span className="text-ad-warn">Daire türü seçilmedi</span>}
                                    {apt.published === false ? <Badge tone="neutral">Sitede gizli</Badge> : <Badge tone="ok">Sitede görünür</Badge>}
                                </p>
                                <div className="ad-scroll mt-4 overflow-x-auto">
                                    <table className="ad-table">
                                        <thead><tr><th>Oda</th><th>Oda tipi</th><th className="!text-end">Yatak</th><th>Donanım</th><th className="!text-end">Bugün dolu</th><th>Durum</th><th /></tr></thead>
                                        <tbody>
                                            {rooms.map((r) => (
                                                <tr key={r.id}>
                                                    <td className="font-bold">{r.name}</td>
                                                    <td>{typeName(r.roomTypeId)}</td>
                                                    <td className="ad-num text-end">{r.beds}</td>
                                                    <td className="text-xs text-ad-muted">{(r.features ?? []).length ? `${r.features.length} özellik` : <span className="text-ad-warn">girilmedi</span>}</td>
                                                    <td className="ad-num text-end">{r.status === "active" ? `${taken(r.id)} / ${r.beds}` : "—"}</td>
                                                    <td><StatusBadge map={ROOM_STATUS} value={r.status} /></td>
                                                    <td className="whitespace-nowrap text-end"><button type="button" onClick={() => setDialog({ type: "room", item: r, apartmentId: apt.id })} className="me-3 text-xs font-bold text-ad-brand hover:underline">Düzenle</button><button type="button" onClick={() => setRemoving({ type: "room", item: r })} className="text-xs font-bold text-ad-danger hover:underline">Sil</button></td>
                                                </tr>
                                            ))}
                                            {rooms.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-sm text-ad-muted">Bu dairede henüz oda yok.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
            {dialog?.type === "apt" && <ApartmentDialog apartment={dialog.item} apartmentTypes={apartmentTypes} onClose={() => setDialog(null)} />}
            {dialog?.type === "copy" && <DuplicateDialog apartment={dialog.item} onClose={() => setDialog(null)} />}
            {dialog?.type === "gallery" && <GalleryDialog apartment={apartments.find((a) => a.id === dialog.apartmentId)} onClose={() => setDialog(null)} />}
            {dialog?.type === "room" && <RoomDialog room={dialog.item} apartmentId={dialog.apartmentId} apartments={apartments} roomTypes={roomTypes} onClose={() => setDialog(null)} />}
            <DeleteImpactDialog open={!!removing} kind={removing?.type === "apt" ? "apartment" : "room"} item={removing?.item} loadImpact={removing?.type === "apt" ? apartmentDeleteImpact : roomDeleteImpact} onConfirm={confirmRemove} onCancel={() => setRemoving(null)} />
        </div>
    );
}

function ApartmentDialog({ apartment, apartmentTypes = [], onClose }) {
    const { exec, busy } = useCommand();
    const [f, setF] = useState({ apartmentTypeId: apartment?.apartmentTypeId ?? "", slug: apartment?.slug, order: apartment?.order, name: apartment?.name ?? "", floor: apartment?.floor ?? "", kitchens: apartment?.kitchens ?? 1, bathrooms: apartment?.bathrooms ?? 1, note: apartment?.note ?? "", description: toLocalized(apartment?.description), published: apartment?.published ?? true, sharedAreas: apartment?.sharedAreas ?? [] });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const translatable = [{ name: "description", label: "Kısa açıklama", value: f.description, set: (v) => setF((x) => ({ ...x, description: v })) }, ...f.sharedAreas].map((it, i) => it.name === "description" ? it : ({ name: `shared-${i - 1}`, label: "Ortak alan", value: it.text, set: (v) => setF((x) => ({ ...x, sharedAreas: x.sharedAreas.map((s, idx) => (idx === i - 1 ? { ...s, text: v } : s)) })) }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(saveApartment, { id: apartment?.id, ...f }, "Daire kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open size="lg" title={apartment ? "Daireyi düzenle" : "Daire ekle"} description="Kişi sayıları (dairede / mutfak / banyo) yataklardan otomatik hesaplanır; elle girilmez." onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" footer={<div className="me-auto"><TranslateAllButton fields={translatable} /></div>}>
            <Field label="Daire türü" hint="Ana sayfada bu türün altında listelenir; öğrenciler türün oda seçeneklerinden seçer. Aynı türden birden fazla daire, türün kontenjanını oluşturur." className="sm:col-span-2">
                <SelectInput value={f.apartmentTypeId} onChange={set("apartmentTypeId")}>
                    <option value="">— Seçilmedi —</option>
                    {apartmentTypes.map((t) => <option key={t.id} value={t.id}>{t.name.tr}</option>)}
                </SelectInput>
            </Field>
            <Field label="Daire adı / no" required className="sm:col-span-2"><TextInput value={f.name} onChange={set("name")} placeholder="Örn. Daire 5" autoFocus /></Field>
            <div className="sm:col-span-2"><LocalizedField label="Kısa açıklama" name="description" multiline rows={3} value={f.description} onChange={(v) => setF((x) => ({ ...x, description: v }))} hint="Odalar sayfasındaki daire kartında görünür: daireyi 1-2 cümleyle anlatın (kaç kişilik, konum, öne çıkan özellik…)." /></div>
            <Field label="Kat"><NumberInput min="0" value={f.floor} onChange={set("floor")} /></Field>
            <Field label="Mutfak sayısı"><NumberInput min="0" value={f.kitchens} onChange={set("kitchens")} /></Field>
            <Field label="Banyo sayısı"><NumberInput min="0" value={f.bathrooms} onChange={set("bathrooms")} /></Field>
            <Field label="Not" className="sm:col-span-2"><TextInput value={f.note} onChange={set("note")} /></Field>
            <div className="sm:col-span-2"><ListEditor title="Ortak kullanım alanları" hint="Mutfak, banyo, balkon, salon… Bu dairedeki öğrencilerin ortak kullandığı alanlar; daire sayfasında görünür. Boş bırakılırsa gösterilmez." prefix="shared" items={f.sharedAreas} onChange={(v) => setF((x) => ({ ...x, sharedAreas: v }))} /></div>
            <div className="sm:col-span-2"><Switch checked={f.published} onChange={(v) => setF((x) => ({ ...x, published: v }))} label="Sitede göster" hint="Kapalıysa daire, oda tipi sayfasında listelenmez (yatak durumu ve yerleşim etkilenmez). Fotoğrafları hazır olunca açın." /></div>
        </FormDialog>
    );
}

function RoomDialog({ room, apartmentId, apartments, roomTypes, onClose }) {
    const { exec, busy } = useCommand();
    const [f, setF] = useState({ order: room?.order, apartmentId: room?.apartmentId ?? apartmentId, name: room?.name ?? "", roomTypeId: room?.roomTypeId ?? roomTypes[0]?.id ?? "", beds: room?.beds ?? 1, status: room?.status ?? "active", features: room?.features ?? [] });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    // Türlü dairede yalnızca o türün oda seçenekleri (ve türsüz eski oda tipleri) seçilebilir
    const aptTypeId = apartments.find((a) => a.id === f.apartmentId)?.apartmentTypeId ?? null;
    const options = roomTypes.filter((r) => !aptTypeId || !r.apartmentTypeId || r.apartmentTypeId === aptTypeId);
    const roomTypeValue = options.some((r) => r.id === f.roomTypeId) ? f.roomTypeId : options[0]?.id ?? "";
    const translatable = f.features.map((it, i) => ({ name: `feat-${i}`, label: "Özellik", value: it.text, set: (v) => setF((x) => ({ ...x, features: x.features.map((s, idx) => (idx === i ? { ...s, text: v } : s)) })) }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(saveRoom, { id: room?.id, ...f, roomTypeId: roomTypeValue }, "Oda kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open size="lg" title={room ? "Odayı düzenle" : "Oda ekle"} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" footer={<div className="me-auto"><TranslateAllButton fields={translatable} /></div>}>
            <Field label="Daire" required><SelectInput value={f.apartmentId} onChange={set("apartmentId")}>{apartments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectInput></Field>
            <Field label="Oda adı" required><TextInput value={f.name} onChange={set("name")} placeholder="Örn. 1. Sol Oda" autoFocus /></Field>
            <Field label="Oda seçeneği (oda tipi)" required hint="Fiyat bu seçeneğe göre belirlenir."><SelectInput value={roomTypeValue} onChange={set("roomTypeId")}>{options.map((r) => <option key={r.id} value={r.id}>{r.apartmentTypeName ? `${r.apartmentTypeName} · ${r.name.tr}` : r.name.tr}</option>)}</SelectInput></Field>
            <Field label="Yatak sayısı" required><NumberInput min="1" value={f.beds} onChange={set("beds")} /></Field>
            <Field label="Durum" required hint="Kapalı ya da bakımdaki oda yerleşime açılmaz ve kapasiteye sayılmaz." className="sm:col-span-2"><SelectInput value={f.status} onChange={set("status")}>{Object.entries(ROOM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</SelectInput></Field>
            <div className="sm:col-span-2"><ListEditor title="Oda özellikleri" hint="Bu odanın donanımı: yatak, çalışma masası, gardırop… Daire sayfasında bu odanın altında görünür. Boş bırakılırsa gösterilmez." prefix="feat" items={f.features} onChange={(v) => setF((x) => ({ ...x, features: v }))} /></div>
        </FormDialog>
    );
}

/** Aynı türden başka daire açmak için: dairenin bilgileri ve odaları kopyalanır (galeri kopyalanmaz, kopyalar sitede gizli açılır) */
function DuplicateDialog({ apartment, onClose }) {
    const { exec, busy } = useCommand();
    const next = apartment.name.replace(/(\d+)$/, (n) => String(Number(n) + 1).padStart(n.length, "0"));
    const [name, setName] = useState(next === apartment.name ? `${apartment.name} 2` : next);
    const [count, setCount] = useState(1);
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(duplicateApartment, { id: apartment.id, name, count }, (r) => `${r.ids?.length ?? count} daire oluşturuldu.`);
        if (out.ok) onClose();
    };
    return (
        <FormDialog open size="md" title="Daireyi kopyala" description={`${apartment.name} · ${apartment.rooms.length} oda`} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kopyala">
            <Field label="Yeni dairenin adı" required className="sm:col-span-2" hint="Birden fazla kopya açarsanız sondaki sayı artırılır (Daire 6, Daire 7…)."><TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus /></Field>
            <Field label="Kopya sayısı" required hint="En fazla 20."><NumberInput min="1" max="20" value={count} onChange={(e) => setCount(e.target.value)} /></Field>
            <div className="rounded-2xl bg-ad-warn-soft p-4 text-xs text-ad-warn sm:col-span-2">Daire türü, oda adları, oda seçenekleri, yatak sayıları ve özellikler kopyalanır. Fotoğraf/video kopyalanmaz; kopyalar “Sitede gizli” açılır, galeri eklenince açın.</div>
        </FormDialog>
    );
}
