"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import DataTable from "@/components/admin/DataTable";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import { Badge, Card, Chips, PageHeader, ProgressBar } from "@/components/admin/ui";
import { DateInput, Field, NumberInput, SelectInput, TextInput } from "@/components/admin/fields";
import { sum } from "@/lib/admin/domain/accounting";
import { addExpense, cancelExpense } from "@/lib/admin/domain/ledger";
import { date, money } from "@/lib/admin/labels";
import DateRange, { inRange } from "./DateRange";

export default function ExpensesView() {
    const { state, period, today } = useAdmin();
    const [tab, setTab] = useState("live");
    const [categoryId, setCategoryId] = useState("");
    const [range, setRange] = useState({ from: "", to: "" });
    const [dialog, setDialog] = useState(null); // "add" | expense
    const closed = period.status === "closed";

    const all = useMemo(
        () => state.expenses.filter((e) => e.periodId === period.id).map((e) => ({
            e, category: state.expenseCategories.find((c) => c.id === e.categoryId), account: state.accounts.find((a) => a.id === e.accountId),
        })),
        [state.expenses, state.expenseCategories, state.accounts, period.id]
    );
    const live = all.filter(({ e }) => !e.cancelledAt);
    const total = sum(live, ({ e }) => e.amount);
    const byCategory = state.expenseCategories
        .map((c) => ({ c, amount: sum(live.filter(({ e }) => e.categoryId === c.id), ({ e }) => e.amount) }))
        .filter((x) => x.amount > 0)
        .sort((a, b) => b.amount - a.amount);

    const rows = all.filter(({ e }) => (tab === "all" || (tab === "live" ? !e.cancelledAt : !!e.cancelledAt)) && (!categoryId || e.categoryId === categoryId) && inRange(e.date, range));

    const columns = [
        { key: "date", header: "Tarih", sort: ({ e }) => e.date, render: ({ e }) => <span className="ad-num whitespace-nowrap">{date(e.date)}</span>, export: { type: "date", value: ({ e }) => e.date } },
        { key: "cat", header: "Kategori", render: ({ category }) => category?.name, export: { value: ({ category }) => category?.name ?? "" } },
        { key: "desc", header: "Açıklama", render: ({ e }) => <div className="min-w-0"><span className={`font-semibold ${e.cancelledAt ? "line-through opacity-60" : ""}`}>{e.description}</span>{e.billId && <Badge tone="accent" className="ms-2">Fatura</Badge>}{e.cancelledAt && <p className="text-[11px] text-ad-muted">İptal: {e.cancelReason}</p>}</div>, export: { value: ({ e }) => e.description, width: 36 } },
        { key: "account", header: "Ödeme hesabı", render: ({ account }) => account?.name, export: { value: ({ account }) => account?.name ?? "" } },
        { key: "amount", header: "Tutar", align: "end", sort: ({ e }) => e.amount, render: ({ e }) => <span className={`ad-num font-bold ${e.cancelledAt ? "text-ad-faint line-through" : "text-ad-danger"}`}>{money(e.amount)}</span>, export: { type: "money", value: ({ e }) => e.amount } },
        { key: "status", header: "Durum", render: ({ e }) => e.cancelledAt ? <Badge tone="neutral">İptal edildi</Badge> : <Badge tone="ok">Geçerli</Badge>, export: { value: ({ e }) => (e.cancelledAt ? "İptal edildi" : "Geçerli") } },
        { key: "act", header: "", align: "end", render: ({ e }) => !e.cancelledAt && !closed ? <button type="button" onClick={() => setDialog(e)} className="text-xs font-bold text-ad-danger hover:underline">İptal et</button> : null },
    ];

    return (
        <div>
            <PageHeader
                title="Giderler"
                description="Apartın harcamaları. Faturalar, ödemesi işlenince buraya otomatik gider olarak düşer."
                actions={<button type="button" disabled={closed} onClick={() => setDialog("add")} title={closed ? "Kapalı dönemde yeni gider girilmez" : ""} className="ad-btn ad-btn-primary"><Icon name="add" className="text-[20px]" />Gider ekle</button>}
            />
            <div className="mb-5 grid gap-4 lg:grid-cols-3">
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Toplam gider</p><p className="ad-num mt-2 text-3xl font-extrabold text-ad-danger">{money(total)}</p><p className="mt-1 text-xs text-ad-muted">{live.length} geçerli kayıt</p></Card>
                <Card title="Kategoriye göre" className="lg:col-span-2">
                    {byCategory.length === 0 ? <p className="mt-4 text-sm text-ad-muted">Henüz gider yok.</p> : (
                        <ul className="mt-4 space-y-2.5">
                            {byCategory.map(({ c, amount }) => (
                                <li key={c.id} className="grid grid-cols-[8rem_1fr_6rem] items-center gap-3 text-sm">
                                    <span className="truncate font-semibold">{c.name}</span>
                                    <ProgressBar value={total ? amount / total : 0} tone="accent" />
                                    <span className="ad-num text-end font-bold">{money(amount)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
            <div className="mb-4"><Chips value={tab} onChange={setTab} items={[{ value: "live", label: "Geçerli", count: live.length }, { value: "cancelled", label: "İptal edilen", count: all.length - live.length }, { value: "all", label: "Tümü", count: all.length }]} /></div>
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={({ e }) => e.id}
                searchText={({ e }) => e.description}
                searchPlaceholder="Açıklamada ara"
                filters={<><div className="w-full sm:w-48"><SelectInput value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Tüm kategoriler</option>{state.expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectInput></div><DateRange {...range} onChange={setRange} /></>}
                initialSort={{ key: "date", dir: "desc" }}
                exportName="giderler"
                empty={{ icon: "receipt_long", title: "Gider yok", description: "Bu görünümde gider kaydı bulunamadı." }}
            />
            {dialog === "add" && <ExpenseDialog today={today} onClose={() => setDialog(null)} />}
            {dialog && dialog !== "add" && <CancelExpenseDialog expense={dialog} onClose={() => setDialog(null)} />}
        </div>
    );
}

function ExpenseDialog({ today, onClose }) {
    const { state, period } = useAdmin();
    const { exec, busy } = useCommand();
    const cats = state.expenseCategories.filter((c) => !c.system);
    const [f, setF] = useState({ categoryId: cats[0]?.id ?? "", amount: "", date: today, accountId: "acc-cash", description: "" });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(addExpense, { periodId: period.id, ...f }, "Gider kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title="Gider ekle" description="Faturalar için Faturalar sayfasını kullanın." onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Gideri kaydet">
            <Field label="Kategori" required><SelectInput value={f.categoryId} onChange={set("categoryId")}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectInput></Field>
            <Field label="Tutar" required><NumberInput suffix="₺" min="0" step="0.01" value={f.amount} onChange={set("amount")} /></Field>
            <Field label="Tarih" required><DateInput value={f.date} onChange={set("date")} /></Field>
            <Field label="Ödeme hesabı" required><SelectInput value={f.accountId} onChange={set("accountId")}>{state.accounts.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectInput></Field>
            <Field label="Açıklama" required className="sm:col-span-2"><TextInput value={f.description} onChange={set("description")} placeholder="Örn. Daire 2 musluk tamiri" /></Field>
        </FormDialog>
    );
}

function CancelExpenseDialog({ expense, onClose }) {
    const { exec, busy } = useCommand();
    const [reason, setReason] = useState("");
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(cancelExpense, { expenseId: expense.id, reason }, "Gider iptal edildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title="Gideri iptal et" description={`${expense.description} · ${money(expense.amount)}`} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Gideri iptal et" danger columns={1}>
            <div className="rounded-2xl bg-ad-warn-soft p-4 text-xs text-ad-warn">Gider silinmez; ters hareket yazılır ve tutar hesaba geri girer. {expense.billId && "Faturadan gelen bir gider; iptal edilince fatura yeniden “ödenmedi” olur."}</div>
            <Field label="İptal nedeni" required><TextInput as="textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></Field>
        </FormDialog>
    );
}
