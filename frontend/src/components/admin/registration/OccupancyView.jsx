"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import ExportButton from "@/components/admin/ExportButton";
import { DateInput } from "@/components/admin/fields";
import { Avatar, Badge, Card, PageHeader, ProgressBar } from "@/components/admin/ui";
import { ROOM_STATUS, date } from "@/lib/admin/labels";
import PlacementDialog from "./PlacementDialog";

/** Gün bazlı doluluk. Yalnızca yerleşimler sayılır; bekleyen başvurular doluluğu etkilemez. */
export default function OccupancyView({ occupancy, waiting }) {
    const router = useRouter();
    const { period } = useAdmin();
    const [placing, setPlacing] = useState(null);

    const shown = occupancy.day;
    const occ = occupancy;
    const setDay = (value) => router.replace(`/admin/yerlesim?day=${value}`);
    const closed = period.status === "closed";

    const exportColumns = [
        { key: "apt", header: "Daire", export: { value: (r) => r.apt } },
        { key: "room", header: "Oda", export: { value: (r) => r.room } },
        { key: "type", header: "Oda tipi", export: { value: (r) => r.type } },
        { key: "status", header: "Durum", export: { value: (r) => r.status } },
        { key: "beds", header: "Yatak", export: { type: "number", value: (r) => r.beds } },
        { key: "taken", header: "Dolu", export: { type: "number", value: (r) => r.taken } },
        { key: "who", header: "Kalanlar", export: { value: (r) => r.who, width: 40 } },
    ];
    const exportRows = occ.apartments.flatMap((a) =>
        a.rooms.map((r) => ({
            apt: a.name, room: r.name, type: r.roomTypeName, status: ROOM_STATUS[r.status].label,
            beds: r.beds, taken: r.occupants.length, who: r.occupants.map((o) => o.name).join(", "),
        }))
    );

    return (
        <div>
            <PageHeader
                title="Yerleşim & Doluluk"
                description="Seçilen günde hangi odada kimin kaldığı. Doluluk yerleşimlerden hesaplanır; sayı elle yazılmaz."
                actions={
                    <>
                        <div className="w-44"><DateInput value={shown} min={period.start} max={period.end} onChange={(e) => e.target.value && setDay(e.target.value)} /></div>
                        <ExportButton name="doluluk" columns={exportColumns} rows={exportRows} />
                    </>
                }
            />

            <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Doluluk · {date(shown)}</p><p className="ad-num mt-2 text-3xl font-extrabold">%{Math.round(occ.totals.rate * 100)}</p><ProgressBar value={occ.totals.rate} className="mt-3" /></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Dolu yatak</p><p className="ad-num mt-2 text-3xl font-extrabold">{occ.totals.taken}<span className="text-base font-semibold text-ad-muted"> / {occ.totals.beds}</span></p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Boş yatak</p><p className="ad-num mt-2 text-3xl font-extrabold text-ad-ok">{occ.totals.free}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Yerleşmeyi bekleyen</p><p className="ad-num mt-2 text-3xl font-extrabold text-ad-warn">{occ.waitingPlacement}</p></Card>
            </div>

            {waiting.length > 0 && (
                <Card title="Yerleşmeyi bekleyenler" description="Kaydı onaylanmış ama henüz odası olmayan öğrenciler." className="mb-5">
                    <ul className="mt-4 divide-y divide-ad-line">
                        {waiting.map(({ enrollment, student, roomType }) => (
                            <li key={enrollment.id} className="flex flex-wrap items-center gap-3 py-3">
                                <Avatar name={`${student.firstName} ${student.lastName}`} />
                                <div className="min-w-0 flex-1">
                                    <Link href={`/admin/ogrenciler/${enrollment.id}`} className="font-bold hover:text-ad-brand">{student.firstName} {student.lastName}</Link>
                                    <p className="text-xs text-ad-muted">{roomType?.name.tr} · giriş {date(enrollment.entryDate)}</p>
                                </div>
                                {!closed && <button type="button" onClick={() => setPlacing({ ...enrollment, studentName: `${student.firstName} ${student.lastName}` })} className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="bed" className="text-[18px]" />Yerleştir</button>}
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
                {occ.apartments.map(({ id, name, rooms, beds, taken, free }) => (
                    <Card key={id} title={name} actions={<Badge tone={free === 0 && beds > 0 ? "danger" : "ok"}>{taken}/{beds} dolu</Badge>}>
                        <ul className="mt-4 space-y-2.5">
                            {rooms.map((room) => { const { occupants, usable } = room; return (
                                <li key={room.id} className={`rounded-2xl border p-3.5 ${usable ? "border-ad-line" : "border-dashed border-ad-line bg-ad-sunken"}`}>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-bold">{room.name} <span className="text-xs font-medium text-ad-muted">· {room.roomTypeName}</span></p>
                                        {usable ? <span className="ad-num text-xs font-bold text-ad-muted">{occupants.length}/{room.beds}</span> : <Badge tone={ROOM_STATUS[room.status].tone}>{ROOM_STATUS[room.status].label}</Badge>}
                                    </div>
                                    {usable && (
                                        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                            {Array.from({ length: room.beds }).map((_, i) => {
                                                const o = occupants[i];
                                                return o ? (
                                                    <li key={i}>
                                                        <Link href={`/admin/ogrenciler/${o.enrollmentId}`} className="flex items-center gap-2 rounded-xl bg-ad-brand-soft px-2.5 py-1.5 text-xs font-bold text-ad-brand-dark hover:underline">
                                                            <Icon name="person" className="text-[16px]" />
                                                            <span className="truncate">{o.name}</span>
                                                        </Link>
                                                    </li>
                                                ) : (
                                                    <li key={i} className="flex items-center gap-2 rounded-xl border border-dashed border-ad-line px-2.5 py-1.5 text-xs font-semibold text-ad-faint">
                                                        <Icon name="bed" className="text-[16px]" />Boş yatak
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </li>
                            ); })}
                        </ul>
                    </Card>
                ))}
            </div>

            {placing && <PlacementDialog enrollment={placing} mode="place" onClose={() => setPlacing(null)} />}
        </div>
    );
}
