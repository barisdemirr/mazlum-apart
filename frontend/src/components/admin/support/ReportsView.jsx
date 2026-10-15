"use client";

import { useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import DataTable from "@/components/admin/DataTable";
import { Card, Chips, PageHeader, ProgressBar } from "@/components/admin/ui";
import DateRange, { inRange } from "@/components/admin/accounting/DateRange";
import { round, sum } from "@/lib/admin/domain/accounting";
import { addDays, monthLabel } from "@/lib/admin/domain/dates";
import { METHOD, money } from "@/lib/admin/labels";

/** Tarih aralığına göre gelir/gider raporu. Transferler gelir ya da gider sayılmaz. Tablo Excel'e aktarılır. */
export default function ReportsView() {
    const { state, period, today } = useAdmin();
    const end = today < period.end ? (today < period.start ? period.start : today) : period.end;
    const [preset, setPreset] = useState("period");
    const [custom, setCustom] = useState({ from: "", to: "" });

    const range = useMemo(() => {
        if (preset === "month") return { from: `${end.slice(0, 7)}-01`, to: end };
        if (preset === "30") return { from: addDays(end, -29) < period.start ? period.start : addDays(end, -29), to: end };
        if (preset === "custom") return custom;
        return { from: period.start, to: period.end };
    }, [preset, custom, end, period]);

    const data = useMemo(() => {
        const payments = state.payments.filter((p) => p.periodId === period.id && !p.cancelledAt && inRange(p.date, range));
        const collections = payments.filter((p) => p.kind === "collection");
        const refunds = payments.filter((p) => p.kind === "refund");
        const expenses = state.expenses.filter((e) => e.periodId === period.id && !e.cancelledAt && inRange(e.date, range));
        const typeOf = new Map(state.accounts.map((a) => [a.id, a]));

        const months = new Map();
        const bucket = (day) => {
            const key = day.slice(0, 7);
            if (!months.has(key)) months.set(key, { month: key, collected: 0, refunded: 0, spent: 0 });
            return months.get(key);
        };
        collections.forEach((p) => (bucket(p.date).collected = round(bucket(p.date).collected + p.amount)));
        refunds.forEach((p) => (bucket(p.date).refunded = round(bucket(p.date).refunded + p.amount)));
        expenses.forEach((e) => (bucket(e.date).spent = round(bucket(e.date).spent + e.amount)));

        return {
            collected: sum(collections, (p) => p.amount),
            refunded: sum(refunds, (p) => p.amount),
            spent: sum(expenses, (e) => e.amount),
            byMethod: Object.keys(METHOD).map((k) => ({ key: k, amount: sum(collections.filter((p) => p.method === k), (p) => p.amount) })),
            byAccount: state.accounts.map((a) => ({ a, amount: sum(collections.filter((p) => p.accountId === a.id), (p) => p.amount) })).filter((x) => x.amount > 0),
            bank: sum(collections.filter((p) => typeOf.get(p.accountId)?.type === "bank"), (p) => p.amount),
            cash: sum(collections.filter((p) => typeOf.get(p.accountId)?.type === "cash"), (p) => p.amount),
            byCategory: state.expenseCategories.map((c) => ({ c, amount: sum(expenses.filter((e) => e.categoryId === c.id), (e) => e.amount) })).filter((x) => x.amount > 0).sort((a, b) => b.amount - a.amount),
            months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({ ...m, net: round(m.collected - m.refunded - m.spent) })),
        };
    }, [state, period.id, range]);

    const net = round(data.collected - data.refunded - data.spent);
    const columns = [
        { key: "month", header: "Ay", sort: (m) => m.month, render: (m) => <b>{monthLabel(m.month)}</b>, export: { value: (m) => monthLabel(m.month) } },
        { key: "collected", header: "Tahsilat", align: "end", render: (m) => <span className="ad-num text-ad-ok">{money(m.collected)}</span>, export: { type: "money", value: (m) => m.collected } },
        { key: "refunded", header: "İade", align: "end", render: (m) => <span className="ad-num text-ad-warn">{money(m.refunded)}</span>, export: { type: "money", value: (m) => m.refunded } },
        { key: "spent", header: "Gider", align: "end", render: (m) => <span className="ad-num text-ad-danger">{money(m.spent)}</span>, export: { type: "money", value: (m) => m.spent } },
        { key: "net", header: "Net", align: "end", sort: (m) => m.net, render: (m) => <span className={`ad-num font-bold ${m.net < 0 ? "text-ad-danger" : ""}`}>{money(m.net)}</span>, export: { type: "money", value: (m) => m.net } },
    ];

    return (
        <div>
            <PageHeader title="Raporlar" description="Seçili dönemin gelir ve gider özeti. Tarih aralığını değiştirin, aylık tabloyu Excel'e aktarın." />
            <div className="mb-5 flex flex-wrap items-center gap-3">
                <Chips value={preset} onChange={setPreset} items={[{ value: "period", label: "Tüm dönem" }, { value: "month", label: "Bu ay" }, { value: "30", label: "Son 30 gün" }, { value: "custom", label: "Özel aralık" }]} />
                {preset === "custom" && <DateRange {...custom} onChange={setCustom} />}
            </div>

            <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Tahsilat</p><p className="ad-num mt-2 text-2xl font-extrabold text-ad-ok">{money(data.collected)}</p><p className="mt-1 text-xs text-ad-muted">Banka {money(data.bank)} · Nakit {money(data.cash)}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Avans iadeleri</p><p className="ad-num mt-2 text-2xl font-extrabold text-ad-warn">{money(data.refunded)}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Gider</p><p className="ad-num mt-2 text-2xl font-extrabold text-ad-danger">{money(data.spent)}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Net</p><p className={`ad-num mt-2 text-2xl font-extrabold ${net < 0 ? "text-ad-danger" : ""}`}>{money(net)}</p><p className="mt-1 text-xs text-ad-muted">Tahsilat − iade − gider</p></Card>
            </div>

            <div className="mb-5 grid gap-5 lg:grid-cols-3">
                <Card title="Yönteme göre tahsilat">
                    <ul className="mt-4 space-y-3">{data.byMethod.map(({ key, amount }) => (
                        <li key={key} className="text-sm"><div className="mb-1 flex justify-between"><span className="font-semibold">{METHOD[key]}</span><span className="ad-num font-bold">{money(amount)}</span></div><ProgressBar value={data.collected ? amount / data.collected : 0} /></li>
                    ))}</ul>
                </Card>
                <Card title="Hesaba göre tahsilat">
                    {data.byAccount.length === 0 ? <p className="mt-4 text-sm text-ad-muted">Bu aralıkta tahsilat yok.</p> : <ul className="mt-4 space-y-3">{data.byAccount.map(({ a, amount }) => (
                        <li key={a.id} className="text-sm"><div className="mb-1 flex justify-between"><span className="font-semibold">{a.name}</span><span className="ad-num font-bold">{money(amount)}</span></div><ProgressBar value={data.collected ? amount / data.collected : 0} tone="accent" /></li>
                    ))}</ul>}
                </Card>
                <Card title="Kategoriye göre gider">
                    {data.byCategory.length === 0 ? <p className="mt-4 text-sm text-ad-muted">Bu aralıkta gider yok.</p> : <ul className="mt-4 space-y-3">{data.byCategory.map(({ c, amount }) => (
                        <li key={c.id} className="text-sm"><div className="mb-1 flex justify-between"><span className="font-semibold">{c.name}</span><span className="ad-num font-bold">{money(amount)}</span></div><ProgressBar value={data.spent ? amount / data.spent : 0} tone="danger" /></li>
                    ))}</ul>}
                </Card>
            </div>

            <DataTable columns={columns} rows={data.months} rowKey={(m) => m.month} exportName="aylik-rapor" initialSort={{ key: "month", dir: "asc" }} empty={{ icon: "analytics", title: "Bu aralıkta hareket yok", description: "Tarih aralığını genişletin." }} />
        </div>
    );
}
