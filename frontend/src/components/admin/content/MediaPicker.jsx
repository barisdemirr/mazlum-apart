"use client";

import { useAdmin } from "@/components/admin/data/AdminDataProvider";

/** Medya kitaplığından görsel seçtirir (oda tipi görseli, slayt görseli) */
export default function MediaPicker({ value, onChange, allowNone = false }) {
    const { state } = useAdmin();
    const images = state.media.filter((m) => m.kind === "image");
    if (images.length === 0) return <p className="rounded-xl bg-ad-sunken p-3 text-xs text-ad-muted">Medya kitaplığında görsel yok. Önce İçerik & Site → Medya bölümünden görsel yükleyin.</p>;
    return (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {allowNone && <button type="button" onClick={() => onChange(null)} className={`flex aspect-[4/3] items-center justify-center rounded-xl border-2 text-xs font-bold ${!value ? "border-ad-brand text-ad-brand" : "border-ad-line text-ad-muted"}`}>Görsel yok</button>}
            {images.map((m) => (
                <button key={m.id} type="button" onClick={() => onChange(m.id)} aria-pressed={value === m.id} title={m.name} className={`relative aspect-[4/3] overflow-hidden rounded-xl border-2 transition-colors ${value === m.id ? "border-ad-brand" : "border-transparent hover:border-ad-line-strong"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={m.alt?.tr || m.name} className="h-full w-full object-cover" />
                </button>
            ))}
        </div>
    );
}
