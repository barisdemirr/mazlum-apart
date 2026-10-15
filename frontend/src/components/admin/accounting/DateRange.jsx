"use client";

import { DateInput } from "@/components/admin/fields";

/** Tarih aralığı süzgeci: boş bırakılan uç açıktır */
export default function DateRange({ from, to, onChange }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-36"><DateInput value={from} onChange={(e) => onChange({ from: e.target.value, to })} /></div>
            <span className="text-ad-faint">–</span>
            <div className="w-36"><DateInput value={to} onChange={(e) => onChange({ from, to: e.target.value })} /></div>
            {(from || to) && <button type="button" onClick={() => onChange({ from: "", to: "" })} className="text-xs font-bold text-ad-brand hover:underline">Temizle</button>}
        </div>
    );
}

export const inRange = (day, { from, to }) => (!from || day >= from) && (!to || day <= to);
