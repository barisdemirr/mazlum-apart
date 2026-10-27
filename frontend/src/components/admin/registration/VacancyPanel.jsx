"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { errorText } from "@/components/admin/useCommand";
import { DateInput, Field } from "@/components/admin/fields";
import { Badge, Card, EmptyState } from "@/components/admin/ui";
import { getVacancies } from "@/lib/admin/commands/departures";
import { date } from "@/lib/admin/labels";
import { VACANCY_KIND } from "@/lib/admin/presence";

const addDays = (iso, n) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

/** "Belirli tarihlerde boş kalacak daireler": seçilen aralıkta hangi dairenin hangi günler tamamen boş kalacağı */
export default function VacancyPanel() {
    const { today } = useAdmin();
    const [range, setRange] = useState({ from: today, to: addDays(today, 30) });
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!range.from || !range.to) return;
        let cancelled = false;
        setLoading(true);
        getVacancies(range)
            .then((r) => { if (!cancelled) { setResult(r); setError(null); } })
            .catch((e) => { if (!cancelled) { setResult(null); setError(errorText(e)); } })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [range]);

    return (
        <Card title="Belirli tarihlerde boş kalacak daireler" description="Tarih aralığını seçin; hangi dairenin hangi günler tamamen boş kalacağını gösterir. İleri tarihli çıkış ve dönüşler dikkate alınır."
            className="mt-6">
            <div className="mt-4 grid max-w-md grid-cols-2 gap-3">
                <Field label="Başlangıç"><DateInput value={range.from} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value, to: r.to < e.target.value ? e.target.value : r.to }))} /></Field>
                <Field label="Bitiş"><DateInput value={range.to} min={range.from} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} /></Field>
            </div>

            {error && <p className="mt-4 text-sm text-ad-danger">{error}</p>}
            {loading && !result && <p className="mt-4 text-sm text-ad-muted">Yükleniyor…</p>}

            {result && (
                <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                    {result.apartments.length === 0 ? (
                        <EmptyState icon="apartment" title="Bu aralıkta tamamen boş kalacak daire yok" description={`${date(result.from)} – ${date(result.to)}`} />
                    ) : (
                        <ul className="mt-4 divide-y divide-ad-line">
                            {result.apartments.map((a) => (
                                <li key={a.apartmentId} className="py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-bold">{a.name} <span className="text-xs font-medium text-ad-muted">· {a.floor}. kat</span></p>
                                        <span className="ad-num text-xs font-bold text-ad-muted">{a.totalDays} gün</span>
                                    </div>
                                    <ul className="mt-2 flex flex-wrap gap-2">
                                        {a.runs.map((r) => (
                                            <li key={`${r.kind}-${r.from}`}>
                                                <Badge tone={VACANCY_KIND[r.kind]?.tone ?? "neutral"}>
                                                    {r.from === r.to ? date(r.from) : `${date(r.from)} – ${date(r.to)}`} · {r.days} gün · {VACANCY_KIND[r.kind]?.label ?? r.kind}
                                                </Badge>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </Card>
    );
}
