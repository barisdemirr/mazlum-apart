"use client";

import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatDate, formatPrice } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";

const list = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } };
const row = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } } };

function PlanRow({ icon, title, sub, amount, when, accent, price }) {
    return (
        <motion.li
            variants={row}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 sm:gap-4 ${
                accent ? "border-orchid-petal/60 bg-orchid-powder/70" : "border-orchid-petal/25 bg-white/70"
            }`}
        >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accent ? "aurora-btn text-white" : "bg-orchid-powder text-orchid-pink"}`}>
                <Icon name={icon} className="text-[20px]" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-orchid-dark">{title}</span>
                <span className="block text-xs text-orchid-muted">{when}</span>
            </span>
            <span className="text-right">
                <span className="block font-display text-lg font-semibold text-orchid-dark">{price(amount)}</span>
                {sub && <span className="block text-[11px] font-semibold text-orchid-muted">{sub}</span>}
            </span>
        </motion.li>
    );
}

/** Ödeme planı: satırlar sırayla akarak gelir, kayıtta ödenecek toplam sayarak belirir */
export default function PaymentPlan({ plan, room, payDay }) {
    const { t, tpl, locale } = useLanguage();
    const r = t.apply.review;
    const price = (n) => formatPrice(n, room.currency, locale);

    if (!plan) return null;

    return (
        <div>
            <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                    <h3 className="font-display text-2xl font-medium text-orchid-dark">{r.planTitle}</h3>
                    <p className="text-sm text-orchid-muted">{r.planHint}</p>
                </div>
            </div>

            {/* key: plan değişince (ödeme günü/giriş tarihi) satırlar yeniden akar */}
            <motion.ul
                key={`${payDay}-${plan.months}-${room.slug}`}
                variants={list}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-2.5"
            >
                <PlanRow icon="shield" title={r.deposit} when={r.depositWhen} amount={plan.deposit} price={price} />
                {plan.rents.map((rent) => (
                    <PlanRow
                        key={rent.key}
                        icon={rent.atRegistration ? "key" : rent.summer ? "sunny" : "event"}
                        title={rent.atRegistration ? r.firstRent : tpl(rent.summer ? r.summerRent : r.rent, { month: rent.month })}
                        sub={rent.atRegistration ? rent.month : null}
                        when={rent.atRegistration ? r.firstRentWhen : rent.dueDate ? tpl(r.dueBy, { date: formatDate(rent.dueDate) }) : r.dueDateMissing}
                        amount={rent.amount}
                        price={price}
                    />
                ))}
                {plan.coveredMonth && (
                    <PlanRow icon="check_circle" title={tpl(r.coveredRent, { month: plan.coveredMonth })} when={r.coveredWhen} amount={0} price={() => r.coveredAmount} />
                )}
            </motion.ul>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + plan.rents.length * 0.07, duration: 0.6, ease: EASE_OUT }}
                className="mt-4 flex flex-col gap-3"
            >
                <div className="aurora-btn flex items-center justify-between gap-4 rounded-3xl px-5 py-4 text-white">
                    <span className="text-sm font-bold">{r.dueAtRegistrationTotal}</span>
                    <AnimatedNumber value={plan.dueAtRegistration} format={price} duration={1.1} className="font-display text-3xl font-semibold" />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-orchid-petal/30 bg-white/70 px-5 py-3">
                    <span className="text-sm font-bold text-orchid-muted">{r.periodTotal}</span>
                    <span className="font-display text-xl font-semibold text-orchid-dark">{price(plan.periodTotal)}</span>
                </div>
            </motion.div>
        </div>
    );
}
