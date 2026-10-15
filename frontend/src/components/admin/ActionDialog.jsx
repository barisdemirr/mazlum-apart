"use client";

import { useState } from "react";
import FormDialog from "@/components/admin/FormDialog";
import { DateInput, Field, NumberInput, SelectInput, TextInput } from "@/components/admin/fields";
import useCommand from "@/components/admin/useCommand";

/**
 * Tek komutluk form penceresi. Alanlar bildirimle tanımlanır; gönderimde command(değerler) çağrılır, başarıda sayfa yenilenir.
 * fields: [{ name, label, type: text|number|date|select|textarea, options?: [[value,label]], required, hint, span }]
 * Örnek: <ActionDialog title="Gider ekle" fields={[...]} initial={{...}} command={addExpense} success="Kaydedildi." onClose={...} />
 */
export default function ActionDialog({ title, description, fields, initial = {}, command, extra = {}, success, saveLabel = "Kaydet", danger = false, size = "md", onClose, onDone, note }) {
    const { exec, busy } = useCommand();
    const [v, setV] = useState(() => Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? (f.type === "select" ? f.options?.[0]?.[0] ?? "" : "")])));
    const set = (name) => (e) => setV((x) => ({ ...x, [name]: e?.target ? e.target.value : e }));

    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(command, { ...extra, ...v }, success);
        if (out.ok) {
            onDone?.(out.result);
            onClose();
        }
    };

    return (
        <FormDialog open title={title} description={description} onClose={onClose} onSubmit={submit} busy={busy} saveLabel={saveLabel} danger={danger} size={size}>
            {note && <div className="rounded-2xl bg-ad-warn-soft p-4 text-xs text-ad-warn sm:col-span-2">{note}</div>}
            {fields.map((f) => (
                <Field key={f.name} label={f.label} required={f.required} hint={f.hint} className={f.span === 1 ? "" : "sm:col-span-2"}>
                    {f.type === "select" ? (
                        <SelectInput value={v[f.name]} onChange={set(f.name)}>
                            {f.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                        </SelectInput>
                    ) : f.type === "date" ? (
                        <DateInput value={v[f.name]} onChange={set(f.name)} />
                    ) : f.type === "number" ? (
                        <NumberInput min="0" step="0.01" value={v[f.name]} onChange={set(f.name)} suffix="₺" />
                    ) : f.type === "textarea" ? (
                        <TextInput as="textarea" rows={3} value={v[f.name]} onChange={set(f.name)} />
                    ) : (
                        <TextInput value={v[f.name]} onChange={set(f.name)} />
                    )}
                </Field>
            ))}
        </FormDialog>
    );
}
