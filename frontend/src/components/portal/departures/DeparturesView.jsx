"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/portal/PageHeader";
import DepartureSheet, { SheetField, sheetInput } from "./DepartureSheet";
import { cancelLeave, getDepartures, markReturned, reportExit, reportLeave, retractExit, updateExit, updateLeave } from "@/services/departures";
import { formatDate } from "@/lib/format";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatDateTime } from "@/lib/student/labels";

const STATE_STYLE = {
    active: "bg-emerald-50 text-emerald-800",
    temporary_away: "bg-yellow-50 text-yellow-900",
    exit_reported: "bg-orange-50 text-orange-900",
    exit_confirmed: "bg-slate-100 text-slate-700",
};
const STATE_ICON = { active: "home", temporary_away: "luggage", exit_reported: "hourglass_top", exit_confirmed: "logout" };

const addDays = (iso, n) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};
/** Sunucu UTC saati "Z"siz de gelebilir */
const utc = (iso) => (iso && !/[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? `${iso}Z` : iso);

/** Sunucunun doğrulama / çakışma mesajı varsa o, yoksa genel hata */
function messageOf(error, fallback) {
    const server = error?.status >= 400 && error?.status < 500 && error?.status !== 429 ? error.getAllMessages?.()[0] : null;
    return server || fallback;
}

export default function DeparturesView({ initial }) {
    const { t } = useLanguage();
    const copy = t.studentPortal.departures;
    const [view, setView] = useState(initial);
    const [sheet, setSheet] = useState(null); // { kind: "exit" | "exit-edit" | "leave" | "leave-edit", leave? }
    const [form, setForm] = useState({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [toast, setToast] = useState("");

    const { exit, leaves, canReport, today } = view;
    const confirmed = Boolean(exit?.confirmed);
    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

    const flash = (text) => {
        setToast(text);
        setTimeout(() => setToast(""), 5000);
    };

    /** İşlemi çalıştırır, güncel durumu yeniden okur */
    async function run(action, success, { closeSheet = true } = {}) {
        setBusy(true);
        setError("");
        try {
            await action();
            setView(await getDepartures());
            if (closeSheet) setSheet(null);
            flash(success);
        } catch (e) {
            const message = messageOf(e, copy.errors.generic);
            if (closeSheet && sheet) setError(message);
            else flash(message);
        } finally {
            setBusy(false);
        }
    }

    function open(next) {
        setError("");
        setSheet(next);
        if (next.kind === "exit") setForm({ exitDate: today, note: "" });
        if (next.kind === "exit-edit") setForm({ exitDate: exit.exitDate, note: exit.note ?? "" });
        if (next.kind === "leave") setForm({ leaveDate: today, plannedReturnDate: "", note: "" });
        if (next.kind === "leave-edit") setForm({ leaveDate: next.leave.leaveDate, plannedReturnDate: next.leave.plannedReturnDate, note: next.leave.note ?? "" });
    }

    function submit() {
        if (sheet.kind === "exit") return run(() => reportExit(form), copy.exit.reported);
        if (sheet.kind === "exit-edit") return run(() => updateExit(form), copy.exit.updated);
        if (sheet.kind === "leave") {
            if (!form.leaveDate || !form.plannedReturnDate || form.plannedReturnDate <= form.leaveDate) return setError(copy.errors.dates);
            return run(() => reportLeave(form), copy.leaves.created);
        }
        if (!form.plannedReturnDate || form.plannedReturnDate <= form.leaveDate) return setError(copy.errors.dates);
        return run(() => updateLeave({ id: sheet.leave.id, ...form }), copy.leaves.updated);
    }

    const leaveStatus = (l) => (l.returnedOn ? "returned" : l.overdue ? "overdue" : l.away ? "away" : !l.started ? "planned" : "away");
    const STATUS_STYLE = { planned: "bg-orchid-powder/80 text-orchid-muted", away: "bg-yellow-50 text-yellow-900", overdue: "bg-orchid-pink text-white", returned: "bg-emerald-50 text-emerald-700" };
    const returnHint = (l) => {
        if (l.returnedOn || l.returnInDays == null) return null;
        if (l.returnInDays > 0) return interpolate(copy.leaves.returnIn, { n: l.returnInDays });
        if (l.returnInDays === 0) return copy.leaves.returnToday;
        return interpolate(copy.leaves.lateBy, { n: -l.returnInDays });
    };

    const title = { exit: copy.exit.dialogTitle, "exit-edit": copy.exit.editTitle, leave: copy.leaves.form.title, "leave-edit": copy.leaves.form.editTitle }[sheet?.kind];
    const isExit = sheet?.kind?.startsWith("exit");

    return (
        <>
            <PageHeader title={t.studentPortal.nav.departures} text={copy.text} />

            <AnimatePresence>
                {toast && (
                    <motion.div role="status" initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
                        <p className="flex items-center gap-2.5 rounded-3xl bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
                            <Icon name="check_circle" filled className="text-[20px]" />
                            {toast}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            <p className={`mb-5 flex items-center gap-2.5 rounded-3xl px-5 py-4 text-sm font-bold ${STATE_STYLE[view.state]}`}>
                <Icon name={STATE_ICON[view.state]} filled className="text-[22px]" />
                {copy.state[view.state]}
            </p>

            {!canReport && <p className="mb-5 rounded-3xl bg-orchid-powder/60 px-5 py-4 text-sm text-orchid-muted">{copy.closed}</p>}

            {/* Kesin çıkış */}
            <section className="glass-card mb-5 rounded-[32px] p-6">
                <h2 className="font-display text-2xl font-semibold text-orchid-dark">{copy.exit.title}</h2>
                {!exit && <p className="mt-2 text-sm text-orchid-muted">{copy.exit.empty}</p>}
                {exit && (
                    <div className="mt-3 text-sm text-orchid-dark">
                        <p className="font-bold">{interpolate(copy.exit.onDate, { date: formatDate(exit.exitDate) })}</p>
                        <p className="mt-1 text-orchid-muted">{interpolate(copy.exit.reportedAt, { date: formatDateTime(utc(exit.reportedAt)) })}{exit.note && <> · “{exit.note}”</>}</p>
                        <p className="mt-2 text-orchid-muted">{confirmed ? interpolate(copy.exit.confirmed, { date: formatDateTime(utc(exit.confirmedAt)) }) : copy.exit.pending}</p>
                    </div>
                )}
                {canReport && (
                    <div className="mt-4 flex flex-wrap gap-3">
                        {!exit && (
                            <button type="button" onClick={() => open({ kind: "exit" })} className="aurora-btn flex h-12 items-center gap-2 rounded-full px-6 text-sm font-bold text-white">
                                <Icon name="logout" className="text-[20px]" />
                                {copy.exit.button}
                            </button>
                        )}
                        {exit && !confirmed && (
                            <>
                                <button type="button" onClick={() => open({ kind: "exit-edit" })} className="flex h-11 items-center gap-2 rounded-full bg-orchid-powder px-5 text-sm font-bold text-orchid-pink">
                                    <Icon name="edit_calendar" className="text-[20px]" />
                                    {copy.exit.editDate}
                                </button>
                                <button type="button" disabled={busy} onClick={() => window.confirm(copy.exit.retractConfirm) && run(retractExit, copy.exit.retracted, { closeSheet: false })} className="flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-orchid-muted hover:text-orchid-dark">
                                    <Icon name="undo" className="text-[20px]" />
                                    {copy.exit.retract}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </section>

            {/* Geçici ayrılış */}
            <section className="glass-card rounded-[32px] p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="font-display text-2xl font-semibold text-orchid-dark">{copy.leaves.title}</h2>
                        <p className="mt-2 max-w-md text-sm text-orchid-muted">{copy.leaves.text}</p>
                    </div>
                    {canReport && !exit && (
                        <button type="button" onClick={() => open({ kind: "leave" })} className="aurora-btn flex h-12 shrink-0 items-center gap-2 rounded-full px-6 text-sm font-bold text-white">
                            <Icon name="luggage" className="text-[20px]" />
                            {copy.leaves.button}
                        </button>
                    )}
                </div>
                {canReport && exit && <p className="mt-3 rounded-2xl bg-orchid-powder/60 px-4 py-3 text-sm text-orchid-muted">{copy.leaves.exitBlocked}</p>}

                {leaves.length === 0 ? (
                    <p className="mt-5 text-sm text-orchid-muted">{copy.leaves.empty}</p>
                ) : (
                    <ul className="mt-5 flex flex-col gap-3">
                        {leaves.map((l) => {
                            const status = leaveStatus(l);
                            const hint = returnHint(l);
                            return (
                                <li key={l.id} className="rounded-3xl bg-orchid-white p-4 ring-1 ring-orchid-petal/30">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-bold text-orchid-dark">{formatDate(l.leaveDate)} → {formatDate(l.plannedReturnDate)}</p>
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[status]}`}>{copy.leaves.status[status]}</span>
                                        {hint && <span className={`text-xs font-semibold ${l.overdue ? "text-orchid-pink" : "text-orchid-muted"}`}>{hint}</span>}
                                    </div>
                                    {(l.returnedOn || l.note) && (
                                        <p className="mt-1 text-xs text-orchid-muted">
                                            {l.returnedOn && interpolate(copy.leaves.returnedOn, { date: formatDate(l.returnedOn) })}
                                            {l.returnedOn && l.note && " · "}
                                            {l.note && `“${l.note}”`}
                                        </p>
                                    )}
                                    {canReport && !l.returnedOn && (
                                        <div className="mt-3 flex flex-wrap gap-2.5">
                                            {l.started && (
                                                <button type="button" disabled={busy} onClick={() => run(() => markReturned({ id: l.id }), copy.leaves.returnedDone, { closeSheet: false })} className="aurora-btn flex h-10 items-center gap-2 rounded-full px-5 text-sm font-bold text-white">
                                                    <Icon name="login" className="text-[18px]" />
                                                    {copy.leaves.returned}
                                                </button>
                                            )}
                                            <button type="button" onClick={() => open({ kind: "leave-edit", leave: l })} className="flex h-10 items-center gap-2 rounded-full bg-orchid-powder px-4 text-sm font-bold text-orchid-pink">
                                                <Icon name="edit_calendar" className="text-[18px]" />
                                                {copy.leaves.updateReturn}
                                            </button>
                                            {!l.started && (
                                                <button type="button" disabled={busy} onClick={() => window.confirm(copy.leaves.cancelConfirm) && run(() => cancelLeave({ id: l.id }), copy.leaves.cancelled, { closeSheet: false })} className="flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-orchid-muted hover:text-orchid-dark">
                                                    <Icon name="close" className="text-[18px]" />
                                                    {copy.leaves.cancel}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <DepartureSheet open={Boolean(sheet)} title={title} closeLabel={copy.close} busy={busy} error={error} submitLabel={sheet?.kind?.endsWith("edit") ? copy.save : copy.send} cancelLabel={copy.cancel} onClose={() => setSheet(null)} onSubmit={submit}>
                {isExit ? (
                    <>
                        <SheetField id="dp-exit-date" label={copy.exit.exitDate} hint={copy.exit.dateHint}>
                            <input id="dp-exit-date" type="date" required value={form.exitDate ?? ""} min={view.entryDate} max={view.lastDay} onChange={set("exitDate")} className={sheetInput} />
                        </SheetField>
                        <SheetField id="dp-exit-note" label={copy.note}>
                            <input id="dp-exit-note" type="text" maxLength={500} value={form.note ?? ""} onChange={set("note")} className={sheetInput} />
                        </SheetField>
                    </>
                ) : (
                    <>
                        <SheetField id="dp-leave-date" label={copy.leaves.form.leaveDate}>
                            <input id="dp-leave-date" type="date" required disabled={sheet?.kind === "leave-edit"} value={form.leaveDate ?? ""} min={addDays(today, -7)} max={addDays(view.lastDay, -1)} onChange={set("leaveDate")} className={`${sheetInput} disabled:opacity-60`} />
                        </SheetField>
                        <SheetField id="dp-leave-return" label={copy.leaves.form.returnDate}>
                            <input id="dp-leave-return" type="date" required value={form.plannedReturnDate ?? ""} min={form.leaveDate ? addDays(form.leaveDate, 1) : undefined} max={view.lastDay} onChange={set("plannedReturnDate")} className={sheetInput} />
                        </SheetField>
                        <SheetField id="dp-leave-note" label={copy.note}>
                            <input id="dp-leave-note" type="text" maxLength={500} value={form.note ?? ""} onChange={set("note")} className={sheetInput} />
                        </SheetField>
                    </>
                )}
            </DepartureSheet>
        </>
    );
}
