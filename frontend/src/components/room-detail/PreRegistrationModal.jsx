"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import FloatingField from "@/components/apply/fields/FloatingField";
import { Checkbox, DrawnCheck, FieldError } from "@/components/apply/fields/Choice";
import KvkkModal from "@/components/apply/KvkkModal";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { formatPhone, isValidPhone, onlyDigits } from "@/lib/application";
import { submitPreRegistration } from "@/services/preRegistrations";

const EMPTY = { fullName: "", phone: "", note: "", kvkk: false };

/**
 * Ön başvuru penceresi (dolu oda tipinde): ad, telefon, isteğe bağlı not, KVKK onayı.
 * Mobilde alttan açılır, masaüstünde ortada. Gönderilince aynı pencerede teşekkür ekranı görünür.
 */
export default function PreRegistrationModal({ open, onClose, room, title }) {
    const { t, tpl, locale } = useLanguage();
    const p = t.roomDetail.preRegistration;
    const e = t.apply.errors;
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [tick, setTick] = useState(0);
    const [status, setStatus] = useState("idle"); // idle | sending | done
    const [already, setAlready] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [kvkkOpen, setKvkkOpen] = useState(false);

    // Kapatınca bir sonraki açılış temiz başlasın (gönderildiyse form sıfırlanır)
    useEffect(() => {
        if (open) return;
        const timer = setTimeout(() => {
            if (status === "done") setForm(EMPTY);
            setStatus("idle");
            setErrors({});
            setSubmitError("");
        }, 300);
        return () => clearTimeout(timer);
    }, [open, status]);

    useEffect(() => {
        if (!open) return;
        const onKey = (event) => event.key === "Escape" && !kvkkOpen && status !== "sending" && onClose();
        document.addEventListener("keydown", onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previous;
        };
    }, [open, onClose, kvkkOpen, status]);

    const set = (key, value) => {
        setForm((f) => ({ ...f, [key]: value }));
        if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
    };

    const validate = () => {
        const next = {};
        if (form.fullName.trim().length < 3) next.fullName = form.fullName.trim() ? p.errors.name : e.required;
        if (!form.phone) next.phone = e.required;
        else if (!isValidPhone(form.phone)) next.phone = e.phone;
        if (!form.kvkk) next.kvkk = e.kvkk;
        return next;
    };

    const submit = async (event) => {
        event.preventDefault();
        setSubmitError("");
        const found = validate();
        if (Object.keys(found).length) {
            setErrors(found);
            setTick((n) => n + 1);
            return;
        }

        setStatus("sending");
        try {
            const result = await submitPreRegistration({
                fullName: form.fullName.trim(),
                phone: form.phone,
                roomSlug: room?.slug ?? null,
                note: form.note.trim() || null,
                lang: locale,
                kvkk: form.kvkk,
            });
            setAlready(Boolean(result?.already));
            setStatus("done");
        } catch (error) {
            setStatus("idle");
            const server = error?.status === 400 ? error.errors ?? {} : {};
            const mapped = {};
            if (server.fullName) mapped.fullName = p.errors.name;
            if (server.phone) mapped.phone = e.phone;
            if (server.kvkk) mapped.kvkk = e.kvkk;
            if (Object.keys(mapped).length) {
                setErrors(mapped);
                setTick((n) => n + 1);
            } else if (error?.status === 429) setSubmitError(e.rate);
            else if (error?.status === 409) setSubmitError(p.errors.closed);
            else setSubmitError(p.errors.submit);
        }
    };

    const sending = status === "sending";

    return (
        <>
            <AnimatePresence>
                {open && (
                    <motion.div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
                        <motion.button
                            type="button"
                            aria-label={p.closeLabel}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !sending && onClose()}
                            className="absolute inset-0 bg-orchid-dark/50 backdrop-blur-sm"
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="pre-registration-title"
                            initial={{ y: 60, opacity: 0, scale: 0.97 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 60, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] bg-orchid-white shadow-[0_30px_80px_rgba(52,22,63,0.4)] sm:rounded-[32px]"
                        >
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={sending}
                                aria-label={p.closeLabel}
                                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-orchid-pink backdrop-blur transition-colors hover:bg-orchid-powder"
                            >
                                <Icon name="close" className="text-[20px]" />
                            </button>

                            <AnimatePresence mode="wait" initial={false}>
                                {status === "done" ? (
                                    <motion.div
                                        key="done"
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center gap-4 px-6 pb-8 pt-12 text-center sm:px-10"
                                    >
                                        <DrawnCheck size={72} />
                                        <h2 id="pre-registration-title" className="font-display text-3xl font-medium text-orchid-dark">
                                            {p.successTitle}
                                        </h2>
                                        <p className="max-w-sm text-sm leading-relaxed text-orchid-muted">
                                            {already ? p.successAlready : tpl(p.successText, { phone: formatPhone(form.phone) })}
                                        </p>
                                        <button type="button" onClick={onClose} className="aurora-btn mt-2 w-full rounded-full px-6 py-4 text-sm font-bold text-white sm:w-auto sm:px-12">
                                            {p.close}
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.form
                                        key="form"
                                        noValidate
                                        onSubmit={submit}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex min-h-0 flex-1 flex-col"
                                    >
                                        <div className="overflow-y-auto px-6 pb-4 pt-7 sm:px-8">
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-orchid-powder px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-orchid-pink">
                                                <Icon name="campaign" filled className="text-[15px]" />
                                                {p.badge}
                                            </span>
                                            <h2 id="pre-registration-title" className="mt-3 pr-10 font-display text-2xl font-medium leading-tight text-orchid-dark sm:text-[28px]">
                                                {title}
                                            </h2>
                                            <p className="mt-2 text-sm leading-relaxed text-orchid-muted">{p.modalText}</p>

                                            {room && (
                                                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-3">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink">
                                                        <Icon name="bed" filled className="text-[19px]" />
                                                    </span>
                                                    <span className="flex flex-col leading-tight">
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-orchid-muted">{p.room}</span>
                                                        <span className="text-sm font-semibold text-orchid-dark">{localized(room.name, locale)}</span>
                                                    </span>
                                                </div>
                                            )}

                                            <div className="mt-5 flex flex-col gap-4">
                                                <FloatingField
                                                    id="pre-fullName"
                                                    name="fullName"
                                                    label={p.fullName}
                                                    required
                                                    value={form.fullName}
                                                    onChange={(v) => set("fullName", v.slice(0, 120))}
                                                    error={errors.fullName}
                                                    tick={tick}
                                                    inputProps={{ autoComplete: "name" }}
                                                />
                                                <FloatingField
                                                    id="pre-phone"
                                                    name="phone"
                                                    label={p.phone}
                                                    required
                                                    prefix="+90"
                                                    value={formatPhone(form.phone)}
                                                    onChange={(v) => set("phone", onlyDigits(v, 12).replace(/^90(?=5)/, "").replace(/^0/, "").slice(0, 10))}
                                                    error={errors.phone}
                                                    tick={tick}
                                                    inputProps={{ inputMode: "tel", autoComplete: "tel-national" }}
                                                />
                                                <FloatingField
                                                    id="pre-note"
                                                    name="note"
                                                    label={p.note}
                                                    multiline
                                                    rows={2}
                                                    value={form.note}
                                                    onChange={(v) => set("note", v.slice(0, 500))}
                                                />
                                                <div data-field="kvkk" className="flex flex-col gap-1.5">
                                                    <Checkbox id="pre-kvkk" checked={form.kvkk} onChange={(v) => set("kvkk", v)} invalid={Boolean(errors.kvkk)}>
                                                        {p.kvkkLabel}
                                                    </Checkbox>
                                                    <button
                                                        type="button"
                                                        onClick={() => setKvkkOpen(true)}
                                                        className="flex items-center gap-1.5 self-start px-2 text-xs font-bold text-orchid-pink underline-offset-4 hover:underline"
                                                    >
                                                        <Icon name="description" className="text-[16px]" />
                                                        {t.apply.review.kvkkLink}
                                                    </button>
                                                    <FieldError id="pre-kvkk-error" message={errors.kvkk} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-orchid-petal/30 px-6 py-4 sm:px-8">
                                            <AnimatePresence initial={false}>
                                                {submitError && (
                                                    <motion.p
                                                        role="alert"
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="mb-3 flex items-start gap-2 overflow-hidden rounded-2xl bg-orchid-powder/80 px-4 py-3 text-sm font-semibold text-orchid-pink"
                                                    >
                                                        <Icon name="error" filled className="mt-px text-[17px]" />
                                                        {submitError}
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                            <button
                                                type="submit"
                                                disabled={sending}
                                                className="aurora-btn flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-bold text-white transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
                                            >
                                                {sending ? <Icon name="progress_activity" className="animate-spin text-[18px]" /> : <Icon name="send" className="text-[18px]" />}
                                                {p.submit}
                                            </button>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <KvkkModal open={kvkkOpen} onClose={() => setKvkkOpen(false)} />
        </>
    );
}
