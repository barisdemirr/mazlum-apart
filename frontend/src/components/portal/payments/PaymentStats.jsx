"use client";

import { motion } from "framer-motion";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Icon from "@/components/ui/Icon";
import { formatPercent, formatPrice } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT } from "@/lib/motion";

/** Toplam · Ödenen · Kalan kartları ve dönem ilerlemesi */
export default function PaymentStats({ totals }) {
    const { t, tpl, locale } = useLanguage();
    const copy = t.studentPortal.payments;
    const money = (n) => formatPrice(n, "TRY", locale);
    const percent = Math.round(totals.progress * 100);

    const cards = [
        { key: "total", icon: "account_balance_wallet", label: copy.total, value: totals.total, note: tpl(copy.totalNote, { months: totals.rentCount }), tone: "bg-white/80" },
        { key: "paid", icon: "check_circle", label: copy.paid, value: totals.paid, note: formatPercent(percent, locale), tone: "bg-white/80" },
        { key: "remaining", icon: "hourglass_top", label: copy.remaining, value: totals.remaining, note: tpl(copy.monthsOf, { paid: totals.rentsPaid, total: totals.rentCount }) + " · " + copy.rentsPaid, tone: "bg-gradient-to-br from-orchid-powder to-orchid-lilac" },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {cards.map((card, i) => (
                <motion.div
                    key={card.key}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.08, ease: EASE_OUT }}
                    className={`min-w-0 rounded-[28px] border border-orchid-petal/25 p-5 shadow-[0_18px_40px_-26px_rgba(123,70,199,0.4)] ${card.tone}`}
                >
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-orchid-muted">
                        <Icon name={card.icon} className="text-[18px] text-orchid-pink" />
                        {card.label}
                    </p>
                    <p className="mt-3 font-display text-3xl font-semibold text-orchid-dark">
                        <AnimatedNumber value={card.value} format={money} />
                    </p>
                    <p className="mt-1 text-xs text-orchid-muted">{card.note}</p>
                </motion.div>
            ))}

            <div className="sm:col-span-3">
                <div className="h-2.5 overflow-hidden rounded-full bg-orchid-powder">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 1.1, delay: 0.4, ease: EASE_OUT }}
                        className="h-full rounded-full bg-gradient-to-r from-orchid-petal via-orchid-pink to-orchid-violet"
                    />
                </div>
            </div>
        </div>
    );
}
