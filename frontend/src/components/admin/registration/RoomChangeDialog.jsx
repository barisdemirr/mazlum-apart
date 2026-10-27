"use client";

import { useEffect, useMemo, useState } from "react";
import FormDialog from "@/components/admin/FormDialog";
import { DateInput, Field, SelectInput, Switch } from "@/components/admin/fields";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import useCommand, { errorText } from "@/components/admin/useCommand";
import { changeEnrollmentRoom, getRoomChangeOptions, getRoomOptions } from "@/lib/admin/commands/registration";
import { date, money } from "@/lib/admin/labels";

const clamp = (d, period) => (d < period.start ? period.start : d > period.end ? period.end : d);

/**
 * Mevcut kayıtta daire türü / oda tipi / oda değişikliği (kayıt iptal edilmez; tahsilatlar ve geçmiş korunur).
 * Fiyat farkı varsa ödeme planı yalnızca yönetici onaylarsa (anahtar açıksa) yeni fiyata göre güncellenir.
 *
 * enrollment: { id, periodId, entryDate, studentName } · period: kaydın dönemi · currentRoomId: şu anki oda
 */
export default function RoomChangeDialog({ enrollment, period: periodProp, currentRoomId = null, onClose }) {
    const admin = useAdmin();
    const period = periodProp ?? admin.period;
    const { exec, busy } = useCommand();

    const [info, setInfo] = useState(null);
    const [error, setError] = useState("");
    const [aptTypeId, setAptTypeId] = useState("");
    const [roomTypeId, setRoomTypeId] = useState("");
    const [roomId, setRoomId] = useState("");
    const [day, setDay] = useState(clamp(admin.today, period));
    const [updatePlan, setUpdatePlan] = useState(false);
    const [reason, setReason] = useState("");
    const [rooms, setRooms] = useState(null);

    useEffect(() => {
        let alive = true;
        getRoomChangeOptions({ enrollmentId: enrollment.id })
            .then((r) => {
                if (!alive) return;
                setInfo(r);
                const cur = r.options.find((o) => o.current);
                setRoomTypeId(r.currentRoomTypeId);
                setAptTypeId(cur?.apartmentTypeId ?? "");
            })
            .catch((e) => alive && setError(errorText(e)));
        return () => { alive = false; };
    }, [enrollment.id]);

    const typeChanged = info && roomTypeId && roomTypeId !== info.currentRoomTypeId;
    const aptTypes = useMemo(() => {
        const seen = new Map();
        (info?.options ?? []).forEach((o) => { if (!seen.has(o.apartmentTypeId ?? "")) seen.set(o.apartmentTypeId ?? "", o.apartmentTypeName || "Daire türü belirtilmemiş"); });
        return [...seen.entries()];
    }, [info]);
    const typeOptions = (info?.options ?? []).filter((o) => (o.apartmentTypeId ?? "") === aptTypeId);
    const chosen = info?.options.find((o) => o.roomTypeId === roomTypeId);

    // Seçilen oda tipindeki uygun odalar (değişiklik gününden itibaren)
    useEffect(() => {
        if (!info || !roomTypeId) return;
        let alive = true;
        setRooms(null);
        setRoomId("");
        getRoomOptions({ enrollmentId: enrollment.id, from: day, to: period.end, excludeRoomId: roomTypeId === info.currentRoomTypeId ? currentRoomId : undefined, roomTypeId })
            .then((list) => alive && setRooms(list))
            .catch((e) => alive && setError(errorText(e)));
        return () => { alive = false; };
    }, [info, roomTypeId, day, enrollment.id, period.end, currentRoomId]);

    const diff = chosen && typeChanged && chosen.monthly != null ? chosen.monthly - info.monthlyPrice : 0;
    const depositDiff = chosen && typeChanged && chosen.deposit != null ? chosen.deposit - info.depositPrice : 0;

    const submit = async (ev) => {
        ev.preventDefault();
        const out = await exec(changeEnrollmentRoom, { enrollmentId: enrollment.id, roomTypeId, roomId, date: day, updatePaymentPlan: updatePlan, reason }, "Daire / oda değişikliği kaydedildi.");
        if (out.ok) onClose();
    };

    const sorted = (rooms ?? []).slice().sort((a, b) => Number(!a.available) - Number(!b.available));
    const statusText = (o) => (o.status !== "active" ? (o.status === "maintenance" ? "bakımda" : "kapalı") : o.free ? `${o.free}/${o.beds} yer boş` : "dolu");

    return (
        <FormDialog open title="Daire / oda tipini değiştir" description={`${enrollment.studentName} · ${period.name}`} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Değişikliği kaydet" columns={1}>
            <div className="rounded-2xl bg-ad-warn-soft p-4 text-xs text-ad-warn">
                Kayıt iptal edilmez; tahsilatlar ve geçmiş korunur. Eski ve yeni odanın doluluğu birlikte güncellenir.
            </div>
            {error && <p className="text-sm font-semibold text-ad-danger">{error}</p>}

            <Field label="Daire türü" required>
                <SelectInput value={aptTypeId} disabled={!info} onChange={(e) => { setAptTypeId(e.target.value); setRoomTypeId(""); }}>
                    {aptTypes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </SelectInput>
            </Field>
            <Field label="Oda tipi" required>
                <SelectInput value={roomTypeId} disabled={!info} onChange={(e) => setRoomTypeId(e.target.value)}>
                    <option value="">Seçin</option>
                    {typeOptions.map((o) => (
                        <option key={o.roomTypeId} value={o.roomTypeId} disabled={!o.selectable}>
                            {o.name}{o.monthly != null ? ` · ${money(o.monthly)}/ay` : ""}{o.current ? " (mevcut)" : ""}{o.hint ? ` · ${o.hint}` : ""}
                        </option>
                    ))}
                </SelectInput>
            </Field>
            <Field label="Değişiklik tarihi" required hint="Yeni oda bu günden itibaren geçerli olur. Yanlış atamayı düzeltiyorsanız yerleşim başlangıç tarihini girin; oda yerinde düzeltilir.">
                <DateInput value={day} min={period.start} max={period.end} onChange={(e) => setDay(e.target.value)} />
            </Field>
            <Field label="Oda" hint={rooms === null && roomTypeId ? "Odalar yükleniyor…" : typeChanged ? "Oda tipi değiştiği için yeni odayı seçin." : "Oda değiştirmeyecekseniz boş bırakın."}>
                <SelectInput value={roomId} disabled={rooms === null} onChange={(e) => setRoomId(e.target.value)}>
                    <option value="">{typeChanged ? "Oda seçin" : "Oda değişmesin"}</option>
                    {sorted.map((o) => (
                        <option key={o.roomId} value={o.roomId} disabled={!o.available}>{o.apartmentName} · {o.name} — {statusText(o)}</option>
                    ))}
                </SelectInput>
            </Field>

            {typeChanged && chosen && (
                <div className="space-y-3 rounded-2xl border border-ad-line p-4 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Fiyat farkı</p>
                    <div className="flex justify-between"><span className="text-ad-muted">Aylık kira</span><span className="ad-num font-bold">{money(info.monthlyPrice)} → {money(chosen.monthly ?? 0)}</span></div>
                    <div className="flex justify-between"><span className="text-ad-muted">Depozito</span><span className="ad-num font-bold">{money(info.depositPrice)} → {money(chosen.deposit ?? 0)}</span></div>
                    {(diff !== 0 || depositDiff !== 0) ? (
                        <Switch
                            checked={updatePlan}
                            onChange={setUpdatePlan}
                            label="Ödeme planını yeni fiyata göre güncelle (onaylıyorum)"
                            hint={`${date(day)} ve sonrası taksitler${depositDiff !== 0 ? " ile depozito" : ""} yeni tutara çevrilir; ödenmiş kısımlar kaybolmaz, avansa dönüp otomatik mahsup edilir. Kapalıysa plan olduğu gibi kalır.`}
                        />
                    ) : <p className="text-xs text-ad-muted">Fiyat farkı yok; ödeme planı değişmez.</p>}
                </div>
            )}

            <Field label="Neden" required>
                <textarea rows={3} value={reason} onChange={(ev) => setReason(ev.target.value)} className="ad-field resize-y" />
            </Field>
        </FormDialog>
    );
}
