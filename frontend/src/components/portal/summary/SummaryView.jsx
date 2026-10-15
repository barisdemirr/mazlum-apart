"use client";

import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import LocalizedLink from "@/components/ui/LocalizedLink";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import PageHeader from "@/components/portal/PageHeader";
import InstallmentStrip from "./InstallmentStrip";
import { formatDate, formatPercent, formatPrice } from "@/lib/format";
import { chargeLabel, placementText } from "@/lib/student/labels";
import { localized } from "@/lib/i18n/localized";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT } from "@/lib/motion";

const rise = (i) => ({
    initial: { opacity: 0, y: 26 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.65, delay: 0.1 + i * 0.08, ease: EASE_OUT },
});

export default function SummaryView({ student, ledger, period }) {
    const { t, tpl, locale } = useLanguage();
    const copy = t.studentPortal.summary;
    const pay = t.studentPortal.payments;
    const { totals, next } = ledger;
    const money = (n) => formatPrice(n, "TRY", locale);
    const percent = Math.round(totals.progress * 100);
    const room = student.room;

    const dueText = !next
        ? copy.nextNone
        : next.daysUntilDue < 0
          ? tpl(copy.lateDays, { days: Math.abs(next.daysUntilDue) })
          : next.daysUntilDue === 0
            ? copy.dueToday
            : tpl(copy.inDays, { days: next.daysUntilDue });

    return (
        <>
            <PageHeader eyebrow={tpl(t.studentPortal.shell.period, { period: period.name })} title={tpl(t.studentPortal.shell.greeting, { name: student.firstName })} text={copy.text} />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* Bakiye */}
                <motion.section {...rise(0)} className="relative isolate overflow-hidden rounded-[32px] bg-gradient-to-br from-orchid-dark via-[#4b1d66] to-orchid-pink p-6 text-white shadow-[0_30px_70px_-32px_rgba(75,29,102,0.8)] sm:p-8 lg:col-span-2">
                    <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-orchid-petal/40 soft-blob animate-blob" />
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                        <Icon name="account_balance_wallet" className="text-[18px]" />
                        {copy.balance}
                    </p>
                    {totals.remaining > 0 ? (
                        <p className="mt-3 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
                            <AnimatedNumber value={totals.remaining} format={money} duration={1.1} />
                        </p>
                    ) : (
                        <div className="mt-3">
                            <p className="font-display text-4xl font-semibold">{copy.allPaid}</p>
                            <p className="mt-1 text-sm text-white/70">{copy.allPaidText}</p>
                        </div>
                    )}

                    <div className="mt-7">
                        <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1.2, delay: 0.5, ease: EASE_OUT }} className="h-full rounded-full bg-gradient-to-r from-orchid-petal to-white" />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-white/80">
                            <span>{tpl(copy.paidOf, { paid: money(totals.paid), total: money(totals.total) })}</span>
                            <span>{formatPercent(percent, locale)}</span>
                        </div>
                    </div>

                    {totals.overdue > 0 && (
                        <p role="alert" className="mt-5 flex items-start gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold backdrop-blur">
                            <Icon name="error" filled className="mt-px text-[18px] text-orchid-petal" />
                            {tpl(copy.overdueNote, { amount: money(totals.overdue) })}
                        </p>
                    )}

                    <LocalizedLink href="/ogrenci/odemeler" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-orchid-pink shadow-md transition-transform hover:scale-[1.03]">
                        {copy.viewPayments}
                        <Icon name="arrow_forward" className="text-[18px]" />
                    </LocalizedLink>
                </motion.section>

                {/* Sıradaki ödeme */}
                <motion.section {...rise(1)} className="glass-card flex flex-col rounded-[32px] p-6 sm:p-7">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-orchid-muted">
                        <Icon name="calendar_clock" className="text-[18px] text-orchid-pink" />
                        {copy.nextPayment}
                    </p>
                    {next ? (
                        <>
                            <p className="mt-3 font-display text-4xl font-semibold text-orchid-dark">{money(next.remaining)}</p>
                            <p className="mt-1 text-sm font-semibold text-orchid-dark">{chargeLabel(next, pay, locale)}</p>
                            <p className="mt-0.5 text-xs text-orchid-muted">{tpl(copy.dueOn, { date: formatDate(next.dueDate) })}</p>
                            {next.paid > 0 && <p className="mt-2 text-xs font-semibold text-orchid-violet">{tpl(copy.partialLine, { paid: money(next.paid), left: money(next.remaining) })}</p>}
                            <span className={`mt-4 inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ${next.daysUntilDue < 0 ? "bg-orchid-pink text-white" : "bg-orchid-lilac text-orchid-violet"}`}>{dueText}</span>
                        </>
                    ) : (
                        <p className="mt-4 text-sm text-orchid-muted">{copy.nextNone}</p>
                    )}
                    <p className="mt-auto flex items-start gap-2 pt-6 text-xs leading-relaxed text-orchid-muted">
                        <Icon name="info" className="mt-px text-[16px]" />
                        {copy.manualNote}
                    </p>
                </motion.section>

                {/* Oda */}
                <motion.section {...rise(2)} className="glass-card rounded-[32px] p-6 sm:p-7">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-orchid-muted">
                        <Icon name="meeting_room" className="text-[18px] text-orchid-pink" />
                        {copy.yourRoom}
                    </p>
                    <p className="mt-3 font-display text-2xl font-semibold text-orchid-dark">{localized(room.typeName, locale)}</p>
                    <p className="mt-1 text-sm text-orchid-muted">
                        {placementText(room)}
                    </p>
                    <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-orchid-powder/60 p-3">
                            <dt className="text-[11px] font-bold uppercase tracking-wider text-orchid-muted">{copy.entry}</dt>
                            <dd className="mt-1 font-bold text-orchid-dark">{formatDate(student.entryDate)}</dd>
                        </div>
                        <div className="rounded-2xl bg-orchid-powder/60 p-3">
                            <dt className="text-[11px] font-bold uppercase tracking-wider text-orchid-muted">{copy.periodEnd}</dt>
                            <dd className="mt-1 font-bold text-orchid-dark">{formatDate(period.end)}</dd>
                        </div>
                    </dl>
                    <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-orchid-muted">
                        <Icon name="group" className="text-[17px] text-orchid-pink" />
                        {tpl(copy.flatPeople, { count: room.flatPeople })}
                    </p>
                </motion.section>

                {/* Takvim */}
                <motion.section {...rise(3)} className="glass-card min-w-0 rounded-[32px] p-6 sm:p-7 lg:col-span-2">
                    <div className="mb-4 flex items-end justify-between gap-3">
                        <div>
                            <h2 className="font-display text-xl font-semibold text-orchid-dark">{copy.schedule}</h2>
                            <p className="text-xs text-orchid-muted">{tpl(copy.scheduleText, { period: period.name, count: totals.rentCount })}</p>
                        </div>
                        <LocalizedLink href="/ogrenci/odemeler" className="text-xs font-bold text-orchid-pink hover:underline">
                            {copy.scheduleHint}
                        </LocalizedLink>
                    </div>
                    <InstallmentStrip items={ledger.items} />
                </motion.section>

                {/* Teknik destek */}
                <motion.section {...rise(4)} className="flex flex-col justify-between gap-5 rounded-[32px] bg-gradient-to-br from-orchid-powder to-orchid-lilac p-6 sm:p-7 lg:col-span-3 lg:flex-row lg:items-center">
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-orchid-pink shadow-sm">
                            <Icon name="handyman" className="text-[24px]" />
                        </span>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.15em] text-orchid-pink">{copy.support}</p>
                            <p className="font-display text-xl font-semibold text-orchid-dark">{copy.supportText}</p>
                        </div>
                    </div>
                    <LocalizedLink href="/ogrenci/ariza" className="aurora-btn flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-bold text-white">
                        <Icon name="add_circle" className="text-[20px]" />
                        {copy.newRequest}
                    </LocalizedLink>
                </motion.section>
            </div>
        </>
    );
}
