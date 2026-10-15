"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import FloatingField from "./FloatingField";
import { maskDate, parseDisplayDate, toISO } from "@/lib/application";
import { formatDate, parseDateOnly } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";

/**
 * Tarih seçici: elle yazılabilir (gg/aa/yyyy, eğik çizgi otomatik) ve takvimden seçilir.
 * min / max "YYYY-MM-DD"; dışındaki günler seçilemez. Doğum tarihi gibi uzak yıllar için yıl ızgarası vardır.
 */
export default function DatePicker({ id, name, label, value, onChange, min, max, openAt, error, required, tick, texts, className = "" }) {
    const wrapRef = useRef(null);
    const [text, setText] = useState(value ? formatDate(value) : "");
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState("days"); // "days" | "years"
    const [view, setView] = useState(() => parseDateOnly(value || openAt || min || toISO(new Date())));

    // dışarıdan gelen değer değişirse yazıyı eşitle
    useEffect(() => {
        if (value && parseDisplayDate(text) !== value) setText(formatDate(value));
        if (!value && text.length === 10 && parseDisplayDate(text)) setText("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (!wrapRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, [open]);

    const typedInvalid = text.length > 0 && !(text.length === 10 && parseDisplayDate(text));
    const shownError = typedInvalid && !open ? texts.invalid : error;

    const inRange = (iso) => (!min || iso >= min) && (!max || iso <= max);

    const handleType = (raw) => {
        const masked = maskDate(raw);
        setText(masked);
        const iso = parseDisplayDate(masked);
        onChange(iso || "");
        if (iso) setView(parseDateOnly(iso));
    };

    const pick = (iso) => {
        setText(formatDate(iso));
        onChange(iso);
        setOpen(false);
    };

    // 6 satırlık ay ızgarası, hafta Pazartesi'den başlar
    const cells = useMemo(() => {
        const first = new Date(view.getFullYear(), view.getMonth(), 1);
        const offset = (first.getDay() + 6) % 7;
        const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
        return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1))];
    }, [view]);

    const shiftMonth = (delta) => setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
    const minYear = min ? parseDateOnly(min).getFullYear() : 1940;
    const maxYear = max ? parseDateOnly(max).getFullYear() : new Date().getFullYear();
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);
    const canPrev = !min || new Date(view.getFullYear(), view.getMonth(), 0) >= parseDateOnly(min);
    const canNext = !max || new Date(view.getFullYear(), view.getMonth() + 1, 1) <= parseDateOnly(max);

    return (
        <div ref={wrapRef} className={`relative ${open ? "z-30" : ""} ${className}`}>
            <FloatingField
                id={id}
                name={name}
                label={label}
                required={required}
                error={shownError}
                tick={tick}
                value={text}
                onChange={handleType}
                trailing={
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        aria-label={texts.pick}
                        className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-orchid-pink transition-colors hover:bg-orchid-powder"
                    >
                        <Icon name="calendar_month" className="text-[22px]" />
                    </button>
                }
                inputProps={{ inputMode: "numeric", autoComplete: "off", maxLength: 10, onFocus: () => setOpen(false) }}
            />
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.22, ease: EASE_OUT }}
                        className="glass-card absolute left-0 top-[calc(3.5rem+8px)] z-40 w-full rounded-[28px] p-4 shadow-[0_28px_60px_-12px_rgba(123,70,199,0.35)] sm:w-[22rem]"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <button type="button" onClick={() => shiftMonth(-1)} disabled={!canPrev || mode === "years"} aria-label={texts.prev} className="flex h-10 w-10 items-center justify-center rounded-full text-orchid-pink transition-colors hover:bg-orchid-powder disabled:opacity-30">
                                <Icon name="chevron_left" className="text-[22px]" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode((m) => (m === "days" ? "years" : "days"))}
                                className="flex items-center gap-1 rounded-full px-4 py-2 font-display text-lg font-semibold text-orchid-dark transition-colors hover:bg-orchid-powder"
                            >
                                {texts.months[view.getMonth()]} {view.getFullYear()}
                                <Icon name={mode === "years" ? "expand_less" : "expand_more"} className="text-[20px] text-orchid-pink" />
                            </button>
                            <button type="button" onClick={() => shiftMonth(1)} disabled={!canNext || mode === "years"} aria-label={texts.next} className="flex h-10 w-10 items-center justify-center rounded-full text-orchid-pink transition-colors hover:bg-orchid-powder disabled:opacity-30">
                                <Icon name="chevron_right" className="text-[22px]" />
                            </button>
                        </div>

                        <AnimatePresence mode="wait" initial={false}>
                            {mode === "years" ? (
                                <motion.div key="years" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="no-scrollbar grid max-h-64 grid-cols-4 gap-1.5 overflow-y-auto">
                                    {years.map((year) => (
                                        <button
                                            key={year}
                                            type="button"
                                            onClick={() => {
                                                setView((v) => new Date(year, v.getMonth(), 1));
                                                setMode("days");
                                            }}
                                            className={`h-10 rounded-full text-sm font-bold transition-colors ${
                                                year === view.getFullYear() ? "aurora-btn text-white" : "text-orchid-dark hover:bg-orchid-powder"
                                            }`}
                                        >
                                            {year}
                                        </button>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div key="days" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wider text-orchid-muted">
                                        {texts.weekdays.map((day) => (
                                            <span key={day} className="py-1">{day}</span>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-y-1">
                                        {cells.map((date, index) => {
                                            if (!date) return <span key={`e${index}`} />;
                                            const iso = toISO(date);
                                            const disabled = !inRange(iso);
                                            const on = iso === value;
                                            return (
                                                <button
                                                    key={iso}
                                                    type="button"
                                                    disabled={disabled}
                                                    onClick={() => pick(iso)}
                                                    className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                                                        on
                                                            ? "aurora-btn text-white"
                                                            : disabled
                                                              ? "cursor-not-allowed text-orchid-muted/35"
                                                              : "text-orchid-dark hover:bg-orchid-powder hover:text-orchid-pink"
                                                    }`}
                                                >
                                                    <span className="relative">{date.getDate()}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
