"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/admin/Toast";
import { translateFields } from "@/lib/admin/translate";
import { Field } from "./fields";

const LANGS = [
    { key: "tr", label: "Türkçe", short: "TR" },
    { key: "en", label: "İngilizce", short: "EN" },
];

export const emptyLocalized = () => ({ tr: "", en: "" });

/** Backend null gönderebilir, forma her zaman üç dilli nesne ver */
export const toLocalized = (value) => ({
    tr: value?.tr ?? "",
    en: value?.en ?? "",
});

/** Kaydetmeden önce: ikisi de boşsa null gönder */
export const cleanLocalized = (value) => {
    const tr = value?.tr?.trim() ?? "";
    const en = value?.en?.trim() ?? "";
    return tr || en ? { tr, en } : null;
};

/**
 * İki dilli (TR + EN) metin alanı: sekmeli, eksik dil rozetle görünür, TR'den Gemini ile İngilizceye çeviri.
 * value: { tr, en }, onChange: (yeni değer) => void
 * errors: { "name.tr": "mesaj" } biçiminde backend hataları
 */
export default function LocalizedField({
    label,
    name,
    value,
    onChange,
    hint,
    errors,
    required,
    multiline = false,
    rows = 4,
    maxLength,
    translateHint,
}) {
    const toast = useToast();
    const [lang, setLang] = useState("tr");
    const [busy, setBusy] = useState(false);

    const current = value?.[lang] ?? "";
    const error = errors?.[`${name}.${lang}`] || errors?.[name];
    const trFilled = Boolean(value?.tr?.trim());

    const setLangValue = (next) => onChange({ ...toLocalized(value), [lang]: next });

    const translate = async () => {
        if (!trFilled) {
            toast.error("Önce Türkçe metni yazın.");
            return;
        }

        setBusy(true);
        try {
            const result = await translateFields([
                { key: name, text: value.tr, hint: translateHint || label },
            ]);
            const out = result[name];
            if (!out) throw new Error("Çeviri üretilemedi.");

            onChange({ ...toLocalized(value), en: out.en || value.en });
            toast.success(`"${label}" çevrildi.`);
            if (lang === "tr") setLang("en"); // sonucu görsün
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    };

    const Tag = multiline ? "textarea" : "input";

    return (
        <Field label={label} hint={hint} error={error} required={required}>
            <div className="overflow-hidden rounded-xl border border-ad-line-strong bg-ad-surface transition-colors focus-within:border-ad-brand focus-within:shadow-[0_0_0_3px_rgba(30,64,175,0.14)]">
                {/* Dil sekmeleri */}
                <div className="flex items-center gap-1 border-b border-ad-line bg-ad-sunken px-1.5 py-1.5">
                    {LANGS.map((l) => {
                        const filled = Boolean(value?.[l.key]?.trim());
                        const active = lang === l.key;
                        return (
                            <button
                                key={l.key}
                                type="button"
                                onClick={() => setLang(l.key)}
                                title={l.label}
                                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${active
                                        ? "bg-ad-surface text-ad-ink shadow-ad-sm"
                                        : "text-ad-muted hover:text-ad-ink"
                                    }`}
                            >
                                {l.short}
                                <span
                                    aria-hidden="true"
                                    className={`h-1.5 w-1.5 rounded-full ${filled ? "bg-ad-ok" : l.key === "tr" ? "bg-ad-brand" : "bg-ad-line-strong"
                                        }`}
                                />
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={translate}
                        disabled={busy || !trFilled}
                        title={trFilled ? "Türkçeden İngilizceye çevir (Gemini)" : "Önce Türkçe metni yazın"}
                        className="ms-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-ad-brand transition-colors hover:bg-ad-brand-soft disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                        <Icon
                            name={busy ? "progress_activity" : "auto_awesome"}
                            className={`text-[15px] ${busy ? "animate-spin" : ""}`}
                        />
                        <span className="hidden sm:inline">{busy ? "Çevriliyor" : "Çevir"}</span>
                    </button>
                </div>

                {/* Metin alanı */}
                <Tag
                    id={`${name}-${lang}`}
                    lang={lang}
                    value={current}
                    rows={multiline ? rows : undefined}
                    maxLength={maxLength}
                    onChange={(e) => setLangValue(e.target.value)}
                    placeholder={lang === "tr" ? "" : "Boş bırakılırsa Türkçesi gösterilir"}
                    className={`w-full border-0 bg-transparent px-3.5 py-3 text-sm outline-none placeholder:text-ad-faint ${multiline ? "min-h-24 resize-y leading-relaxed" : ""
                        }`}
                />
            </div>

            {maxLength && (
                <p className="text-end text-[11px] text-ad-faint">
                    {current.length} / {maxLength}
                </p>
            )}
        </Field>
    );
}

/**
 * Formdaki tüm çok dilli alanları tek istekte çevirir.
 * fields: [{ name, label, value, set }]
 */
export function TranslateAllButton({ fields }) {
    const toast = useToast();
    const [busy, setBusy] = useState(false);

    const pending = fields.filter((f) => f.value?.tr?.trim() && !f.value?.en?.trim());

    const run = async () => {
        if (pending.length === 0) {
            toast.info("Çevrilecek eksik alan yok.");
            return;
        }

        setBusy(true);
        try {
            const result = await translateFields(
                pending.map((f) => ({ key: f.name, text: f.value.tr, hint: f.label }))
            );

            let count = 0;
            for (const field of pending) {
                const out = result[field.name];
                if (!out) continue;
                field.set({
                    tr: field.value.tr,
                    en: field.value.en?.trim() || out.en,
                });
                count += 1;
            }

            if (count === 0) throw new Error("Çeviri üretilemedi.");
            toast.success(`${count} alan çevrildi. Kaydetmeyi unutmayın.`);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={run}
            disabled={busy || pending.length === 0}
            className="ad-btn ad-btn-soft"
        >
            <Icon
                name={busy ? "progress_activity" : "auto_awesome"}
                className={`text-[18px] ${busy ? "animate-spin" : ""}`}
            />
            {busy ? "Çevriliyor" : `Eksikleri çevir${pending.length ? ` (${pending.length})` : ""}`}
        </button>
    );
}