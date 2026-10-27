"use client";

import { useState } from "react";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import { Field, SelectInput, Switch, TextInput } from "@/components/admin/fields";
import { setBoiler, setReadiness } from "@/lib/admin/commands/departures";

/** Dairenin hazırlık durumu (temizlik / tadilat / hazır) ve kombi. Her değişiklik işlem geçmişine yazılır. */
export default function ApartmentSettingsDialog({ apartment, onClose }) {
    const { exec, busy } = useCommand();
    const p = apartment.presence;
    const [readiness, setReadinessValue] = useState(p.readiness ?? "");
    const [note, setNote] = useState(p.readinessNote ?? "");
    const [boilerOn, setBoilerOn] = useState(p.boilerOn);

    const submit = async (e) => {
        e.preventDefault();
        const calls = [];
        if (boilerOn !== p.boilerOn) calls.push([setBoiler, { apartmentId: apartment.id, boilerOn }]);
        if ((readiness || "") !== (p.readiness ?? "") || (note || "") !== (p.readinessNote ?? "")) calls.push([setReadiness, { apartmentId: apartment.id, readiness, note }]);
        if (calls.length === 0) return onClose();

        for (let i = 0; i < calls.length; i++) {
            const last = i === calls.length - 1;
            const out = await exec(calls[i][0], calls[i][1], last ? "Daire durumu kaydedildi." : null, { refresh: last });
            if (!out.ok) return;
        }
        onClose();
    };

    return (
        <FormDialog open title={`${apartment.name} · daire durumu`} description="Hazırlık işareti dairenin tamamen boşalmasının ardından kullanılır." onClose={onClose} onSubmit={submit} busy={busy} columns={1}>
            <Field label="Hazırlık durumu" hint="Daire tamamen boşalınca kırmızı görünür; “Hazır” seçilince yeşile döner.">
                <SelectInput value={readiness} onChange={(e) => setReadinessValue(e.target.value)}>
                    <option value="">İşaretlenmedi</option>
                    <option value="needs_cleaning">Temizlik bekliyor</option>
                    <option value="needs_repair">Tadilat bekliyor</option>
                    <option value="ready">Hazır</option>
                </SelectInput>
            </Field>
            {readiness && <Field label="Not"><TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn. boya yapılacak" /></Field>}
            <Switch checked={boilerOn} onChange={setBoilerOn} label="Kombi açık" hint="Kapatıldıysa kapalı olarak işaretlenir ve “Kombisi kapalı daireler” filtresinde görünür." />
        </FormDialog>
    );
}
