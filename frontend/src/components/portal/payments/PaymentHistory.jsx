"use client";

import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import { chargeLabel } from "@/lib/student/labels";
import { formatDate, formatPrice } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT, VIEWPORT_ONCE } from "@/lib/motion";

/** Kayıtlı ödemeler (yeniden eskiye) ve her birinin hangi kalemlere sayıldığı */
export default function PaymentHistory({ history, items, credit }) {
    const { t, tpl, locale } = useLanguage();
    const copy = t.studentPortal.payments;
    const money = (n) => formatPrice(n, "TRY", locale);
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));

    return (
        <section className="glass-card rounded-[32px] p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-orchid-dark">
                    <Icon name="history" className="text-[22px] text-orchid-pink" />
                    {copy.historyTitle}
                </h2>
                {history.length > 0 && (
                    <span className="rounded-full bg-orchid-powder px-3 py-1 text-xs font-bold text-orchid-pink">{tpl(copy.historyCount, { count: history.length })}</span>
                )}
            </div>

            {history.length === 0 ? (
                <p className="rounded-3xl bg-orchid-powder/50 px-5 py-10 text-center text-sm text-orchid-muted">{copy.historyEmpty}</p>
            ) : (
                <ol className="relative flex flex-col gap-3 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-orchid-petal/40">
                    {history.map((payment, i) => (
                        <motion.li
                            key={payment.id}
                            initial={{ opacity: 0, x: -14 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={VIEWPORT_ONCE}
                            transition={{ duration: 0.5, delay: i * 0.05, ease: EASE_OUT }}
                            className="relative flex gap-4"
                        >
                            <span className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orchid-petal/40 bg-white text-orchid-pink">
                                <Icon name={payment.method === "cash" ? "payments" : "account_balance"} className="text-[19px]" />
                            </span>
                            <div className="min-w-0 flex-1 rounded-3xl border border-orchid-petal/25 bg-white/60 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-bold text-orchid-dark">{copy.methods[payment.method]}</p>
                                        <p className="text-xs text-orchid-muted">{formatDate(payment.date)}</p>
                                    </div>
                                    <span className="font-display text-lg font-semibold text-emerald-700">+{money(payment.amount)}</span>
                                </div>
                                {payment.allocations.length > 0 && (
                                    <p className="mt-2.5 text-xs leading-relaxed text-orchid-muted">
                                        <span className="font-bold text-orchid-dark">{copy.appliedTo}: </span>
                                        {payment.allocations
                                            .map((a) => {
                                                const item = byId[a.chargeId];
                                                const label = item ? chargeLabel(item, copy, locale) : "";
                                                return a.amount < (item?.amount ?? 0) ? `${label} (${money(a.amount)})` : label;
                                            })
                                            .join(" · ")}
                                    </p>
                                )}
                                {payment.note && <p className="mt-1.5 text-xs text-orchid-muted">{payment.note}</p>}
                            </div>
                        </motion.li>
                    ))}
                </ol>
            )}

            {credit > 0 && <p className="mt-4 rounded-2xl bg-orchid-lilac/60 px-4 py-3 text-xs font-semibold text-orchid-violet">{tpl(copy.credit, { amount: money(credit) })}</p>}
        </section>
    );
}
