"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/admin/Toast";
import { Field, TextInput } from "./fields";

/**
 * İkon alanı: önizleme + ad girişi + yapay zeka önerisi.
 * Panelde ikon istenen her yerde bu bileşen kullanılır.
 */
export default function IconField({ value, onChange, label = "İkon", required, error, hint, placeholder = "wifi" }) {
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [busy, setBusy] = useState(false);
    const [results, setResults] = useState(null);
    const wrapRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("pointerdown", onDown);
        document.addEventListener("keydown", onKey);
        setTimeout(() => inputRef.current?.focus(), 50);
        return () => {
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const search = async () => {
        const text = query.trim();
        if (!text || busy) return;

        setBusy(true);
        setResults(null);

        try {
            const response = await fetch("/api/ai/icons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: text }),
            });

            const data = await response.json().catch(() => null);

            if (response.status === 401) {
                window.location.href = "/admin/login?expired=1";
                return;
            }
            if (!response.ok) throw new Error(data?.title || "Öneri alınamadı.");

            setResults(data.icons);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    };

    const pick = (name) => {
        onChange(name);
        setOpen(false);
        setQuery("");
        setResults(null);
    };

    return (
        <Field label={label} required={required} error={error} hint={hint}>
            <div ref={wrapRef} className="relative">
                <div className="flex items-center gap-2">
                    {/* Önizleme */}
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ad-sunken text-ad-brand">
                        <Icon name={value || "help"} className="text-[20px]" />
                    </span>

                    <TextInput
                        dir="ltr"
                        placeholder={placeholder}
                        value={value ?? ""}
                        error={error}
                        onChange={(e) => onChange(e.target.value)}
                    />

                    {/* Yapay zeka önerisi */}
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        title="Yapay zeka ile ikon bul"
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${open
                                ? "border-ad-brand bg-ad-brand-soft text-ad-brand"
                                : "border-ad-line-strong text-ad-muted hover:border-ad-brand hover:bg-ad-brand-soft hover:text-ad-brand"
                            }`}
                    >
                        <Icon name="auto_awesome" className="text-[19px]" />
                    </button>
                </div>

                {/* Öneri paneli */}
                {open && (
                    <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-ad-line bg-ad-surface shadow-ad-lg">
                        <div className="flex items-center gap-2 border-b border-ad-line p-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        search();
                                    }
                                }}
                                placeholder="Ne arıyorsunuz? Örn: çamaşır, internet, güvenlik"
                                className="ad-field"
                            />
                            <button
                                type="button"
                                onClick={search}
                                disabled={busy || !query.trim()}
                                className="ad-btn ad-btn-primary !h-11 shrink-0"
                            >
                                <Icon
                                    name={busy ? "progress_activity" : "search"}
                                    className={`text-[17px] ${busy ? "animate-spin" : ""}`}
                                />
                                <span className="hidden sm:inline">Bul</span>
                            </button>
                        </div>

                        <div className="p-2">
                            {results === null ? (
                                <p className="px-2 py-3 text-xs text-ad-muted">
                                    Aradığınız kavramı Türkçe yazın, en uygun ikonları önerelim.
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                    {results.map((item) => (
                                        <button
                                            key={item.name}
                                            type="button"
                                            onClick={() => pick(item.name)}
                                            className="flex flex-col items-center gap-1.5 rounded-xl border border-ad-line p-3 transition-colors hover:border-ad-brand hover:bg-ad-brand-soft"
                                        >
                                            <Icon name={item.name} className="text-[26px] text-ad-brand" />
                                            <span className="w-full truncate text-center text-[11px] font-semibold">
                                                {item.label || item.name}
                                            </span>
                                            <code dir="ltr" className="w-full truncate text-center text-[10px] text-ad-faint">
                                                {item.name}
                                            </code>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Field>
    );
}