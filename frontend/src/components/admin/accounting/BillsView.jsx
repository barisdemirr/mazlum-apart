"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import DataTable from "@/components/admin/DataTable";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import { Badge, Card, Chips, PageHeader, StatusBadge } from "@/components/admin/ui";
import { DateInput, Field, NumberInput, SelectInput, TextInput } from "@/components/admin/fields";
import { billState, sum } from "@/lib/admin/domain/accounting";
import { monthLabel } from "@/lib/admin/domain/dates";
import { addBill, payBill } from "@/lib/admin/domain/ledger";
import { carriedOver } from "@/lib/admin/domain/selectors";
import { BILL_KIND, BILL_STATE, date, money } from "@/lib/admin/labels";

export default function BillsView() {
    const { state, period, today } = useAdmin();
    const [tab, setTab] = useState("unpaid");
    const [dialog, setDialog] = useState(null); // "add" | { pay: bill }
    const closed = period.status === "closed";

    const all = useMemo(() => state.bills.filter((b) => b.periodId === period.id).map((b) => ({ b, st: billState(b, today) })), [state.bills, period.id, today]);
    const unpaid = all.filter(({ b }) => b.status !== "paid");
    const rows = all.filter(({ b }) => tab === "all" || (tab === "paid" ? b.status === "paid" : b.status !== "paid"));
    const carried = useMemo(() => carriedOver(state, period.id, today).filter((x) => x.kind === "bill"), [state, period.id, today]);

    const columns = [
        { key: "kind", header: "Fatura", sort: ({ b }) => b.kind, render: ({ b }) => <span className="font-bold">{BILL_KIND[b.kind]}</span>, export: { value: ({ b }) => BILL_KIND[b.kind] } },
        { key: "month", header: "Ait olduğu ay", sort: ({ b }) => b.month, render: ({ b }) => monthLabel(b.month), export: { value: ({ b }) => monthLabel(b.month) } },
        { key: "due", header: "Son ödeme", sort: ({ b }) => b.dueDate, render: ({ b }) => <span className="ad-num whitespace-nowrap">{date(b.dueDate)}</span>, export: { type: "date", value: ({ b }) => b.dueDate } },
        { key: "amount", header: "Tutar", align: "end", sort: ({ b }) => b.amount, render: ({ b }) => <span className="ad-num font-bold">{money(b.amount)}</span>, export: { type: "money", value: ({ b }) => b.amount } },
        { key: "note", header: "Not", render: ({ b }) => <span className="block max-w-48 truncate text-xs text-ad-muted">{b.note}</span>, export: { value: ({ b }) => b.note } },
        { key: "paidAt", header: "Ödendiği gün", render: ({ b }) => b.paidAt ? <span className="ad-num">{date(b.paidAt)}</span> : <span className="text-ad-faint">—</span>, export: { value: ({ b }) => (b.paidAt ? date(b.paidAt) : "") } },
        { key: "status", header: "Durum", render: ({ st }) => <StatusBadge map={BILL_STATE} value={st} />, export: { value: ({ st }) => BILL_STATE[st].label } },
        { key: "act", header: "", align: "end", render: ({ b }) => b.status !== "paid" ? <button type="button" onClick={() => setDialog({ pay: b })} className="ad-btn ad-btn-soft ad-btn-sm"><Icon name="check" className="text-[16px]" />Ödendi</button> : null },
    ];

    return (
        <div>
            <PageHeader
                title="Faturalar"
                description="Fatura kaydetmek bakiyeyi değiştirmez. “Ödendi” işlenince gider ve kasa/banka çıkışı oluşur. Faturalar kira fiyatına dahildir, öğrenciye yansıtılmaz."
                actions={<button type="button" disabled={closed} onClick={() => setDialog("add")} title={closed ? "Kapalı dönemde yeni fatura girilmez" : ""} className="ad-btn ad-btn-primary"><Icon name="add" className="text-[20px]" />Fatura ekle</button>}
            />
            <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Ödenmemiş toplam</p><p className="ad-num mt-2 text-2xl font-extrabold">{money(sum(unpaid, ({ b }) => b.amount))}</p><p className="mt-1 text-xs text-ad-muted">{unpaid.length} fatura</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Vadesi geçen</p><p className="ad-num mt-2 text-2xl font-extrabold text-ad-danger">{unpaid.filter(({ st }) => st === "overdue").length}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">7 gün içinde</p><p className="ad-num mt-2 text-2xl font-extrabold text-ad-warn">{unpaid.filter(({ st }) => st === "soon").length}</p></Card>
            </div>

            {carried.length > 0 && (
                <Card title="Önceki dönemlerden ödenmemiş faturalar" description="Ödeme, faturanın ait olduğu döneme yazılır." className="mb-5">
                    <ul className="mt-4 divide-y divide-ad-line">
                        {carried.map(({ bill, period: p }) => (
                            <li key={bill.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                                <span><b>{BILL_KIND[bill.kind]}</b> · {monthLabel(bill.month)} <span className="text-xs text-ad-muted">· {p.name}</span></span>
                                <span className="flex items-center gap-3"><span className="ad-num font-bold">{money(bill.amount)}</span><button type="button" onClick={() => setDialog({ pay: bill })} className="ad-btn ad-btn-soft ad-btn-sm">Ödendi</button></span>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <div className="mb-4"><Chips value={tab} onChange={setTab} items={[{ value: "unpaid", label: "Ödenmemiş", count: unpaid.length }, { value: "paid", label: "Ödenen", count: all.length - unpaid.length }, { value: "all", label: "Tümü", count: all.length }]} /></div>
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={({ b }) => b.id}
                initialSort={{ key: "due", dir: "asc" }}
                exportName="faturalar"
                empty={{ icon: "description", title: "Fatura yok", description: tab === "unpaid" ? "Ödenmemiş fatura kalmadı." : "Bu görünümde fatura yok." }}
            />
            {dialog === "add" && <BillDialog onClose={() => setDialog(null)} />}
            {dialog?.pay && <PayBillDialog bill={dialog.pay} today={today} onClose={() => setDialog(null)} />}
        </div>
    );
}

function BillDialog({ onClose }) {
    const { period, today } = useAdmin();
    const { exec, busy } = useCommand();
    const [f, setF] = useState({ kind: "electricity", month: today.slice(0, 7), amount: "", dueDate: today, note: "" });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(addBill, { periodId: period.id, ...f }, "Fatura kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title="Fatura ekle" description="Kaydedildiğinde kasa/banka bakiyesi değişmez." onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Faturayı kaydet">
            <Field label="Tür" required><SelectInput value={f.kind} onChange={set("kind")}>{Object.entries(BILL_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</SelectInput></Field>
            <Field label="Ait olduğu ay" required><input type="month" value={f.month} onChange={set("month")} className="ad-field" /></Field>
            <Field label="Tutar" required><NumberInput suffix="₺" min="0" step="0.01" value={f.amount} onChange={set("amount")} /></Field>
            <Field label="Son ödeme tarihi" required><DateInput value={f.dueDate} onChange={set("dueDate")} /></Field>
            <Field label="Not" className="sm:col-span-2"><TextInput value={f.note} onChange={set("note")} placeholder="İsteğe bağlı: abone no, daire..." /></Field>
        </FormDialog>
    );
}

function PayBillDialog({ bill, today, onClose }) {
    const { state } = useAdmin();
    const { exec, busy } = useCommand();
    const [f, setF] = useState({ accountId: "acc-bank1", date: today });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(payBill, { billId: bill.id, ...f }, "Fatura ödendi, gider olarak kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title="Faturayı öde" description={`${BILL_KIND[bill.kind]} · ${monthLabel(bill.month)} · ${money(bill.amount)}`} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Ödendi olarak işle" columns={1}>
            <Field label="Hangi hesaptan ödendi" required><SelectInput value={f.accountId} onChange={set("accountId")}>{state.accounts.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectInput></Field>
            <Field label="Ödeme tarihi" required><DateInput value={f.date} onChange={set("date")} /></Field>
            <p className="text-xs text-ad-muted">Bu işlem “Faturalar” kategorisinde bir gider ve seçilen hesaptan bir çıkış hareketi oluşturur.</p>
        </FormDialog>
    );
}
