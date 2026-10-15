"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import DataTable from "@/components/admin/DataTable";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { DateInput, Field, NumberInput, SelectInput, TextInput } from "@/components/admin/fields";
import { accountBalance, round, sum } from "@/lib/admin/domain/accounting";
import { addAccount, addOpeningBalance, transfer } from "@/lib/admin/domain/ledger";
import { ACCOUNT_TYPE, TX_SOURCE, date, money } from "@/lib/admin/labels";
import DateRange, { inRange } from "./DateRange";

export default function CashBankView() {
    const { state, view, period, today } = useAdmin();
    const [dialog, setDialog] = useState(null);
    const [accountId, setAccountId] = useState("");
    const [direction, setDirection] = useState("");
    const [range, setRange] = useState({ from: "", to: "" });
    const closed = period.status === "closed";

    const tx = useMemo(() => state.transactions.filter((t) => t.periodId === period.id), [state.transactions, period.id]);
    const accounts = state.accounts.map((a) => {
        const mine = tx.filter((t) => t.accountId === a.id);
        const opening = sum(mine.filter((t) => t.source === "opening"), (t) => t.amount);
        const inflow = sum(mine.filter((t) => t.direction === "in" && t.source !== "opening"), (t) => t.amount);
        const outflow = sum(mine.filter((t) => t.direction === "out"), (t) => t.amount);
        return { a, opening, inflow, outflow, balance: accountBalance(a.id, tx) };
    });
    const cash = sum(accounts.filter((x) => x.a.type === "cash"), (x) => x.balance);
    const bank = sum(accounts.filter((x) => x.a.type === "bank"), (x) => x.balance);

    // Çapraz kontrol: açılış + tahsilat − iade − gider = hesap bakiyeleri toplamı (transferler birbirini götürür)
    const openingTotal = sum(tx.filter((t) => t.source === "opening"), (t) => t.amount);
    const t = view.totals;
    const expected = round(openingTotal + t.collected - t.refunded - t.spent);
    const consistent = expected === round(cash + bank);

    const rows = tx
        .filter((x) => (!accountId || x.accountId === accountId) && (!direction || x.direction === direction) && inRange(x.date, range))
        .map((x) => ({ x, account: state.accounts.find((a) => a.id === x.accountId) }));

    const columns = [
        { key: "date", header: "Tarih", sort: ({ x }) => x.date + x.createdAt, render: ({ x }) => <span className="ad-num whitespace-nowrap">{date(x.date)}</span>, export: { type: "date", value: ({ x }) => x.date } },
        { key: "account", header: "Hesap", render: ({ account }) => account?.name, export: { value: ({ account }) => account?.name ?? "" } },
        { key: "source", header: "Kaynak", render: ({ x }) => <Badge tone={x.source === "transfer" ? "accent" : x.direction === "in" ? "ok" : "warn"}>{TX_SOURCE[x.source] ?? x.source}</Badge>, export: { value: ({ x }) => TX_SOURCE[x.source] ?? x.source } },
        { key: "note", header: "Açıklama", render: ({ x }) => <span className="block max-w-72 truncate text-xs text-ad-body">{x.note}</span>, export: { value: ({ x }) => x.note, width: 36 } },
        { key: "in", header: "Giriş", align: "end", sort: ({ x }) => (x.direction === "in" ? x.amount : 0), render: ({ x }) => x.direction === "in" ? <span className="ad-num font-bold text-ad-ok">{money(x.amount)}</span> : <span className="text-ad-faint">—</span>, export: { type: "money", value: ({ x }) => (x.direction === "in" ? x.amount : 0) } },
        { key: "out", header: "Çıkış", align: "end", sort: ({ x }) => (x.direction === "out" ? x.amount : 0), render: ({ x }) => x.direction === "out" ? <span className="ad-num font-bold text-ad-danger">{money(x.amount)}</span> : <span className="text-ad-faint">—</span>, export: { type: "money", value: ({ x }) => (x.direction === "out" ? x.amount : 0) } },
    ];

    return (
        <div>
            <PageHeader
                title="Kasa & Banka"
                description="Nakit kasa ve banka hesapları. Bakiye, hesap hareketlerinden hesaplanır; hareketler silinmez, düzeltme ters kayıtla yapılır."
                actions={
                    <>
                        <button type="button" disabled={closed} onClick={() => setDialog("account")} className="ad-btn ad-btn-outline"><Icon name="add" className="text-[20px]" />Hesap ekle</button>
                        <button type="button" disabled={closed} onClick={() => setDialog("opening")} className="ad-btn ad-btn-outline"><Icon name="flag" className="text-[20px]" />Açılış bakiyesi</button>
                        <button type="button" disabled={closed} onClick={() => setDialog("transfer")} className="ad-btn ad-btn-primary"><Icon name="swap_horiz" className="text-[20px]" />Transfer</button>
                    </>
                }
            />

            <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {accounts.filter((x) => x.a.active).map(({ a, opening, inflow, outflow, balance }) => (
                    <Card key={a.id}>
                        <div className="flex items-center justify-between gap-2">
                            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ad-muted"><Icon name={a.type === "cash" ? "payments" : "account_balance"} className="text-[16px]" />{a.name}</p>
                            <Badge tone={a.type === "cash" ? "ok" : "brand"}>{ACCOUNT_TYPE[a.type]}</Badge>
                        </div>
                        <p className={`ad-num mt-3 text-2xl font-extrabold ${balance < 0 ? "text-ad-danger" : ""}`}>{money(balance)}</p>
                        <dl className="mt-3 space-y-1 text-xs text-ad-muted">
                            <div className="flex justify-between"><dt>Açılış</dt><dd className="ad-num font-semibold text-ad-body">{money(opening)}</dd></div>
                            <div className="flex justify-between"><dt>Girişler</dt><dd className="ad-num font-semibold text-ad-ok">{money(inflow)}</dd></div>
                            <div className="flex justify-between"><dt>Çıkışlar</dt><dd className="ad-num font-semibold text-ad-danger">{money(outflow)}</dd></div>
                        </dl>
                        {a.iban && <p className="mt-2 truncate text-[11px] text-ad-faint">{a.iban}</p>}
                    </Card>
                ))}
            </div>

            <div className={`mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl px-5 py-3.5 text-sm ${consistent ? "bg-ad-ok-soft text-ad-ok" : "bg-ad-danger-soft text-ad-danger"}`}>
                <span className="flex items-center gap-2 font-bold"><Icon name={consistent ? "verified" : "error"} filled className="text-[20px]" />{consistent ? "Hesaplar tutarlı" : "Tutarsızlık var"}</span>
                <span className="text-xs">Kasa {money(cash)} + Banka {money(bank)} = <b className="ad-num">{money(round(cash + bank))}</b> · Açılış {money(openingTotal)} + tahsilat {money(t.collected)} − iade {money(t.refunded)} − gider {money(t.spent)} = <b className="ad-num">{money(expected)}</b></span>
            </div>

            <DataTable
                columns={columns}
                rows={rows}
                rowKey={({ x }) => x.id}
                searchText={({ x }) => x.note}
                searchPlaceholder="Açıklamada ara"
                filters={
                    <>
                        <div className="w-full sm:w-44"><SelectInput value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Tüm hesaplar</option>{state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectInput></div>
                        <div className="w-full sm:w-36"><SelectInput value={direction} onChange={(e) => setDirection(e.target.value)}><option value="">Giriş + çıkış</option><option value="in">Girişler</option><option value="out">Çıkışlar</option></SelectInput></div>
                        <DateRange {...range} onChange={setRange} />
                    </>
                }
                initialSort={{ key: "date", dir: "desc" }}
                exportName="kasa-banka-hareketleri"
                empty={{ icon: "account_balance", title: "Hareket yok", description: "Bu dönemde henüz hesap hareketi yok. Açılış bakiyesi girerek başlayabilirsiniz." }}
            />

            {dialog === "transfer" && <TransferDialog onClose={() => setDialog(null)} today={today} />}
            {dialog === "opening" && <OpeningDialog onClose={() => setDialog(null)} />}
            {dialog === "account" && <AccountDialog onClose={() => setDialog(null)} />}
        </div>
    );
}

function TransferDialog({ onClose, today }) {
    const { state, period } = useAdmin();
    const { exec, busy } = useCommand();
    const active = state.accounts.filter((a) => a.active);
    const [f, setF] = useState({ fromId: "acc-cash", toId: "acc-bank1", amount: "", date: today, note: "" });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(transfer, { periodId: period.id, ...f }, "Transfer yapıldı.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title="Hesaplar arası transfer" description="Gelir ya da gider sayılmaz; bir hesaptan çıkış, diğerine giriş yazılır." onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Transferi yap" columns={1}>
            <Field label="Nereden" required><SelectInput value={f.fromId} onChange={set("fromId")}>{active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectInput></Field>
            <Field label="Nereye" required><SelectInput value={f.toId} onChange={set("toId")}>{active.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectInput></Field>
            <Field label="Tutar" required><NumberInput suffix="₺" min="0" step="0.01" value={f.amount} onChange={set("amount")} /></Field>
            <Field label="Tarih" required><DateInput value={f.date} onChange={set("date")} /></Field>
            <Field label="Açıklama"><TextInput value={f.note} onChange={set("note")} placeholder="Örn. Kasadaki nakit bankaya yatırıldı" /></Field>
        </FormDialog>
    );
}

function OpeningDialog({ onClose }) {
    const { state, period } = useAdmin();
    const { exec, busy } = useCommand();
    const done = new Set(state.transactions.filter((t) => t.periodId === period.id && t.source === "opening").map((t) => t.accountId));
    const free = state.accounts.filter((a) => a.active && !done.has(a.id));
    const [f, setF] = useState({ accountId: free[0]?.id ?? "", amount: "", date: period.start });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(addOpeningBalance, { periodId: period.id, ...f }, "Açılış bakiyesi girildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title="Açılış bakiyesi" description={`${period.name} başında hesapta bulunan tutar. Her hesap için bir kez girilir.`} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" columns={1}>
            {free.length === 0 ? <p className="text-sm text-ad-muted">Tüm hesaplar için açılış bakiyesi girilmiş. Düzeltme gerekiyorsa transfer ya da gider/tahsilat ters kaydı kullanın.</p> : (
                <>
                    <Field label="Hesap" required><SelectInput value={f.accountId} onChange={set("accountId")}>{free.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectInput></Field>
                    <Field label="Tutar" required><NumberInput suffix="₺" min="0" step="0.01" value={f.amount} onChange={set("amount")} /></Field>
                    <Field label="Tarih" required><DateInput value={f.date} onChange={set("date")} /></Field>
                </>
            )}
        </FormDialog>
    );
}

function AccountDialog({ onClose }) {
    const { exec, busy } = useCommand();
    const [f, setF] = useState({ type: "bank", name: "", iban: "" });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(addAccount, f, "Hesap eklendi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title="Hesap ekle" onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Hesabı ekle" columns={1}>
            <Field label="Tür" required><SelectInput value={f.type} onChange={set("type")}><option value="bank">Banka hesabı</option><option value="cash">Nakit kasa</option></SelectInput></Field>
            <Field label="Hesap adı" required><TextInput value={f.name} onChange={set("name")} placeholder="Örn. Ziraat Bankası" /></Field>
            {f.type === "bank" && <Field label="IBAN" hint="İsteğe bağlı."><TextInput value={f.iban} onChange={set("iban")} placeholder="TR00 0000 0000 0000 0000 0000 00" /></Field>}
        </FormDialog>
    );
}
