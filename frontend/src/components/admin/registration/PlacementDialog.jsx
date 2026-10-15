"use client";

import { useMemo, useState } from "react";
import FormDialog from "@/components/admin/FormDialog";
import { DateInput, Field, SelectInput } from "@/components/admin/fields";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import useCommand from "@/components/admin/useCommand";
import { movePlacement, peakOccupancy, placeStudent } from "@/lib/admin/domain/registration";
import { date } from "@/lib/admin/labels";

/**
 * Yerleştirme / oda değiştirme (ortak).
 * mode="place": ilk yerleşim, giriş tarihinden dönem sonuna.  mode="move": değişiklik gününden itibaren yeni oda.
 * Yalnızca öğrencinin oda tipine uyan, kullanıma açık ve o tarihlerde boş yeri olan odalar seçilebilir.
 */
export default function PlacementDialog({ enrollment, mode = "place", currentRoomId = null, onClose, onDone }) {
    const { state, today } = useAdmin();
    const { exec, busy } = useCommand();
    const period = state.periods.find((p) => p.id === enrollment.periodId);
    const student = state.students.find((s) => s.id === enrollment.studentId);

    const clamp = (d) => (d < period.start ? period.start : d > period.end ? period.end : d);
    const [day, setDay] = useState(mode === "place" ? enrollment.entryDate : clamp(today));
    const [roomId, setRoomId] = useState("");

    const from = day || enrollment.entryDate;
    const to = period.end;

    const options = useMemo(
        () =>
            state.rooms
                .filter((r) => r.roomTypeId === enrollment.roomTypeId && r.id !== currentRoomId)
                .map((r) => {
                    const apt = state.apartments.find((a) => a.id === r.apartmentId);
                    const taken = r.status === "active" ? peakOccupancy(state.placements, r.id, from, to) : 0;
                    const free = r.status === "active" ? Math.max(0, r.beds - taken) : 0;
                    return { room: r, apt, free, taken, disabled: r.status !== "active" || free === 0 };
                })
                .sort((a, b) => Number(a.disabled) - Number(b.disabled) || a.apt.name.localeCompare(b.apt.name, "tr") || a.room.name.localeCompare(b.room.name, "tr", { numeric: true })),
        [state.rooms, state.apartments, state.placements, enrollment.roomTypeId, currentRoomId, from, to]
    );

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

    const availableCount = options.filter((o) => !o.disabled).length;

    return (
        <FormDialog
            open
            title={mode === "place" ? "Odaya yerleştir" : "Odayı değiştir"}
            description={`${student.firstName} ${student.lastName} · ${period.name}`}
            onClose={onClose}
            onSubmit={submit}
            busy={busy}
            saveLabel={mode === "place" ? "Yerleştir" : "Odayı değiştir"}
            columns={1}
        >
            <Field label={mode === "place" ? "Yerleşim başlangıcı" : "Değişiklik tarihi"} required hint={mode === "place" ? "Varsayılan giriş tarihidir; dönem sonuna kadar geçerli olur." : "Eski oda bir gün öncesine kadar, yeni oda bu günden itibaren geçerli olur."}>
                <DateInput value={day} min={period.start} max={period.end} onChange={(e) => { setDay(e.target.value); setRoomId(""); }} />
            </Field>

            <Field label="Oda" required hint={availableCount ? `${date(from)} – ${date(to)} aralığında boş yeri olan odalar seçilebilir.` : "Bu tarihlerde uygun boş oda yok."}>
                <SelectInput value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                    <option value="">Oda seçin</option>
                    {options.map((o) => (
                        <option key={o.room.id} value={o.room.id} disabled={o.disabled}>
                            {o.apt.name} · {o.room.name} — {o.room.status !== "active" ? (o.room.status === "maintenance" ? "bakımda" : "kapalı") : o.free ? `${o.free}/${o.room.beds} yer boş` : "dolu"}
                        </option>
                    ))}
                </SelectInput>
            </Field>
        </FormDialog>
    );
}
