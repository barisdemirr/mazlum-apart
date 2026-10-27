"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import ExportButton from "@/components/admin/ExportButton";
import { DateInput } from "@/components/admin/fields";
import { Avatar, Badge, Card, Chips, EmptyState, PageHeader, ProgressBar } from "@/components/admin/ui";
import { ROOM_STATUS, date } from "@/lib/admin/labels";
import { STAY, apartmentLook } from "@/lib/admin/presence";
import ApartmentSettingsDialog from "./ApartmentSettingsDialog";
import DepartureDialog from "./DepartureDialog";
import PlacementDialog from "./PlacementDialog";
import VacancyPanel from "./VacancyPanel";

/** Filtreler: occ = öğrenci bazlı (eşleşen öğrencisi olan daireler kalır), apt = daire bazlı */
const RETURN_SOON_DAYS = 7;
const FILTERS = [
    { value: "all", label: "Tümü" },
    { value: "exit_confirmed", label: "Kesin çıkış yapanlar", occ: (o) => o.presence.state === "exit_confirmed" },
    { value: "exit_reported", label: "Onay bekleyen çıkışlar", occ: (o) => o.presence.state === "exit_reported" },
    { value: "vacated", label: "Tamamen boşalan daireler", apt: (a) => a.presence.state === "fully_vacated" },
    { value: "away", label: "Geçici ayrılanlar", occ: (o) => o.presence.state === "temporary_away" },
    { value: "temp_empty", label: "Geçici olarak tamamen boş daireler", apt: (a) => a.presence.state === "temporarily_empty" },
    { value: "return_soon", label: "Dönüşü yaklaşan ya da geciken", occ: (o) => o.presence.state === "temporary_away" && o.presence.leave && (o.presence.leave.overdue || (o.presence.leave.returnInDays ?? 99) <= RETURN_SOON_DAYS) },
    { value: "prep", label: "Temizlik / tadilat bekleyen", apt: (a) => ["needs_cleaning", "needs_repair"].includes(a.presence.readiness) },
    { value: "boiler_off", label: "Kombisi kapalı daireler", apt: (a) => !a.presence.boilerOn },
];

const occupantsOf = (apartment) => apartment.rooms.flatMap((r) => r.occupants);

/** Öğrencinin durumunu açıklayan kısa satır */
function stayDetail(p) {
    if (p.state === "exit_reported" || p.state === "exit_confirmed") return `${STAY[p.state].label} · ${date(p.exit.exitDate)}`;
    if (p.state === "temporary_away" && p.leave) {
        const tail = p.leave.overdue ? "dönüşü gecikti" : `dönüş ${date(p.leave.plannedReturnDate)}`;
        return `${STAY.temporary_away.label} · ${tail}`;
    }
    if (p.exit) return `${STAY.active.label} · çıkış ${date(p.exit.exitDate)} (planlı)`;
    if (p.leave && !p.leave.started) return `${STAY.active.label} · ayrılış ${date(p.leave.leaveDate)} (planlı)`;
    return STAY.active.label;
}

/** Gün bazlı doluluk. Yalnızca yerleşimler sayılır; bekleyen başvurular doluluğu etkilemez. */
export default function OccupancyView({ occupancy, waiting }) {
    const router = useRouter();
    const { period } = useAdmin();
    const [placing, setPlacing] = useState(null);
    const [departing, setDeparting] = useState(null); // { enrollmentId, name }
    const [settings, setSettings] = useState(null); // daire
    const [filter, setFilter] = useState("all");

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

    const active = FILTERS.find((f) => f.value === filter) ?? FILTERS[0];
    const matches = (f, apartment) => (f.apt ? f.apt(apartment) : f.occ ? occupantsOf(apartment).some(f.occ) : true);
    const filterCount = (f) => (f.value === "all" ? undefined : f.occ ? occ.apartments.flatMap(occupantsOf).filter(f.occ).length : occ.apartments.filter(f.apt).length);
    const visible = occ.apartments.filter((a) => matches(active, a));

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

            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ad-muted">
                {Object.values(STAY).map((s) => <span key={s.label} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />{s.label}</span>)}
            </div>
            <div className="mb-5">
                <Chips items={FILTERS.map((f) => ({ value: f.value, label: f.label, count: filterCount(f) }))} value={filter} onChange={setFilter} />
            </div>

            {visible.length === 0 && <Card><EmptyState icon="filter_alt_off" title="Bu filtreye uyan kayıt yok" description="Seçili gün için eşleşen öğrenci ya da daire bulunamadı." /></Card>}

            <div className="grid gap-5 lg:grid-cols-2">
                {visible.map((apartment) => {
                    const { id, name, rooms, beds, taken, free, presence } = apartment;
                    const look = apartmentLook(presence);
                    return (
                        <Card key={id} title={name} className={look?.ring ?? ""}
                            actions={
                                <>
                                    {look && <Badge tone={look.tone}>{look.label}</Badge>}
                                    {!presence.boilerOn && <Badge tone="warn" icon="local_fire_department">Kombi kapalı</Badge>}
                                    <Badge tone={free === 0 && beds > 0 ? "danger" : "ok"}>{taken}/{beds} dolu</Badge>
                                    {!closed && (
                                        <button type="button" onClick={() => setSettings(apartment)} aria-label={`${name} daire durumu`} title="Hazırlık durumu ve kombi" className="ad-btn ad-btn-outline ad-btn-sm !px-2">
                                            <Icon name="settings" className="text-[18px]" />
                                        </button>
                                    )}
                                </>
                            }>
                            {presence.readinessNote && <p className="mt-2 text-xs text-ad-muted">Not: {presence.readinessNote}</p>}
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
                                                    if (!o) {
                                                        return (
                                                            <li key={i} className="flex items-center gap-2 rounded-xl border border-dashed border-ad-line px-2.5 py-1.5 text-xs font-semibold text-ad-faint">
                                                                <Icon name="bed" className="text-[16px]" />Boş yatak
                                                            </li>
                                                        );
                                                    }
                                                    const stay = STAY[o.presence.state];
                                                    const hit = active.occ?.(o);
                                                    return (
                                                        <li key={i}>
                                                            <div className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs ring-1 ${stay.chip} ${hit ? "outline outline-2 outline-offset-1 outline-ad-brand" : ""}`}>
                                                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stay.dot}`} />
                                                                <div className="min-w-0 flex-1">
                                                                    <Link href={`/admin/ogrenciler/${o.enrollmentId}`} className="block truncate font-bold hover:underline">{o.name}</Link>
                                                                    <p className="truncate text-[11px] opacity-80">{stayDetail(o.presence)}</p>
                                                                </div>
                                                                <button type="button" onClick={() => setDeparting({ enrollmentId: o.enrollmentId, name: o.name })} aria-label={`${o.name} çıkış ve ayrılış`} title="Çıkış & ayrılış"
                                                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-black/10">
                                                                    <Icon name="event" className="text-[18px]" />
                                                                </button>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </li>
                                ); })}
                            </ul>
                        </Card>
                    );
                })}
            </div>

            <VacancyPanel />

            {placing && <PlacementDialog enrollment={placing} mode="place" onClose={() => setPlacing(null)} />}
            {departing && <DepartureDialog enrollmentId={departing.enrollmentId} studentName={departing.name} readOnly={closed} onClose={() => setDeparting(null)} />}
            {settings && <ApartmentSettingsDialog apartment={settings} onClose={() => setSettings(null)} />}
        </div>
    );
}
