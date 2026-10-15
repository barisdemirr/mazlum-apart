"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import ExportButton from "@/components/admin/ExportButton";
import { DateInput } from "@/components/admin/fields";
import { Avatar, Badge, Card, PageHeader, ProgressBar } from "@/components/admin/ui";
import { occupancyOn } from "@/lib/admin/domain/registration";
import { ROOM_STATUS, date } from "@/lib/admin/labels";
import PlacementDialog from "./PlacementDialog";

/** Gün bazlı doluluk. Yalnızca yerleşimler sayılır; bekleyen başvurular doluluğu etkilemez. */
export default function OccupancyView() {
    const { state, period, today } = useAdmin();
    const inPeriod = today >= period.start && today <= period.end;
    const [day, setDay] = useState(inPeriod ? today : period.start);
    const [placing, setPlacing] = useState(null);

    // Dönem değişince seçili gün dönem dışında kalmasın
    const shown = day < period.start || day > period.end ? (inPeriod ? today : period.start) : day;
    const occ = useMemo(() => occupancyOn(state, period.id, shown), [state, period.id, shown]);

    const waiting = state.enrollments
        .filter((e) => e.periodId === period.id && ["approved", "active"].includes(e.status) && !state.placements.some((p) => p.enrollmentId === e.id))
        .map((e) => ({ enrollment: e, student: state.students.find((s) => s.id === e.studentId), roomType: state.roomTypes.find((r) => r.id === e.roomTypeId) }));

    const closed = period.status === "closed";
    const typeOf = (id) => state.roomTypes.find((r) => r.id === id)?.name.tr ?? "";

    const exportColumns = [
        { key: "apt", header: "Daire", export: { value: (r) => r.apt } },
        { key: "room", header: "Oda", export: { value: (r) => r.room } },
        { key: "type", header: "Oda tipi", export: { value: (r) => r.type } },
        { key: "status", header: "Durum", export: { value: (r) => r.status } },
        { key: "beds", header: "Yatak", export: { type: "number", value: (r) => r.beds } },
        { key: "taken", header: "Dolu", export: { type: "number", value: (r) => r.taken } },
        { key: "who", header: "Kalanlar", export: { value: (r) => r.who, width: 40 } },
    ];
    const exportRows = occ.rooms.map((r) => {
        const apt = state.apartments.find((a) => a.id === r.room.apartmentId);
        return {
            apt: apt?.name ?? "", room: r.room.name, type: typeOf(r.room.roomTypeId), status: ROOM_STATUS[r.room.status].label,
            beds: r.room.beds, taken: r.occupants.length, who: r.occupants.map((o) => `${o.student?.firstName} ${o.student?.lastName}`).join(", "),
        };
    });

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
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Yerleşmeyi bekleyen</p><p className="ad-num mt-2 text-3xl font-extrabold text-ad-warn">{waiting.length}</p></Card>
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
                                {!closed && <button type="button" onClick={() => setPlacing(enrollment)} className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="bed" className="text-[18px]" />Yerleştir</button>}
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <div className="grid gap-5 lg:grid-cols-2">
                {occ.apartments.map(({ apartment, rooms, beds, taken, free }) => (
                    <Card key={apartment.id} title={apartment.name} description={apartment.address || undefined} actions={<Badge tone={free === 0 && beds > 0 ? "danger" : "ok"}>{taken}/{beds} dolu</Badge>}>
                        <ul className="mt-4 space-y-2.5">
                            {rooms.map(({ room, occupants, usable }) => (
                                <li key={room.id} className={`rounded-2xl border p-3.5 ${usable ? "border-ad-line" : "border-dashed border-ad-line bg-ad-sunken"}`}>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-bold">{room.name} <span className="text-xs font-medium text-ad-muted">· {typeOf(room.roomTypeId)}</span></p>
                                        {usable ? <span className="ad-num text-xs font-bold text-ad-muted">{occupants.length}/{room.beds}</span> : <Badge tone={ROOM_STATUS[room.status].tone}>{ROOM_STATUS[room.status].label}</Badge>}
                                    </div>
                                    {usable && (
                                        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                            {Array.from({ length: room.beds }).map((_, i) => {
                                                const o = occupants[i];
                                                return o ? (
                                                    <li key={i}>
                                                        <Link href={`/admin/ogrenciler/${o.enrollment.id}`} className="flex items-center gap-2 rounded-xl bg-ad-brand-soft px-2.5 py-1.5 text-xs font-bold text-ad-brand-dark hover:underline">
                                                            <Icon name="person" className="text-[16px]" />
                                                            <span className="truncate">{o.student?.firstName} {o.student?.lastName}</span>
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
                            ))}
                        </ul>
                    </Card>
                ))}
            </div>

            {placing && <PlacementDialog enrollment={placing} mode="place" onClose={() => setPlacing(null)} />}
        </div>
    );
}
