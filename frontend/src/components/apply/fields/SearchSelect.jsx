"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import FloatingField from "./FloatingField";
import { fold } from "@/lib/locations";

/**
 * Aranabilir liste (combobox). Yazdıkça süzer, Türkçe karakter farkını yok sayar
 * ("sisli" yazınca Şişli gelir). Seçenekler: [{ value, label }]
 */
export default function SearchSelect({ id, name, label, options, value, onChange, error, required, tick, disabled, placeholder, noResult, className = "" }) {
    const wrapRef = useRef(null);
    const listRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [pos, setPos] = useState(null); // liste konumu (ekrana göre): liste body'e taşınır, hiçbir kartın/çubuğun altında kalmaz

    const selected = options.find((option) => String(option.value) === String(value));
    const filtered = useMemo(() => {
        const q = fold(query);
        return q ? options.filter((option) => fold(option.label).includes(q)) : options;
    }, [options, query]);

    // dışarı tıklayınca kapat
    useEffect(() => {
        if (!open) return;
        const onDown = (event) => {
            if (!wrapRef.current?.contains(event.target) && !listRef.current?.contains(event.target)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, [open]);

    // Listeyi alanın hemen altına (yer yoksa üstüne) sabitle; kaydırma/boyut değişince yeniden hesapla
    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            if (!wrapRef.current) return;
            const field = wrapRef.current.getBoundingClientRect();
            const below = window.innerHeight - field.bottom;
            const up = below < 260 && field.top > below;
            setPos({ left: field.left, width: field.width, top: up ? undefined : field.bottom + 6, bottom: up ? window.innerHeight - field.top + 6 : undefined, max: Math.max(160, Math.min(240, (up ? field.top : below) - 16)) });
        };
        place();
        window.addEventListener("scroll", place, true);
        window.addEventListener("resize", place);
        return () => {
            window.removeEventListener("scroll", place, true);
            window.removeEventListener("resize", place);
        };
    }, [open, filtered.length]);

    // aktif satırı görünür tut
    useEffect(() => {
        if (!open) return;
        listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active, open]);

    const choose = (option) => {
        onChange(String(option.value));
        setOpen(false);
        setQuery("");
    };

    const onKeyDown = (event) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, filtered.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (event.key === "Enter" && open && filtered[active]) {
            event.preventDefault();
            choose(filtered[active]);
        } else if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
        }
    };

    return (
        <div ref={wrapRef} className={`relative ${open ? "z-30" : ""} ${className}`}>
            <FloatingField
                id={id}
                name={name}
                label={label}
                required={required}
                error={error}
                tick={tick}
                value={open ? query : selected?.label ?? ""}
                onChange={(text) => {
                    setQuery(text);
                    setActive(0);
                    setOpen(true);
                }}
                trailing={
                    <motion.span animate={{ rotate: open ? 180 : 0 }} className="pointer-events-none flex text-orchid-muted">
                        <Icon name="expand_more" className="text-[24px]" />
                    </motion.span>
                }
                inputProps={{
                    role: "combobox",
                    "aria-expanded": open,
                    "aria-controls": `${id}-list`,
                    "aria-autocomplete": "list",
                    autoComplete: "off",
                    disabled,
                    placeholder: open && selected ? selected.label : " ",
                    onFocus: () => {
                        if (!disabled) {
                            // mobilde liste alttaki sabit çubuğun altında kalmasın
                            setTimeout(() => wrapRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
                            setOpen(true);
                            setActive(Math.max(0, filtered.findIndex((o) => String(o.value) === String(value))));
                        }
                    },
                    onKeyDown,
                    onBlur: (e) => {
                        if (!wrapRef.current?.contains(e.relatedTarget)) {
                            setOpen(false);
                            setQuery("");
                        }
                    },
                }}
            />
            {disabled && placeholder && <p className="px-1 pt-1.5 text-xs text-orchid-muted">{placeholder}</p>}

            {typeof document !== "undefined" && createPortal(
            <AnimatePresence>
                {open && pos && (
                    <motion.ul
                        ref={listRef}
                        id={`${id}-list`}
                        role="listbox"
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18 }}
                        style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.max }}
                        className="glass-card z-[1000] overflow-y-auto overscroll-contain rounded-3xl p-1.5 shadow-[0_24px_50px_-12px_rgba(123,70,199,0.3)]"
                    >
                        {filtered.length === 0 && <li className="px-4 py-3 text-sm text-orchid-muted">{noResult}</li>}
                        {filtered.map((option, index) => {
                            const isSelected = String(option.value) === String(value);
                            return (
                                <li
                                    key={option.value}
                                    role="option"
                                    aria-selected={isSelected}
                                    data-index={index}
                                    onPointerDown={(e) => e.preventDefault()}
                                    onClick={() => choose(option)}
                                    onMouseEnter={() => setActive(index)}
                                    className={`flex min-h-11 cursor-pointer items-center justify-between rounded-2xl px-4 text-sm font-semibold transition-colors ${
                                        index === active ? "bg-orchid-powder text-orchid-pink" : "text-orchid-dark"
                                    }`}
                                >
                                    {option.label}
                                    {isSelected && <Icon name="check" className="text-[18px] text-orchid-pink" />}
                                </li>
                            );
                        })}
                    </motion.ul>
                )}
            </AnimatePresence>,
            document.body
            )}
        </div>
    );
}
