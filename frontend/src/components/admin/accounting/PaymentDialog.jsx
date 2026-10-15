"use client";

import { useMemo, useState } from "react";
import FormDialog from "@/components/admin/FormDialog";
import { DateInput, Field, NumberInput, SelectInput, Switch, TextInput } from "@/components/admin/fields";
import { Badge } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { useToast } from "@/components/admin/Toast";
import useCommand from "@/components/admin/useCommand";
import { planFifo, round, sum } from "@/lib/admin/domain/accounting";
import { enrollmentSummary, recordPayment } from "@/lib/admin/domain/ledger";
import { CHARGE_KIND, METHOD, date, money } from "@/lib/admin/labels";
import { monthLabel } from "@/lib/admin/domain/dates";

export const itemLabel = (i) =>
    i.kind === "rent" ? `${monthLabel(i.month, { short: true })} kirası` : i.kind === "deposit" ? "Depozito" : `${CHARGE_KIND[i.kind]}${i.note ? ` · ${i.note}` : ""}`;

/**
 * Tahsilat girişi. Tutar kira tutarına bağlı değildir: açık borçlara vadesi en eski olandan dağıtılır,
 * fazlası avans olur. "Elle dağıt" ile dağıtım değiştirilebilir. Önizleme, kaydetmeden önce sonucu gösterir.
 * enrollmentId verilmezse öğrenci seçtirilir.
 */
export default function PaymentDialog({ enrollmentId = null, onClose }) {
    const { state, today, period } = useAdmin();
    const { exec, busy } = useCommand();
    const toast = useToast();

    const [eid, setEid] = useState(enrollmentId ?? "");
    const [amount, setAmount] = useState("");
    const [day, setDay] = useState(today);
    const [method, setMethod] = useState("cash");
    const [accountId, setAccountId] = useState("acc-cash");
    const [note, setNote] = useState("");
    const [manual, setManual] = useState(false);
    const [lines, setLines] = useState({});

    const choices = state.enrollments
        .filter((e) => e.periodId === period.id)
        .map((e) => ({ e, s: state.students.find((x) => x.id === e.studentId) }))
        .sort((a, b) => a.s.lastName.localeCompare(b.s.lastName, "tr"));

    const summary = useMemo(() => (eid ? enrollmentSummary(state, eid, today) : null), [state, eid, today]);
    const open = summary ? summary.items.filter((i) => i.remaining > 0 && i.net > 0) : [];
    const value = round(Number(amount) || 0);

    const auto = useMemo(() => planFifo(value, open), [value, open]);
    const manualTotal = sum(Object.values(lines), (v) => Number(v) || 0);

    const accounts = state.accounts.filter((a) => a.active && (method === "cash" ? a.type === "cash" : method === "transfer" ? a.type === "bank" : true));

    const changeMethod = (m) => {
        setMethod(m);
        const first = state.accounts.find((a) => a.active && (m === "cash" ? a.type === "cash" : a.type === "bank"));
        if (first) setAccountId(first.id);
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!eid) return toast.error("Öğrenciyi seçin.");
        if (manual && manualTotal > value) return toast.error("Dağıtılan tutar tahsilat tutarını aşıyor.");
        const input = { enrollmentId: eid, amount: value, date: day, method, accountId, note };
        if (manual) input.allocations = Object.entries(lines).map(([chargeId, v]) => ({ chargeId, amount: Number(v) || 0 }));
        const out = await exec(recordPayment, input);
        if (out.ok) {
            const adv = out.result.advance;
            toast.success(adv > 0 ? `Tahsilat girildi. ${money(adv)} avans olarak kaldı.` : "Tahsilat girildi.");
            onClose();
        }
    };

    const preview = manual ? open.map((i) => ({ item: i, amount: Number(lines[i.id]) || 0 })).filter((x) => x.amount > 0) : auto.lines.map((l) => ({ item: open.find((i) => i.id === l.chargeId), amount: l.amount }));
    const leftover = manual ? round(value - manualTotal) : auto.leftover;

    return (
        <FormDialog open size="lg" title="Tahsilat al" description={period.name} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Tahsilatı kaydet">
            <Field label="Öğrenci" required className="sm:col-span-2">
                <SelectInput value={eid} onChange={(e) => { setEid(e.target.value); setLines({}); }} disabled={!!enrollmentId}>
                    <option value="">Öğrenci seçin</option>
                    {choices.map(({ e, s }) => <option key={e.id} value={e.id}>{s.firstName} {s.lastName}</option>)}
                </SelectInput>
            </Field>

            {summary && (
                <div className="grid grid-cols-3 gap-3 rounded-2xl bg-ad-sunken p-4 text-sm sm:col-span-2">
                    <div><p className="text-[11px] font-bold uppercase tracking-wider text-ad-muted">Kalan borç</p><p className="ad-num mt-0.5 font-extrabold">{money(summary.remaining)}</p></div>
                    <div><p className="text-[11px] font-bold uppercase tracking-wider text-ad-muted">Vadesi geçen</p><p className={`ad-num mt-0.5 font-extrabold ${summary.overdue > 0 ? "text-ad-danger" : ""}`}>{money(summary.overdue)}</p></div>
                    <div><p className="text-[11px] font-bold uppercase tracking-wider text-ad-muted">Mevcut avans</p><p className="ad-num mt-0.5 font-extrabold text-ad-accent">{money(summary.advance)}</p></div>
                </div>
            )}

            <Field label="Tutar" required hint="Kira tutarıyla aynı olmak zorunda değil; istenen tutar alınır.">
                <NumberInput suffix="₺" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Tarih" required><DateInput value={day} onChange={(e) => setDay(e.target.value)} /></Field>

            {summary && (summary.overdue > 0 || summary.remaining > 0) && (
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                    {summary.overdue > 0 && <button type="button" onClick={() => setAmount(String(summary.overdue))} className="ad-btn ad-btn-soft ad-btn-sm">Vadesi geçeni yaz · {money(summary.overdue)}</button>}
                    {summary.next && <button type="button" onClick={() => setAmount(String(summary.next.remaining))} className="ad-btn ad-btn-soft ad-btn-sm">Sıradaki kalem · {money(summary.next.remaining)}</button>}
                    <button type="button" onClick={() => setAmount(String(summary.remaining))} className="ad-btn ad-btn-soft ad-btn-sm">Tüm kalan · {money(summary.remaining)}</button>
                </div>
            )}

            <Field label="Yöntem" required>
                <SelectInput value={method} onChange={(e) => changeMethod(e.target.value)}>
                    {Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectInput>
            </Field>
            <Field label={method === "cash" ? "Kasa" : "Banka hesabı"} required>
                <SelectInput value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </SelectInput>
            </Field>
            <Field label="Açıklama" className="sm:col-span-2"><TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="İsteğe bağlı: dekont no, not..." /></Field>

            {summary && value > 0 && (
                <div className="space-y-3 sm:col-span-2">
                    <Switch checked={manual} onChange={(v) => { setManual(v); setLines({}); }} label="Dağıtımı elle yap" hint="Kapalıysa vadesi en eski kalemden başlayarak otomatik dağıtılır." />
                    <div className="rounded-2xl border border-ad-line p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">{manual ? "Hangi kaleme ne kadar" : "Otomatik dağıtım önizlemesi"}</p>
                        {manual ? (
                            <ul className="mt-3 space-y-2">
                                {open.length === 0 && <li className="text-sm text-ad-muted">Açık borç yok; tutarın tamamı avans olur.</li>}
                                {open.map((i) => (
                                    <li key={i.id} className="flex items-center gap-3 text-sm">
                                        <span className="min-w-0 flex-1"><span className="font-semibold">{itemLabel(i)}</span> <span className="text-xs text-ad-muted">· kalan {money(i.remaining)} · {date(i.dueDate)}</span></span>
                                        <div className="w-32"><NumberInput suffix="₺" min="0" max={i.remaining} step="0.01" value={lines[i.id] ?? ""} onChange={(e) => setLines({ ...lines, [i.id]: e.target.value })} /></div>
                                        <button type="button" onClick={() => setLines({ ...lines, [i.id]: String(Math.min(i.remaining, Math.max(0, round(value - manualTotal + (Number(lines[i.id]) || 0))))) })} className="text-xs font-bold text-ad-brand hover:underline">Doldur</button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <ul className="mt-3 space-y-1.5">
                                {preview.map(({ item, amount: a }) => (
                                    <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                                        <span className="font-semibold">{itemLabel(item)} <span className="text-xs font-normal text-ad-muted">· {date(item.dueDate)}</span></span>
                                        <span className="ad-num font-bold">{money(a)}{a < item.remaining ? <span className="ms-1 text-xs font-medium text-ad-muted">(kalan {money(round(item.remaining - a))})</span> : <Badge tone="ok" className="ms-2">Kapanır</Badge>}</span>
                                    </li>
                                ))}
                                {preview.length === 0 && <li className="text-sm text-ad-muted">Açık borç yok.</li>}
                            </ul>
                        )}
                        <div className={`mt-3 flex items-center justify-between border-t border-ad-line pt-3 text-sm font-bold ${leftover < 0 ? "text-ad-danger" : ""}`}>
                            <span>{leftover < 0 ? "Tutarı aşan dağıtım" : "Avans olarak kalacak"}</span>
                            <span className="ad-num">{money(Math.abs(leftover))}</span>
                        </div>
                    </div>
                </div>
            )}
        </FormDialog>
    );
}
