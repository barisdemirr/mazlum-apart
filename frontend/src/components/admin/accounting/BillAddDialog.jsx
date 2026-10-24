"use client";

import { useState } from "react";
import FormDialog from "@/components/admin/FormDialog";
import { DateInput, Field, NumberInput, SelectInput, TextInput } from "@/components/admin/fields";
import useCommand from "@/components/admin/useCommand";
import { addBill } from "@/lib/admin/commands/finance";
import { BILL_KIND } from "@/lib/admin/labels";

const WITH_SUBSCRIPTION = ["electricity", "gas"];

/**
 * Fatura ekle. Elektrik / doğalgaz seçilince kayıtlı aboneliklerden biri seçilebilir; fatura o abone numarasına kaydedilir.
 * O ayın "fatura bekleniyor" kaydı varsa yeni kayıt açılmaz, o kayıt gerçek faturaya çevrilir.
 */
export default function BillAddDialog({ periodId, today, subscriptions = [], onClose }) {
    const { exec, busy } = useCommand();
    const [v, setV] = useState({ kind: "electricity", subscriptionId: "", month: today.slice(0, 7), amount: "", dueDate: today, note: "" });
    const set = (name) => (e) => setV((x) => ({ ...x, [name]: e?.target ? e.target.value : e }));

    const usesSubscription = WITH_SUBSCRIPTION.includes(v.kind);
    const options = subscriptions.filter((s) => s.kind === v.kind && s.active);

    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(addBill, { ...v, periodId, subscriptionId: usesSubscription ? v.subscriptionId : "" }, "Fatura eklendi.");
        if (out.ok) onClose();
    };

    return (
        <FormDialog open title="Fatura ekle" onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" size="md">
            <Field label="Tür" required>
                <SelectInput value={v.kind} onChange={(e) => setV((x) => ({ ...x, kind: e.target.value, subscriptionId: "" }))}>
                    {Object.entries(BILL_KIND).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </SelectInput>
            </Field>
            {usesSubscription && (
                <Field label="Abonelik (abone no)" hint={options.length === 0 ? "Bu türde kayıtlı abonelik yok. Abonelikler sekmesinden ekleyebilirsiniz." : "İsteğe bağlı: seçerseniz fatura bu abone numarasına kaydedilir."}>
                    <SelectInput value={v.subscriptionId} onChange={set("subscriptionId")}>
                        <option value="">Abonelik seçmeden ekle</option>
                        {options.map((s) => <option key={s.id} value={s.id}>{s.subscriberNo}{s.provider ? ` · ${s.provider}` : ""}</option>)}
                    </SelectInput>
                </Field>
            )}
            <Field label="Ay (YYYY-AA)" required><TextInput value={v.month} onChange={set("month")} /></Field>
            <Field label="Tutar" required><NumberInput min="0" step="0.01" value={v.amount} onChange={set("amount")} suffix="₺" /></Field>
            <Field label="Son ödeme tarihi"><DateInput value={v.dueDate} onChange={set("dueDate")} /></Field>
            <Field label="Not" className="sm:col-span-2"><TextInput value={v.note} onChange={set("note")} /></Field>
        </FormDialog>
    );
}
