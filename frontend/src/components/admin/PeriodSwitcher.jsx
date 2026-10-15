"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";

const STATUS_LABEL = { active: "Aktif çalışma dönemi", closed: "Kapalı dönem" };

/**
 * Üst çubuktaki dönem seçici. Seçim ma_period çerezine yazılır, sayfa yenilenir.
 * Muhasebe dönemleri birbirine karışmaz: panelin tamamı seçili döneme göre çalışır.
 */
export default function PeriodSwitcher() {
    const { periods, periodId: selectedId, selectPeriod } = useAdmin();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const selected = periods.find((p) => p.id === selectedId) ?? periods[0];

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("pointerdown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const choose = (id) => {
        setOpen(false);
        if (id === selectedId) return;
        selectPeriod(id);
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => setOpen((v) => !v)}
                className="flex h-10 max-w-[200px] items-center gap-2 rounded-full bg-ad-surface px-3.5 text-ad-ink shadow-ad-sm ring-1 ring-ad-brand/35 transition-colors hover:bg-ad-sunken sm:max-w-none"
            >
                <Icon name="calendar_month" className="shrink-0 text-[18px] text-ad-brand" />
                <span className="truncate text-sm font-bold tracking-tight">{selected.name}</span>
                <Icon
                    name="expand_more"
                    className={`shrink-0 text-[18px] text-ad-muted transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    className="ad-rise absolute end-0 top-12 z-50 flex w-72 flex-col gap-1 rounded-2xl border border-ad-line bg-ad-surface p-2 shadow-ad-lg"
                >
                    <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider text-ad-muted">
                        Çalışma dönemi
                    </p>
                    {periods.map((p) => {
                        const isSelected = p.id === selectedId;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => choose(p.id)}
                                className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start transition-colors ${
                                    isSelected ? "bg-ad-brand text-white" : "text-ad-body hover:bg-ad-sunken"
                                }`}
                            >
                                <span className="flex min-w-0 flex-col">
                                    <span className="truncate text-sm font-bold">{p.name}</span>
                                    <span className={`text-[11px] ${isSelected ? "text-white/80" : "text-ad-muted"}`}>
                                        {STATUS_LABEL[p.status]}
                                    </span>
                                </span>
                                {isSelected && <Icon name="check_circle" filled className="shrink-0 text-[18px]" />}
                            </button>
                        );
                    })}
                    <div className="my-1 h-px bg-ad-line" />
                    <Link
                        href="/admin/donemler"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-ad-brand transition-colors hover:bg-ad-brand-soft"
                    >
                        <Icon name="add_circle" className="text-[18px]" />
                        Yeni dönem başlat
                    </Link>
                </div>
            )}
        </div>
    );
}
