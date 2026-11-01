"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import FormDialog from "@/components/admin/FormDialog";
import useCommand, { errorText } from "@/components/admin/useCommand";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { DateInput, Field, TextInput } from "@/components/admin/fields";
import { Badge } from "@/components/admin/ui";
import { addLeave, confirmExit, deleteExit, deleteLeave, getDepartures, markReturned, reportExit, unconfirmExit, updateExit, updateLeave } from "@/lib/admin/commands/departures";
import { date } from "@/lib/admin/labels";
import { STAY, dateTime, leaveStatus, returnHint } from "@/lib/admin/presence";

/** Ayrılış ekleme / düzenleme formu (yerinde açılır) */
function LeaveForm({ initial, busy, submitLabel, onSubmit, onCancel }) {
    const [v, setV] = useState(initial);
    const set = (name) => (e) => setV((x) => ({ ...x, [name]: e?.target ? e.target.value : e }));
    const invalid = !v.leaveDate || !v.plannedReturnDate ? "Ayrılış ve planlanan dönüş tarihi gerekli." : v.plannedReturnDate <= v.leaveDate ? "Dönüş tarihi ayrılıştan sonra olmalı." : null;

    return (
        <div className="rounded-2xl border border-ad-line bg-ad-sunken p-4">
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ayrılış tarihi" required><DateInput value={v.leaveDate} onChange={set("leaveDate")} /></Field>
                <Field label="Planlanan dönüş" required><DateInput value={v.plannedReturnDate} min={v.leaveDate || undefined} onChange={set("plannedReturnDate")} /></Field>
                <Field label="Not" className="sm:col-span-2"><TextInput value={v.note} onChange={set("note")} placeholder="Örn. ara tatil, memleket" /></Field>
            </div>
            {v.leaveDate && v.plannedReturnDate && invalid && <p className="mt-2 text-xs text-ad-danger">{invalid}</p>}
            <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={onCancel} disabled={busy} className="ad-btn ad-btn-outline ad-btn-sm">Vazgeç</button>
                <button type="button" onClick={() => onSubmit(v)} disabled={busy || Boolean(invalid)} className="ad-btn ad-btn-primary ad-btn-sm">{submitLabel}</button>
            </div>
        </div>
    );
}

/**
 * Bir kaydın çıkış ve geçici ayrılış penceresi (Yerleşim & Doluluk ekranı ile öğrenci detay sayfasında aynı).
 * Kayıt, yerleşim, borç ve tahsilata dokunmaz; her değişiklik işlem geçmişine yazılır.
 * readOnly: dönem kapalı ya da kayıt bitmiş (yalnızca görüntüler)
 */
export default function DepartureDialog({ enrollmentId, studentName, readOnly = false, onClose }) {
    const { today } = useAdmin();
    const { exec, busy } = useCommand();
    const [data, setData] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [exitForm, setExitForm] = useState({ exitDate: today, note: "" });
    const [leaveMode, setLeaveMode] = useState(null); // "new" | leave.id

    const load = useCallback(async () => {
        try {
            const next = await getDepartures({ enrollmentId });
            setData(next);
            setLoadError(null);
            setExitForm({ exitDate: next.exit?.exitDate ?? today, note: next.exit?.note ?? "" });
        } catch (error) {
            setLoadError(errorText(error));
        }
    }, [enrollmentId, today]);

    useEffect(() => { load(); }, [load]);

    const run = async (command, input, success) => {
        const out = await exec(command, input, success);
        if (out.ok) {
            setLeaveMode(null);
            await load();
        }
        return out;
    };

    const exit = data?.exit;
    const confirmed = Boolean(exit?.confirmed);
    const stay = data ? STAY[data.state] : null;
    const exitDirty = exit && (exitForm.exitDate !== exit.exitDate || (exitForm.note || "") !== (exit.note || ""));

    return (
        <FormDialog open title="Çıkış & ayrılış" description={studentName} onClose={onClose} busy={busy} size="lg" columns={1} hideFooter>
            {loadError && <div className="rounded-2xl bg-ad-danger-soft p-4 text-sm text-ad-danger">{loadError}</div>}
            {!data && !loadError && <p className="py-6 text-center text-sm text-ad-muted">Yükleniyor…</p>}

            {data && (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-ad-muted">Bugünkü durum</span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${stay.chip}`}><span className={`h-2 w-2 rounded-full ${stay.dot}`} />{stay.label}</span>
                    </div>

                    {/* Kesin çıkış */}
                    <section className="rounded-2xl border border-ad-line p-4">
                        <h3 className="text-sm font-bold">Kesin çıkış</h3>
                        {!exit && <p className="mt-0.5 text-xs text-ad-muted">Henüz çıkış girilmedi. Çıkış tarihi gelene kadar öğrenci odasında sayılır. Yönetici olarak girdiğiniz (ya da onayladığınız) çıkış tarihinden itibaren oda sitede müsait görünür; yarım dönem açıksa 2. yarıyıl başvurularında da boş sayılır.</p>}
                        {exit && (
                            <p className="mt-0.5 text-xs text-ad-muted">
                                {dateTime(exit.reportedAt)} · {exit.reportedBy === "student" ? "öğrenci bildirdi" : "yönetici girdi"} ({exit.reportedByName})
                                {confirmed && <> · {dateTime(exit.confirmedAt)} tarihinde {exit.confirmedByName} onayladı</>}
                            </p>
                        )}

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <Field label="Çıkış tarihi"><DateInput value={exitForm.exitDate} onChange={(e) => setExitForm((x) => ({ ...x, exitDate: e.target.value }))} /></Field>
                            <Field label="Not"><TextInput value={exitForm.note} onChange={(e) => setExitForm((x) => ({ ...x, note: e.target.value }))} /></Field>
                        </div>
                        {confirmed && <p className="mt-2 text-xs text-ad-muted">Tarihi ya da notu düzeltmek için önce onayı geri alın.</p>}

                        {!readOnly && (
                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                                {!exit && (
                                    <>
                                        <button type="button" disabled={busy || !exitForm.exitDate} onClick={() => run(reportExit, { enrollmentId, ...exitForm, confirm: false }, "Çıkış girildi.")} className="ad-btn ad-btn-outline ad-btn-sm">Çıkış gir</button>
                                        <button type="button" disabled={busy || !exitForm.exitDate} onClick={() => run(reportExit, { enrollmentId, ...exitForm, confirm: true }, "Çıkış girildi ve onaylandı.")} className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="check_circle" className="text-[18px]" />Girip onayla</button>
                                    </>
                                )}
                                {exit && !confirmed && (
                                    <>
                                        <button type="button" disabled={busy} onClick={() => run(deleteExit, { enrollmentId }, "Çıkış kaydı silindi.")} className="ad-btn ad-btn-danger-soft ad-btn-sm"><Icon name="delete" className="text-[18px]" />Sil</button>
                                        {exitDirty && <button type="button" disabled={busy || !exitForm.exitDate} onClick={() => run(updateExit, { enrollmentId, ...exitForm }, "Çıkış düzeltildi.")} className="ad-btn ad-btn-outline ad-btn-sm">Düzeltmeyi kaydet</button>}
                                        <button type="button" disabled={busy || exitDirty} onClick={() => run(confirmExit, { enrollmentId }, "Çıkış onaylandı.")} className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="check_circle" className="text-[18px]" />Onayla</button>
                                    </>
                                )}
                                {confirmed && (
                                    <>
                                        <button type="button" disabled={busy} onClick={() => run(deleteExit, { enrollmentId }, "Çıkış kaydı silindi.")} className="ad-btn ad-btn-danger-soft ad-btn-sm"><Icon name="delete" className="text-[18px]" />Sil</button>
                                        <button type="button" disabled={busy} onClick={() => run(unconfirmExit, { enrollmentId }, "Onay geri alındı.")} className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="undo" className="text-[18px]" />Onayı geri al</button>
                                    </>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Geçici ayrılışlar */}
                    <section className="rounded-2xl border border-ad-line p-4">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold">Geçici ayrılışlar</h3>
                                <p className="mt-0.5 text-xs text-ad-muted">Kayıt ve oda hakkı korunur; yalnızca doluluk ekranında ayrılışta görünür.</p>
                            </div>
                            {!readOnly && !exit && leaveMode !== "new" && (
                                <button type="button" onClick={() => setLeaveMode("new")} className="ad-btn ad-btn-soft ad-btn-sm shrink-0"><Icon name="add" className="text-[18px]" />Ayrılış ekle</button>
                            )}
                        </div>
                        {exit && !readOnly && <p className="mt-2 text-xs text-ad-warn">Çıkış girilmiş kayda yeni geçici ayrılış eklenemez.</p>}

                        {leaveMode === "new" && (
                            <div className="mt-3">
                                <LeaveForm initial={{ leaveDate: today, plannedReturnDate: "", note: "" }} busy={busy} submitLabel="Ekle" onCancel={() => setLeaveMode(null)}
                                    onSubmit={(v) => run(addLeave, { enrollmentId, ...v }, "Geçici ayrılış eklendi.")} />
                            </div>
                        )}

                        {data.leaves.length === 0 && leaveMode !== "new" && <p className="mt-3 text-xs text-ad-faint">Geçici ayrılış yok.</p>}

                        <ul className="mt-3 space-y-2.5">
                            {data.leaves.map((l) => {
                                const st = leaveStatus(l);
                                const hint = returnHint(l);
                                if (leaveMode === l.id) {
                                    return (
                                        <li key={l.id}>
                                            <LeaveForm initial={{ leaveDate: l.leaveDate, plannedReturnDate: l.plannedReturnDate, note: l.note ?? "" }} busy={busy} submitLabel="Kaydet" onCancel={() => setLeaveMode(null)}
                                                onSubmit={(v) => run(updateLeave, { id: l.id, ...v }, "Geçici ayrılış güncellendi.")} />
                                        </li>
                                    );
                                }
                                return (
                                    <li key={l.id} className="rounded-2xl border border-ad-line p-3.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-bold">{date(l.leaveDate)} → {date(l.plannedReturnDate)}</p>
                                            <Badge tone={st.tone}>{st.label}</Badge>
                                            {hint && <span className={`text-xs font-semibold ${l.overdue ? "text-ad-danger" : "text-ad-muted"}`}>{hint}</span>}
                                        </div>
                                        <p className="mt-1 text-xs text-ad-muted">
                                            {l.returnedOn && <>Dönüş günü: {date(l.returnedOn)} · </>}
                                            {l.reportedBy === "student" ? "Öğrenci bildirdi" : "Yönetici girdi"} ({l.reportedByName}) · {dateTime(l.reportedAt)}
                                            {l.note && <> · “{l.note}”</>}
                                        </p>
                                        {!readOnly && (
                                            <div className="mt-2.5 flex flex-wrap justify-end gap-2">
                                                {!l.returnedOn && l.started && (
                                                    <button type="button" disabled={busy} onClick={() => run(markReturned, { id: l.id }, "Dönüş işaretlendi.")} className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="login" className="text-[18px]" />Döndü</button>
                                                )}
                                                {l.returnedOn && (
                                                    <button type="button" disabled={busy} onClick={() => run(updateLeave, { id: l.id, leaveDate: l.leaveDate, plannedReturnDate: l.plannedReturnDate, note: l.note, clearReturn: true }, "Dönüş işareti geri alındı.")} className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="undo" className="text-[18px]" />Dönüşü geri al</button>
                                                )}
                                                <button type="button" disabled={busy} onClick={() => setLeaveMode(l.id)} className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="edit" className="text-[18px]" />Düzenle</button>
                                                <button type="button" disabled={busy} onClick={() => run(deleteLeave, { id: l.id }, "Geçici ayrılış silindi.")} className="ad-btn ad-btn-danger-soft ad-btn-sm"><Icon name="delete" className="text-[18px]" />Sil</button>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    <div className="flex justify-end"><button type="button" onClick={onClose} disabled={busy} className="ad-btn ad-btn-outline">Kapat</button></div>
                </>
            )}
        </FormDialog>
    );
}
