"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import StatusBadge from "./StatusBadge";
import { chargeLabel } from "@/lib/student/labels";
import { formatDate, formatPrice } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT } from "@/lib/motion";

/** Kayıt sırasında en fazla bu kadar sonraki kalem de görünür; gerisi "Tüm dönemi göster" ile açılır */
const LOOKAHEAD = 3;

export default function PaymentPlanList({ items }) {
    const { t, tpl, locale } = useLanguage();
    const copy = t.studentPortal.payments;
    const [all, setAll] = useState(false);
    const money = (n) => formatPrice(n, "TRY", locale);

    const nextIndex = items.findIndex((i) => i.remaining > 0);
    const visibleCount = nextIndex === -1 ? items.length : Math.min(items.length, nextIndex + 1 + LOOKAHEAD);
    const shown = useMemo(() => (all ? items : items.slice(0, visibleCount)), [all, items, visibleCount]);
    const hidden = items.length - visibleCount;

    return (
        <section className="glass-card rounded-[32px] p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-orchid-dark">
                    <Icon name="calendar_month" className="text-[22px] text-orchid-pink" />
                    {copy.planTitle}
                </h2>
                <span className="rounded-full bg-orchid-powder px-3 py-1 text-xs font-bold text-orchid-pink">{tpl(copy.planCount, { count: items.length })}</span>
            </div>

            <ul className="flex flex-col gap-2.5">
                <AnimatePresence initial={false}>
                    {shown.map((item, i) => {
                        const isNext = items.indexOf(item) === nextIndex;
                        const partial = item.paid > 0 && item.remaining > 0;
                        return (
                            <motion.li
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.45, delay: Math.min(i, 6) * 0.04, ease: EASE_OUT }}
                                className={`rounded-3xl border p-4 ${
                                    item.status === "overdue"
                                        ? "border-orchid-pink/60 bg-orchid-powder/60"
                                        : isNext
                                          ? "border-orchid-petal/70 bg-white shadow-[0_14px_34px_-20px_rgba(180,57,143,0.55)]"
                                          : "border-orchid-petal/25 bg-white/60"
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                            item.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-orchid-lilac text-orchid-violet"
                                        }`}
                                    >
                                        {item.status === "paid" ? <Icon name="check" className="text-[20px]" /> : item.kind === "deposit" ? <Icon name="shield" className="text-[19px]" /> : item.index}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-orchid-dark">{chargeLabel(item, copy, locale)}</p>
                                        <p className="text-xs text-orchid-muted">{tpl(copy.due, { date: formatDate(item.dueDate) })}{item.kind === "deposit" && ` · ${copy.depositNote}`}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className="font-display text-lg font-semibold text-orchid-dark">{money(item.amount)}</span>
                                        <StatusBadge status={item.status} label={copy.status[item.status]} />
                                    </div>
                                </div>

                                {partial && (
                                    <div className="mt-3 pl-[52px]">
                                        <div className="h-1.5 overflow-hidden rounded-full bg-orchid-powder">
                                            <div className="h-full rounded-full bg-gradient-to-r from-orchid-petal to-orchid-pink" style={{ width: `${(item.paid / item.amount) * 100}%` }} />
                                        </div>
                                        <p className="mt-1.5 text-xs font-semibold text-orchid-muted">
                                            {tpl(copy.partialLine, { paid: money(item.paid), left: money(item.remaining) })}
                                        </p>
                                    </div>
                                )}
                            </motion.li>
                        );
                    })}
                </AnimatePresence>
            </ul>

            {hidden > 0 && (
                <button
                    type="button"
                    onClick={() => setAll((v) => !v)}
                    aria-expanded={all}
                    className="mx-auto mt-5 flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-orchid-pink transition-colors hover:bg-orchid-powder"
                >
                    {all ? copy.showLess : copy.showAll}
                    <Icon name={all ? "expand_less" : "expand_more"} className="text-[20px]" />
                </button>
            )}
        </section>
    );
}
