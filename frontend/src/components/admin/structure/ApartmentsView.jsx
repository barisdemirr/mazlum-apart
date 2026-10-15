"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import { Badge, Card, EmptyState, PageHeader, StatusBadge } from "@/components/admin/ui";
import { Field, NumberInput, SelectInput, Switch, TextInput } from "@/components/admin/fields";
import { deleteApartment, deleteRoom, saveApartment, saveRoom } from "@/lib/admin/domain/config";
import { occupancyOn } from "@/lib/admin/domain/registration";
import { ROOM_STATUS } from "@/lib/admin/labels";
import ExportButton from "@/components/admin/ExportButton";
import GalleryDialog from "./GalleryDialog";

export default function ApartmentsView() {
    const { state, period, today } = useAdmin();
    const { exec } = useCommand();
    const [dialog, setDialog] = useState(null); // {type:"apt"|"room"|"gallery", item?, apartmentId?}
    const [removing, setRemoving] = useState(null); // {type, item}

    const day = today >= period.start && today <= period.end ? today : period.start;
    const occ = occupancyOn(state, period.id, day);
    const typeName = (id) => state.roomTypes.find((r) => r.id === id)?.name.tr ?? "";
    const taken = (roomId) => occ.rooms.find((r) => r.room.id === roomId)?.occupants.length ?? 0;
    const totalBeds = state.rooms.filter((r) => r.status === "active").reduce((s, r) => s + r.beds, 0);

    const exportRows = state.rooms.map((r) => ({ r, apt: state.apartments.find((a) => a.id === r.apartmentId) }));
    const exportColumns = [
        { key: "apt", header: "Daire", export: { value: ({ apt }) => apt?.name ?? "" } },
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
                description={`${state.apartments.length} daire · ${state.rooms.length} oda · ${totalBeds} kullanılabilir yatak. Doluluk bugünkü yerleşimlerden hesaplanır. Fotoğraf ve video her dairenin “Galeri” düğmesinden eklenir.`}
                actions={<><ExportButton name="daire-oda-listesi" columns={exportColumns} rows={exportRows} /><button type="button" onClick={() => setDialog({ type: "apt" })} className="ad-btn ad-btn-primary"><Icon name="add" className="text-[20px]" />Daire ekle</button></>}
            />
            {state.apartments.length === 0 ? <EmptyState icon="holiday_village" title="Daire yok" description="İlk daireyi ekleyerek başlayın." /> : (
                <div className="space-y-5">
                    {state.apartments.map((apt) => {
                        const rooms = state.rooms.filter((r) => r.apartmentId === apt.id);
                        return (
                            <Card key={apt.id} title={apt.name} description={[apt.floor ? `${apt.floor}. kat` : "", `${apt.kitchens} mutfak`, `${apt.bathrooms} banyo`, apt.note].filter(Boolean).join(" · ")}
                                actions={<div className="flex gap-1.5"><button type="button" onClick={() => setDialog({ type: "gallery", apartmentId: apt.id })} className="ad-btn ad-btn-soft ad-btn-sm"><Icon name="photo_library" className="text-[16px]" />Galeri</button><button type="button" onClick={() => setDialog({ type: "room", apartmentId: apt.id })} className="ad-btn ad-btn-soft ad-btn-sm"><Icon name="add" className="text-[16px]" />Oda</button><button type="button" onClick={() => setDialog({ type: "apt", item: apt })} className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="edit" className="text-[16px]" />Düzenle</button>{rooms.length === 0 && <button type="button" onClick={() => setRemoving({ type: "apt", item: apt })} className="ad-btn ad-btn-danger-soft ad-btn-sm">Sil</button>}</div>}>
                                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ad-muted" data-gallery-count={apt.id}>
                                    <span>{(apt.gallery ?? []).filter((g) => g.type !== "video").length} fotoğraf · {(apt.gallery ?? []).some((g) => g.type === "video") ? "1 video" : <span className="text-ad-warn">video yok</span>}</span>
                                    {(apt.gallery ?? []).some((g) => g.type !== "video" && !g.tag) && <span className="text-ad-warn">etiketsiz fotoğraf var</span>}
                                    {apt.published === false ? <Badge tone="neutral">Sitede gizli</Badge> : <Badge tone="ok">Sitede görünür</Badge>}
                                </p>
                                <div className="ad-scroll mt-4 overflow-x-auto">
                                    <table className="ad-table">
                                        <thead><tr><th>Oda</th><th>Oda tipi</th><th className="!text-end">Yatak</th><th className="!text-end">Bugün dolu</th><th>Durum</th><th /></tr></thead>
                                        <tbody>
                                            {rooms.map((r) => (
                                                <tr key={r.id}>
                                                    <td className="font-bold">{r.name}</td>
                                                    <td>{typeName(r.roomTypeId)}</td>
                                                    <td className="ad-num text-end">{r.beds}</td>
                                                    <td className="ad-num text-end">{r.status === "active" ? `${taken(r.id)} / ${r.beds}` : "—"}</td>
                                                    <td><StatusBadge map={ROOM_STATUS} value={r.status} /></td>
                                                    <td className="whitespace-nowrap text-end"><button type="button" onClick={() => setDialog({ type: "room", item: r, apartmentId: apt.id })} className="me-3 text-xs font-bold text-ad-brand hover:underline">Düzenle</button><button type="button" onClick={() => setRemoving({ type: "room", item: r })} className="text-xs font-bold text-ad-danger hover:underline">Sil</button></td>
                                                </tr>
                                            ))}
                                            {rooms.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-sm text-ad-muted">Bu dairede henüz oda yok.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
            {dialog?.type === "apt" && <ApartmentDialog apartment={dialog.item} onClose={() => setDialog(null)} />}
            {dialog?.type === "gallery" && <GalleryDialog apartmentId={dialog.apartmentId} onClose={() => setDialog(null)} />}
            {dialog?.type === "room" && <RoomDialog room={dialog.item} apartmentId={dialog.apartmentId} onClose={() => setDialog(null)} />}
            <ConfirmDialog open={!!removing} title={removing?.type === "apt" ? "Daire silinsin mi?" : "Oda silinsin mi?"} message={removing ? `${removing.item.name} kalıcı olarak silinecek.${removing.type === "room" ? " Geçmişte yerleşim kaydı varsa silinemez; bu durumda odayı “Kapalı” yapın." : ""}` : ""} confirmLabel="Sil" onConfirm={confirmRemove} onCancel={() => setRemoving(null)} />
        </div>
    );
}

function ApartmentDialog({ apartment, onClose }) {
    const { exec, busy } = useCommand();
    const [f, setF] = useState({ name: apartment?.name ?? "", floor: apartment?.floor ?? "", kitchens: apartment?.kitchens ?? 1, bathrooms: apartment?.bathrooms ?? 1, note: apartment?.note ?? "", published: apartment?.published ?? true });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(saveApartment, { id: apartment?.id, ...f }, "Daire kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title={apartment ? "Daireyi düzenle" : "Daire ekle"} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet">
            <Field label="Daire adı / no" required className="sm:col-span-2"><TextInput value={f.name} onChange={set("name")} placeholder="Örn. Daire 5" autoFocus /></Field>
            <Field label="Kat"><NumberInput min="0" value={f.floor} onChange={set("floor")} /></Field>
            <Field label="Mutfak sayısı"><NumberInput min="0" value={f.kitchens} onChange={set("kitchens")} /></Field>
            <Field label="Banyo sayısı"><NumberInput min="0" value={f.bathrooms} onChange={set("bathrooms")} /></Field>
            <Field label="Not" className="sm:col-span-2"><TextInput value={f.note} onChange={set("note")} /></Field>
            <div className="sm:col-span-2"><Switch checked={f.published} onChange={(v) => setF((x) => ({ ...x, published: v }))} label="Sitede göster" hint="Kapalıysa daire, oda tipi sayfasında listelenmez (yatak durumu ve yerleşim etkilenmez). Fotoğrafları hazır olunca açın." /></div>
        </FormDialog>
    );
}

function RoomDialog({ room, apartmentId, onClose }) {
    const { state } = useAdmin();
    const { exec, busy } = useCommand();
    const [f, setF] = useState({ apartmentId: room?.apartmentId ?? apartmentId, name: room?.name ?? "", roomTypeId: room?.roomTypeId ?? state.roomTypes[0]?.id ?? "", beds: room?.beds ?? 1, status: room?.status ?? "active" });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(saveRoom, { id: room?.id, ...f }, "Oda kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title={room ? "Odayı düzenle" : "Oda ekle"} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet">
            <Field label="Daire" required><SelectInput value={f.apartmentId} onChange={set("apartmentId")}>{state.apartments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectInput></Field>
            <Field label="Oda adı" required><TextInput value={f.name} onChange={set("name")} placeholder="Örn. 1. Sol Oda" autoFocus /></Field>
            <Field label="Oda tipi" required><SelectInput value={f.roomTypeId} onChange={set("roomTypeId")}>{state.roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name.tr}</option>)}</SelectInput></Field>
            <Field label="Yatak sayısı" required><NumberInput min="1" value={f.beds} onChange={set("beds")} /></Field>
            <Field label="Durum" required hint="Kapalı ya da bakımdaki oda yerleşime açılmaz ve kapasiteye sayılmaz." className="sm:col-span-2"><SelectInput value={f.status} onChange={set("status")}>{Object.entries(ROOM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</SelectInput></Field>
        </FormDialog>
    );
}
