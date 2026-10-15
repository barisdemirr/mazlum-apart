"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/** Banka hesabı kartı: yalnızca hesap bilgisi tanımlıysa çizilir (uydurma IBAN gösterilmez) */
export default function BankCard({ bank }) {
    const { t } = useLanguage();
    const copy = t.studentPortal.payments.bank;
    const [copied, setCopied] = useState(false);
    if (!bank?.iban) return null;

    async function copyIban() {
        try {
            await navigator.clipboard.writeText(bank.iban.replace(/\s/g, ""));
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            /* pano erişimi yoksa sessizce geç */
        }
    }

    return (
        <section className="glass-card rounded-[32px] p-5 sm:p-7">
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-orchid-dark">
                <Icon name="account_balance" className="text-[22px] text-orchid-pink" />
                {copy.title}
            </h2>
            {bank.holder && (
                <p className="mt-4 text-sm text-orchid-muted">
                    {copy.holder}: <span className="font-bold text-orchid-dark">{bank.holder}</span>
                </p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-orchid-powder/60 px-4 py-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orchid-pink">{copy.iban}</p>
                    <p className="break-all font-mono text-sm font-bold text-orchid-dark">{bank.iban}</p>
                </div>
                <button type="button" onClick={copyIban} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-orchid-pink shadow-sm hover:bg-orchid-powder">
                    <Icon name={copied ? "check" : "content_copy"} className="text-[16px]" />
                    {copied ? copy.copied : copy.copy}
                </button>
            </div>
            <p className="mt-3 text-xs text-orchid-muted">{copy.note}</p>
        </section>
    );
}
