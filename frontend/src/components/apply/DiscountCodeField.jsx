"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import FloatingField from "./fields/FloatingField";
import { FieldError } from "./fields/Choice";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatPrice } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";
import { checkDiscountCode } from "@/services/discountCodes";

/**
 * Kayıt yenileyen eski öğrenciler için indirim kodu. Kod geçerliyse oda kartlarındaki fiyatlar anında indirimli görünür.
 * discount: uygulanmış kod ({ code, kind, value, restricted }) ya da null · onChange(discount | null) · error: sunucudan dönen hata metni
 */
export default function DiscountCodeField({ discount, onChange, error, currency = "TRY" }) {
    const { t, tpl, locale } = useLanguage();
    const d = t.apply.room.discount;
    const [value, setValue] = useState("");
    const [checking, setChecking] = useState(false);
    const [localError, setLocalError] = useState("");

    const amount = discount ? (discount.kind === "percent" ? `%${discount.value}` : formatPrice(discount.value, currency, locale)) : "";

    const apply = async () => {
        const code = value.trim();
        if (!code || checking) return;
        setChecking(true);
        setLocalError("");
        try {
            onChange(await checkDiscountCode(code));
            setValue("");
        } catch (e) {
            setLocalError(e?.status === 429 ? d.rate : d.invalid);
        } finally {
            setChecking(false);
        }
    };

    return (
        <div data-field="discountCode" className="flex flex-col gap-3">
            <div>
                <span className="text-sm font-bold text-orchid-dark">{d.label}</span>
                <span className="ml-2 text-xs text-orchid-muted">{d.optional}</span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
                {discount ? (
                    <motion.div
                        key="applied"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: EASE_OUT }}
                        className="flex items-start gap-3 rounded-2xl bg-orchid-powder/80 px-4 py-3 text-sm text-orchid-dark"
                    >
                        <Icon name="sell" filled className="mt-0.5 text-[22px] text-orchid-pink" />
                        <div className="min-w-0 flex-1">
                            <p className="font-bold">{tpl(d.applied, { code: discount.code, amount })}</p>
                            <p className="text-xs text-orchid-muted">{discount.restricted ? d.restricted : d.note}</p>
                        </div>
                        <button type="button" onClick={() => onChange(null)} className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-orchid-pink transition-colors hover:bg-orchid-pink hover:text-white">
                            {d.remove}
                        </button>
                    </motion.div>
                ) : (
                    <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-start gap-3">
                        <FloatingField
                            id="discount-code"
                            name="discountCode-input"
                            label={d.placeholder}
                            value={value}
                            onChange={(v) => {
                                setValue(v.toUpperCase());
                                setLocalError("");
                            }}
                            error={localError || error}
                            className="min-w-0 flex-1"
                            inputProps={{
                                autoComplete: "off",
                                autoCapitalize: "characters",
                                spellCheck: false,
                                maxLength: 20,
                                onKeyDown: (e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        apply();
                                    }
                                },
                            }}
                        />
                        <button
                            type="button"
                            onClick={apply}
                            disabled={!value.trim() || checking}
                            className="flex h-14 shrink-0 items-center gap-2 rounded-full bg-orchid-pink px-6 text-sm font-bold text-white transition-opacity disabled:opacity-40"
                        >
                            {checking ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Icon name="check" className="text-[18px]" />}
                            {d.apply}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            {discount && <FieldError id="discount-error" message={error} />}
        </div>
    );
}
