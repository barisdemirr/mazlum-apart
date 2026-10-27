"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import { FieldError, GroupLabel, useShake } from "./fields/Choice";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT } from "@/lib/motion";
import { MAX_DOCUMENT_MB, inspectPdf } from "@/lib/application";

const sizeText = (bytes, locale) =>
    bytes >= 1024 * 1024
        ? `${(bytes / 1024 / 1024).toLocaleString(locale === "en" ? "en-GB" : "tr-TR", { maximumFractionDigits: 1 })} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Öğrenci belgesi yükleme: sürükle-bırak ya da dokunarak seç. Yalnızca PDF, en fazla 4 MB.
 * Dosya seçilir seçilmez denetlenir; geçersizse forma alınmaz ve neden yazılır.
 */
/** required: başvuru formunda zorunlu (varsayılan); portaldaki kayıt yenilemede isteğe bağlı */
export default function DocumentField({ value, onChange, error, tick, required = true }) {
    const { t, tpl, locale } = useLanguage();
    const d = t.apply.school;
    const errors = t.apply.errors;
    const inputRef = useRef(null);
    const [drag, setDrag] = useState(false);
    const [checking, setChecking] = useState(false);
    const [localError, setLocalError] = useState("");
    const controls = useShake(error || localError, tick);
    const shown = localError || error;

    const pick = async (file) => {
        if (!file) return;
        setChecking(true);
        const problem = await inspectPdf(file);
        setChecking(false);
        if (problem) {
            setLocalError(tpl(errors[problem] ?? errors.documentInvalid, { mb: MAX_DOCUMENT_MB }));
            return;
        }
        setLocalError("");
        onChange(file);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files?.length > 1) {
            setLocalError(errors.documentOne);
            return;
        }
        pick(e.dataTransfer.files?.[0]);
    };

    return (
        <motion.div animate={controls} data-field="document" className="flex flex-col gap-3">
            <GroupLabel required={required} id="document-label">{d.document}</GroupLabel>
            <input
                ref={inputRef}
                id="document"
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                aria-labelledby="document-label"
                aria-describedby="document-hint document-error"
                onChange={(e) => {
                    pick(e.target.files?.[0]);
                    e.target.value = ""; // aynı dosya yeniden seçilebilsin
                }}
            />

            <AnimatePresence mode="wait" initial={false}>
                {value ? (
                    <motion.div
                        key="file"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: EASE_OUT }}
                        className="flex items-center gap-3 rounded-3xl border border-orchid-petal/40 bg-white/80 p-3 sm:p-4"
                    >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orchid-powder text-orchid-pink">
                            <Icon name="picture_as_pdf" filled className="text-[26px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-orchid-dark">{value.name}</span>
                            <span className="flex items-center gap-1 text-xs text-orchid-muted">
                                <Icon name="check_circle" filled className="text-[14px] text-orchid-pink" />
                                {sizeText(value.size, locale)} · {d.documentReady}
                            </span>
                        </span>
                        <button type="button" onClick={() => inputRef.current?.click()} className="shrink-0 rounded-full bg-orchid-powder px-3.5 py-1.5 text-xs font-bold text-orchid-pink transition-colors hover:bg-orchid-pink hover:text-white">
                            {d.documentChange}
                        </button>
                        <button type="button" onClick={() => onChange(null)} aria-label={d.documentRemove} title={d.documentRemove} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-orchid-muted transition-colors hover:bg-orchid-powder hover:text-orchid-pink">
                            <Icon name="close" className="text-[18px]" />
                        </button>
                    </motion.div>
                ) : (
                    <motion.button
                        key="drop"
                        type="button"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDrag(true);
                        }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={onDrop}
                        aria-invalid={Boolean(shown)}
                        className={`flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
                            drag ? "border-orchid-pink bg-orchid-powder/80" : shown ? "border-orchid-pink bg-orchid-powder/50" : "border-orchid-petal/60 bg-white/60 hover:border-orchid-pink hover:bg-white"
                        }`}
                    >
                        {checking ? (
                            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-orchid-petal border-t-orchid-pink" />
                        ) : (
                            <Icon name="upload_file" className="text-[34px] text-orchid-pink" />
                        )}
                        <span className="text-sm font-bold text-orchid-dark">{drag ? d.documentDrop : d.documentPick}</span>
                        <span className="text-xs text-orchid-muted">{tpl(d.documentLimits, { mb: MAX_DOCUMENT_MB })}</span>
                    </motion.button>
                )}
            </AnimatePresence>
            <p id="document-hint" className="px-1 text-xs text-orchid-muted">{d.documentHint}</p>
            <FieldError id="document-error" message={shown} />
        </motion.div>
    );
}
