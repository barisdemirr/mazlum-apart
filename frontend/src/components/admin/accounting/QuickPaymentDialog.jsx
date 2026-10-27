"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import FormDialog from "@/components/admin/FormDialog";
import ReceiptDialog from "@/components/admin/accounting/Receipt";
import { DateInput, Field, NumberInput, SelectInput, TextInput } from "@/components/admin/fields";
import { Avatar } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import useCommand from "@/components/admin/useCommand";
import { adaptRow } from "@/lib/admin/adapters";
import { listAccounts, listEnrollments, recordPayment } from "@/lib/admin/commands/finance";
import { METHOD, money } from "@/lib/admin/labels";
import { defaultAccountId } from "@/lib/admin/accounts";

const norm = (s) => String(s ?? "").toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
const live = (r) => !["cancelled", "left"].includes(r.enrollment.status);

/**
 * Hızlı tahsilat: öğrenci hesabına girmeden, ada göre arayıp seçerek tahsilat alır. Kaydedilince makbuz açılır.
 * Kayıt, öğrenci hesabındaki tahsilatla AYNI komuttur (recordPayment); dağıtım ve kasa/banka kuralları backend'dedir.
 */
export default function QuickPaymentDialog({ onClose }) {
    const { periodId, today } = useAdmin();
    const { exec, busy } = useCommand();
    const [rows, setRows] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [loadError, setLoadError] = useState(null);
    const [q, setQ] = useState("");
    const [picked, setPicked] = useState(null);
    const [v, setV] = useState({ amount: "", date: today, method: "cash", accountId: "", note: "" });
    const [receiptId, setReceiptId] = useState(null);

    useEffect(() => {
        let alive = true;
        Promise.all([listEnrollments({ periodId }), listAccounts()])
            .then(([e, a]) => { if (alive) { setRows(e.map(adaptRow).filter(live)); setAccounts(a.filter((x) => x.active !== false)); } })
            .catch((e) => alive && setLoadError(e?.detail || e?.message || "Liste yüklenemedi."));
        return () => { alive = false; };
    }, [periodId]);

    const matches = useMemo(() => {
        if (!rows) return [];
        const t = norm(q);
        const list = t ? rows.filter((r) => norm(`${r.student.firstName} ${r.student.lastName} ${r.student.tc} ${r.student.phone} ${r.room?.label ?? ""}`).includes(t)) : rows;
        return list.slice(0, 8);
    }, [rows, q]);

    const accountType = v.method === "cash" ? "cash" : "bank";
    const options = accounts.filter((a) => a.type === accountType);
    // yöntem ya da hesap listesi değişince geçerli bir hesap seçili kalsın
    useEffect(() => {
        if (!options.some((a) => a.id === v.accountId)) setV((x) => ({ ...x, accountId: defaultAccountId(accounts, accountType) }));
    }, [v.method, accounts]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (name) => (e) => setV((x) => ({ ...x, [name]: e?.target ? e.target.value : e }));
    const pick = (r) => { setPicked(r); setV((x) => ({ ...x, amount: (r.summary.next?.remaining || r.summary.remaining) > 0 ? (r.summary.next?.remaining || r.summary.remaining) : "" })); };

    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(recordPayment, { enrollmentId: picked.enrollment.id, ...v }, "Tahsilat kaydedildi.");
        if (out.ok) setReceiptId(out.result.paymentId);
    };

    if (receiptId) return <ReceiptDialog paymentId={receiptId} onClose={onClose} />;

    const name = picked ? `${picked.student.firstName} ${picked.student.lastName}` : "";
    return (
        <FormDialog open size="lg" columns={1} title="Tahsilat gir" description={picked ? name : "Önce öğrenciyi seçin"} onClose={onClose} onSubmit={picked ? submit : undefined} busy={busy} saveLabel="Kaydet ve makbuz oluştur">
            {!picked ? (
                <>
                    <TextInput autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci adı, T.C., telefon veya oda ara" />
                    {loadError ? <p className="text-sm text-ad-danger">{loadError}</p> : !rows ? <p className="text-sm text-ad-muted">Öğrenciler yükleniyor…</p> : matches.length === 0 ? <p className="text-sm text-ad-muted">Eşleşen öğrenci yok.</p> : (
                        <ul className="divide-y divide-ad-line rounded-2xl border border-ad-line">
                            {matches.map((r) => (
                                <li key={r.enrollment.id}>
                                    <button type="button" onClick={() => pick(r)} className="flex w-full items-center gap-3 px-3 py-2.5 text-start hover:bg-ad-sunken">
                                        <Avatar name={`${r.student.firstName} ${r.student.lastName}`} />
                                        <span className="min-w-0 flex-1"><span className="block truncate font-bold">{r.student.firstName} {r.student.lastName}</span><span className="block text-[11px] text-ad-muted">{r.room?.label ?? "Yerleşmedi"}</span></span>
                                        <span className={`ad-num text-sm font-bold ${r.summary.overdue > 0 ? "text-ad-danger" : ""}`}>{r.summary.remaining > 0 ? `${money(r.summary.remaining)} borç` : "Borç yok"}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            ) : (
                <>
                    <div className="flex items-center gap-3 rounded-2xl bg-ad-sunken p-3">
                        <Avatar name={name} />
                        <div className="min-w-0 flex-1"><div className="truncate font-bold">{name}</div><div className="text-[11px] text-ad-muted">{picked.room?.label ?? "Yerleşmedi"} · Kalan borç {money(picked.summary.remaining)}{picked.summary.advance > 0 ? ` · Avans ${money(picked.summary.advance)}` : ""}</div></div>
                        <button type="button" onClick={() => setPicked(null)} className="text-xs font-bold text-ad-brand hover:underline"><Icon name="swap_horiz" className="align-middle text-[16px]" /> Değiştir</button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Tutar" required><NumberInput min="0" step="0.01" value={v.amount} onChange={set("amount")} suffix="₺" /></Field>
                        <Field label="Ödeme tarihi"><DateInput value={v.date} onChange={set("date")} /></Field>
                        <Field label="Yöntem"><SelectInput value={v.method} onChange={set("method")}>{Object.entries(METHOD).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</SelectInput></Field>
                        <Field label="Hesap (kasa / banka)" required><SelectInput value={v.accountId} onChange={set("accountId")}>{options.length === 0 && <option value="">Uygun hesap yok</option>}{options.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectInput></Field>
                        <Field label="Not" className="sm:col-span-2"><TextInput value={v.note} onChange={set("note")} /></Field>
                    </div>
                    <p className="text-xs text-ad-muted">Tutar sıradaki ödenmemiş taksit olarak gelir, değiştirebilirsiniz. Tutar, en eski vadeli borçtan başlayarak kalemlere otomatik dağıtılır; fazlası avans olur. Makbuzda hangi aya ait olduğu yazar.</p>
                </>
            )}
        </FormDialog>
    );
}
