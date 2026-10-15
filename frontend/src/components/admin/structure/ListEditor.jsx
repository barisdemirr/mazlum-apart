"use client";

import Icon from "@/components/ui/Icon";
import IconField from "@/components/admin/IconField";
import LocalizedField, { toLocalized } from "@/components/admin/LocalizedField";

/** Simgeli, iki dilli madde listesi (oda özellikleri, ortak alanlar). Madde ekle/kaldır. */
export default function ListEditor({ title, hint, items, onChange, prefix }) {
    const update = (i, patch) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
    return (
        <div>
            <div className="mb-2 flex items-center justify-between gap-2">
                <div><p className="text-xs font-semibold text-ad-body">{title}</p>{hint && <p className="text-xs text-ad-faint">{hint}</p>}</div>
                <button type="button" onClick={() => onChange([...items, { icon: "check_circle", text: { tr: "", en: "" } }])} className="ad-btn ad-btn-soft ad-btn-sm"><Icon name="add" className="text-[16px]" />Madde ekle</button>
            </div>
            {items.length === 0 && <p className="rounded-xl bg-ad-sunken p-3 text-xs text-ad-muted">Henüz madde yok. Boş bırakılan bölüm sitede gösterilmez.</p>}
            <ul className="space-y-3">
                {items.map((it, i) => (
                    <li key={i} className="grid gap-3 rounded-2xl border border-ad-line p-3 sm:grid-cols-[14rem_1fr_auto]">
                        <IconField label="İkon" value={it.icon} onChange={(v) => update(i, { icon: v })} />
                        <LocalizedField label="Metin" name={`${prefix}-${i}`} value={toLocalized(it.text)} onChange={(v) => update(i, { text: v })} />
                        <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label="Maddeyi kaldır" className="ad-btn ad-btn-icon ad-btn-danger-soft self-start sm:mt-6"><Icon name="delete" className="text-[18px]" /></button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
