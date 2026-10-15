"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import { BED_STATUS, freeBedsInFlat, summarizeAvailability } from "@/lib/availability";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { EASE_OUT, SPRING_BOUNCY } from "@/lib/motion";

function LegendDot({ className, children }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-orchid-muted">
            <span className={`h-3 w-3 rounded-full ${className}`} />
            {children}
        </span>
    );
}

function BedTile({ bed, selected, onToggle, labels, ariaLabel }) {
    const status = bed.status;
    const available = status === BED_STATUS.AVAILABLE;

    const style = selected
        ? "aurora-btn text-white shadow-lg"
        : available
          ? "border border-orchid-petal/60 bg-white text-orchid-dark hover:-translate-y-0.5 hover:border-orchid-pink hover:shadow-md"
          : status === BED_STATUS.RESERVED
            ? "border border-dashed border-orchid-violet/40 bg-orchid-lilac/50 text-orchid-violet"
            : "border border-orchid-petal/20 bg-orchid-powder/30 text-orchid-muted/60";

    const statusText = selected ? labels.selected : available ? labels.free : status === BED_STATUS.RESERVED ? labels.reserved : labels.occupied;

    return (
        <motion.button
            type="button"
            disabled={!available && !selected}
            onClick={onToggle}
            aria-pressed={selected}
            aria-label={ariaLabel}
            data-cursor={available || selected ? (selected ? labels.selected : labels.free) : undefined}
            animate={selected ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={selected ? SPRING_BOUNCY : { duration: 0.2 }}
            className={`relative flex min-w-[104px] flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-3 text-center transition-all duration-300 disabled:cursor-not-allowed ${style}`}
        >
            <Icon name={selected ? "check_circle" : "bed"} filled={selected || available} className="text-[26px]" />
            <span className="text-xs font-bold">{bed.labelText}</span>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${selected ? "text-white/85" : ""}`}>{statusText}</span>
        </motion.button>
    );
}

/**
 * Daire → oda → yatak görünümü. Öğrenci boş bir yatağı seçer; seçim üst bileşende tutulur.
 * Dolu / ayrılmış yataklar seçilemez. Durum bilgisi yönetim panelinden gelir.
 */
export default function AvailabilityPicker({ availability, selectedBedId, onSelect, photoKeys, onShowPhotos }) {
    const { t, tpl, locale } = useLanguage();
    const a = t.roomDetail.availability;
    const [onlyFree, setOnlyFree] = useState(false);

    const summary = useMemo(() => summarizeAvailability(availability), [availability]);
    const labels = a.legend;

    const flats = useMemo(() => {
        const list = availability?.apartments ?? [];
        return list
            .map((flat) => ({
                ...flat,
                free: freeBedsInFlat(flat),
                rooms: flat.rooms
                    .filter((room) => !onlyFree || room.beds.some((b) => b.status === BED_STATUS.AVAILABLE || b.id === selectedBedId))
                    .map((room) => ({
                        ...room,
                        beds: room.beds.map((bed) => ({ ...bed, labelText: localized(bed.label, locale) })),
                    })),
            }))
            .filter((flat) => flat.rooms.length > 0);
    }, [availability, onlyFree, selectedBedId, locale]);

    if (!availability || summary.total === 0) {
        return (
            <section id="yatak-secimi" className="glass-card rounded-[32px] p-8 text-center text-orchid-muted">
                {a.empty}
            </section>
        );
    }

    const statusName = (status, selected) =>
        selected ? labels.selected : status === BED_STATUS.AVAILABLE ? labels.free : status === BED_STATUS.RESERVED ? labels.reserved : labels.occupied;

    return (
        <section id="yatak-secimi" className="glass-card scroll-mt-28 rounded-[32px] p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-[0.25em] text-orchid-pink">{a.eyebrow}</span>
                    <h2 className="font-display text-3xl font-medium text-orchid-dark">{a.title}</h2>
                    <p className="mt-2 max-w-xl text-sm text-orchid-muted">{a.subtitle}</p>
                </div>
                <div
                    className={`flex shrink-0 items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-bold ${
                        summary.free > 0 ? "bg-orchid-powder text-orchid-pink" : "bg-orchid-lilac text-orchid-violet"
                    }`}
                    aria-live="polite"
                >
                    <span className="relative flex h-2.5 w-2.5">
                        {summary.free > 0 && <span className="absolute inline-flex h-full w-full rounded-full bg-orchid-pink opacity-75 animate-ping" />}
                        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${summary.free > 0 ? "bg-orchid-pink" : "bg-orchid-violet"}`} />
                    </span>
                    {summary.free > 0 ? tpl(a.summary, { total: summary.total, free: summary.free }) : a.summaryNone}
                </div>
            </div>

            <p className="mt-2 text-xs text-orchid-muted">{tpl(a.period, { period: localized(availability.period?.name, locale) })}</p>

            {/* Gösterge ve süzgeç */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <LegendDot className="border border-orchid-petal/60 bg-white">{labels.free}</LegendDot>
                    <LegendDot className="bg-gradient-to-br from-orchid-pink to-orchid-violet">{labels.selected}</LegendDot>
                    <LegendDot className="border border-dashed border-orchid-violet/50 bg-orchid-lilac/60">{labels.reserved}</LegendDot>
                    <LegendDot className="bg-orchid-powder">{labels.occupied}</LegendDot>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-orchid-dark">
                    <input
                        type="checkbox"
                        checked={onlyFree}
                        onChange={(e) => setOnlyFree(e.target.checked)}
                        className="h-4 w-4 accent-[#b4398f]"
                    />
                    {a.onlyFree}
                </label>
            </div>

            {/* Yatak fark etmez */}
            <button
                type="button"
                onClick={() => onSelect(null)}
                aria-pressed={selectedBedId === null}
                className={`mt-5 flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                    selectedBedId === null
                        ? "border-orchid-pink bg-orchid-powder/60 shadow-sm"
                        : "border-orchid-petal/30 bg-white/60 hover:border-orchid-pink/60"
                }`}
            >
                <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        selectedBedId === null ? "bg-orchid-pink text-white" : "bg-orchid-powder text-orchid-pink"
                    }`}
                >
                    <Icon name={selectedBedId === null ? "check" : "shuffle"} className="text-[20px]" />
                </span>
                <span className="flex flex-col">
                    <span className="text-sm font-bold text-orchid-dark">{a.anyBed}</span>
                    <span className="text-xs text-orchid-muted">{a.anyBedHint}</span>
                </span>
            </button>

            {/* Daireler */}
            <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
                {flats.map((flat, i) => (
                    <Reveal key={flat.id} delay={(i % 2) * 0.08} y={30}>
                        <div className="h-full rounded-3xl border border-orchid-petal/30 bg-white/55 p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orchid-powder text-orchid-pink">
                                        <Icon name="apartment" className="text-[22px]" />
                                    </span>
                                    <div className="leading-tight">
                                        <h3 className="font-display text-xl font-medium text-orchid-dark">{localized(flat.name, locale)}</h3>
                                        {flat.floor != null && <span className="text-xs text-orchid-muted">{tpl(a.floor, { floor: flat.floor })}</span>}
                                    </div>
                                </div>
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                                        flat.free > 0 ? "bg-orchid-powder text-orchid-pink" : "bg-orchid-lilac/70 text-orchid-violet"
                                    }`}
                                >
                                    {flat.free > 0 ? tpl(a.flatFree, { count: flat.free }) : a.flatFull}
                                </span>
                            </div>

                            <div className="flex flex-col gap-3">
                                {flat.rooms.map((room) => (
                                    <div key={room.id} className="rounded-2xl bg-orchid-white/70 p-3">
                                        <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-orchid-muted">
                                            <span className="flex items-center gap-2 text-orchid-dark">
                                                {localized(room.name, locale)}
                                                {room.tagKey && photoKeys?.has(room.tagKey) && onShowPhotos && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onShowPhotos(room.tagKey)}
                                                        aria-label={tpl(a.showPhotosAria, { room: localized(room.name, locale) })}
                                                        className="inline-flex items-center gap-1 rounded-full bg-orchid-powder px-2.5 py-1 text-[11px] font-bold text-orchid-pink transition-colors hover:bg-orchid-pink hover:text-white"
                                                    >
                                                        <Icon name="photo_library" className="text-[14px]" />
                                                        {a.showPhotos}
                                                    </button>
                                                )}
                                            </span>
                                            <span>{tpl(a.roomBeds, { count: room.beds.length })}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {room.beds.map((bed) => {
                                                const selected = bed.id === selectedBedId;
                                                return (
                                                    <BedTile
                                                        key={bed.id}
                                                        bed={bed}
                                                        selected={selected}
                                                        labels={labels}
                                                        ariaLabel={tpl(a.bedAria, {
                                                            flat: localized(flat.name, locale),
                                                            room: localized(room.name, locale),
                                                            bed: bed.labelText,
                                                            status: statusName(bed.status, selected),
                                                        })}
                                                        onToggle={() =>
                                                            onSelect(selected ? null : { id: bed.id, bedLabel: bed.label, roomName: room.name, flatName: flat.name })
                                                        }
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Reveal>
                ))}
            </div>

            {flats.length === 0 && <p className="mt-6 text-center text-sm text-orchid-muted">{a.noFreeFiltered}</p>}

            <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
                className="mt-6 flex items-start gap-2 text-xs text-orchid-muted"
            >
                <Icon name="info" className="mt-px text-[16px] text-orchid-pink" />
                {a.note}
            </motion.p>
        </section>
    );
}
