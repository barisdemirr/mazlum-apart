"use client";

import { useEffect, useState } from "react";
import FormDialog from "@/components/admin/FormDialog";
import { DateInput, Field, SelectInput } from "@/components/admin/fields";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import useCommand, { errorText } from "@/components/admin/useCommand";
import { getRoomOptions, movePlacement, placeStudent } from "@/lib/admin/commands/registration";
import { date } from "@/lib/admin/labels";

const clamp = (d, period) => (d < period.start ? period.start : d > period.end ? period.end : d);

/**
 * Yerleştirme / oda değiştirme (ortak).
 * mode="place": ilk yerleşim, giriş tarihinden dönem sonuna.  mode="move": değişiklik gününden itibaren yeni oda.
 * Uygun odaları (oda tipi, kullanım durumu ve tarih aralığındaki en yoğun doluluk) backend hesaplar; burada yalnızca listelenir.
 *
 * enrollment: { id, periodId, entryDate, studentName } · period: kaydın dönemi (verilmezse seçili dönem)
 */
export default function PlacementDialog({ enrollment, period: periodProp, mode = "place", currentRoomId = null, onClose, onDone }) {
    const admin = useAdmin();
    const period = periodProp ?? admin.period;
    const { exec, busy } = useCommand();

    const [day, setDay] = useState(mode === "place" ? enrollment.entryDate : clamp(admin.today, period));
    const [roomId, setRoomId] = useState("");
    const [options, setOptions] = useState(null);
    const [error, setError] = useState("");

    const from = day || enrollment.entryDate;
    const to = period.end;

    useEffect(() => {
        let alive = true;
        setOptions(null);
        setError("");
        getRoomOptions({ enrollmentId: enrollment.id, from, to, excludeRoomId: currentRoomId })
            .then((list) => alive && setOptions(list))
            .catch((e) => alive && setError(errorText(e)));
        return () => { alive = false; };
    }, [enrollment.id, from, to, currentRoomId]);

    const submit = async (e) => {
        e.preventDefault();
        const out = mode === "place"
            ? await exec(placeStudent, { enrollmentId: enrollment.id, roomId, start: day }, "Öğrenci odaya yerleştirildi.")
            : await exec(movePlacement, { enrollmentId: enrollment.id, roomId, date: day }, "Oda değişikliği kaydedildi.");
        if (out.ok) {
            onDone?.();
            onClose();
        }
    };

    const sorted = (options ?? []).slice().sort((a, b) => Number(!a.available) - Number(!b.available));
    const availableCount = sorted.filter((o) => o.available).length;
    const statusText = (o) => (o.status !== "active" ? (o.status === "maintenance" ? "bakımda" : "kapalı") : o.free ? `${o.free}/${o.beds} yer boş` : "dolu");

    return (
        <FormDialog
            open
            title={mode === "place" ? "Odaya yerleştir" : "Odayı değiştir"}
            description={`${enrollment.studentName} · ${period.name}`}
            onClose={onClose}
            onSubmit={submit}
            busy={busy}
            saveLabel={mode === "place" ? "Yerleştir" : "Odayı değiştir"}
            columns={1}
        >
            <Field label={mode === "place" ? "Yerleşim başlangıcı" : "Değişiklik tarihi"} required hint={mode === "place" ? "Varsayılan giriş tarihidir; dönem sonuna kadar geçerli olur." : "Eski oda bir gün öncesine kadar, yeni oda bu günden itibaren geçerli olur."}>
                <DateInput value={day} min={period.start} max={period.end} onChange={(e) => { setDay(e.target.value); setRoomId(""); }} />
            </Field>

            <Field
                label="Oda"
                required
                error={error}
                hint={options === null && !error ? "Odalar yükleniyor…" : availableCount ? `${date(from)} – ${date(to)} aralığında boş yeri olan odalar seçilebilir.` : "Bu tarihlerde uygun boş oda yok."}
            >
                <SelectInput value={roomId} onChange={(e) => setRoomId(e.target.value)} disabled={options === null}>
                    <option value="">Oda seçin</option>
                    {sorted.map((o) => (
                        <option key={o.roomId} value={o.roomId} disabled={!o.available}>
                            {o.apartmentName} · {o.name} — {statusText(o)}
                        </option>
                    ))}
                </SelectInput>
            </Field>
        </FormDialog>
    );
}
