"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PageHeader } from "@/components/admin/ui";
import { DateInput, Field } from "@/components/admin/fields";
import ExportButton from "@/components/admin/ExportButton";
import { monthLabel } from "@/lib/admin/month";
import { METHOD, date, money } from "@/lib/admin/labels";

/** Finans raporu: seçilen tarih aralığında tahsilat, iade, gider, yönteme/hesaba/kategoriye göre dağılım ve aylık seyir. */
export default function ReportsView({ report: r }) {
    const router = useRouter();
    const [range, setRange] = useState({ from: r.from, to: r.to });
    const apply = () => router.push(`/admin/raporlar?from=${range.from}&to=${range.to}`);
    const cols = [{ key: "m", header: "Ay", export: { value: (x) => x.month } }, { key: "c", header: "Tahsilat", export: { type: "money", value: (x) => x.collected } }, { key: "r", header: "İade", export: { type: "money", value: (x) => x.refunded } }, { key: "s", header: "Gider", export: { type: "money", value: (x) => x.spent } }, { key: "n", header: "Net", export: { type: "money", value: (x) => x.net } }];
    const List = ({ title, rows }) => (
        <Card title={title}><ul className="mt-4 divide-y divide-ad-line text-sm">{rows.length === 0 ? <li className="py-2 text-ad-muted">Veri yok.</li> : rows.map((x) => <li key={x.key} className="flex justify-between py-2"><span>{x.label}</span><b className="ad-num">{money(x.amount)}</b></li>)}</ul></Card>
    );
    return (
        <div>
            <PageHeader title="Raporlar" description={`${date(r.from)} – ${date(r.to)} aralığı`} actions={<ExportButton name="finans-raporu" columns={cols} rows={r.months} />} />
            <div className="mb-5 flex flex-wrap items-end gap-3">
                <Field label="Başlangıç"><DateInput value={range.from} onChange={(e) => setRange((x) => ({ ...x, from: e.target.value }))} /></Field>
                <Field label="Bitiş"><DateInput value={range.to} onChange={(e) => setRange((x) => ({ ...x, to: e.target.value }))} /></Field>
                <button type="button" onClick={apply} className="ad-btn ad-btn-primary">Uygula</button>
            </div>
            <div className="mb-5 grid gap-4 sm:grid-cols-4">
                {[["Tahsilat", r.collected], ["İade", r.refunded], ["Gider", r.spent], ["Net", r.net]].map(([l, v]) => <Card key={l}><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">{l}</p><p className={`ad-num mt-2 text-2xl font-extrabold ${l === "Net" && v < 0 ? "text-ad-danger" : ""}`}>{money(v)}</p></Card>)}
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
                <List title="Yönteme göre tahsilat" rows={r.byMethod.map((x) => ({ key: x.method, label: METHOD[x.method], amount: x.amount }))} />
                <List title="Hesaba göre tahsilat" rows={r.byAccount.map((x) => ({ key: x.accountId, label: x.name, amount: x.amount }))} />
                <List title="Kategoriye göre gider" rows={r.byCategory.map((x) => ({ key: x.categoryId, label: x.name, amount: x.amount }))} />
            </div>
            <Card title="Aylık seyir" className="mt-5"><div className="ad-scroll mt-4 overflow-x-auto"><table className="ad-table">
                <thead><tr><th>Ay</th><th className="!text-end">Tahsilat</th><th className="!text-end">İade</th><th className="!text-end">Gider</th><th className="!text-end">Net</th></tr></thead>
                <tbody>{r.months.map((m) => <tr key={m.month}><td className="font-semibold">{monthLabel(m.month)}</td><td className="ad-num text-end">{money(m.collected)}</td><td className="ad-num text-end">{money(m.refunded)}</td><td className="ad-num text-end">{money(m.spent)}</td><td className={`ad-num text-end font-bold ${m.net < 0 ? "text-ad-danger" : ""}`}>{money(m.net)}</td></tr>)}</tbody>
            </table></div></Card>
        </div>
    );
}
