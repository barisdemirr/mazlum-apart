"use client";

import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/portal/PageHeader";
import PaymentStats from "./PaymentStats";
import PaymentPlanList from "./PaymentPlanList";
import PaymentHistory from "./PaymentHistory";
import BankCard from "./BankCard";
import { waHref } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function PaymentsView({ ledger, period, bank }) {
    const { t, tpl, locale } = useLanguage();
    const copy = t.studentPortal.payments;
    const help = waHref(copy.helpMessage);
    const { totals } = ledger;

    return (
        <>
            <PageHeader title={t.studentPortal.nav.payments} text={tpl(copy.text, { period: period.name })} />

            {totals.overdue > 0 && (
                <div role="alert" className="mb-5 flex items-start gap-3 rounded-3xl bg-orchid-pink px-5 py-4 text-sm font-semibold text-white">
                    <Icon name="error" filled className="mt-px text-[20px]" />
                    {tpl(copy.overdueAlert, { amount: formatPrice(totals.overdue, "TRY", locale) })}
                </div>
            )}

            <PaymentStats totals={totals} />

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
                <PaymentPlanList items={ledger.items} />
                <div className="flex flex-col gap-6">
                    <PaymentHistory history={ledger.history} items={ledger.items} credit={totals.credit} />
                    <BankCard bank={bank} />
                </div>
            </div>

            <div className="mt-6 flex flex-col items-start gap-3 rounded-3xl bg-orchid-lilac/50 p-5 text-sm leading-relaxed text-orchid-dark sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-2.5">
                    <Icon name="info" className="mt-0.5 text-[20px] text-orchid-pink" />
                    {copy.note}
                </p>
                {help && (
                    <a href={help} target="_blank" rel="noopener noreferrer" className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-orchid-pink shadow-sm hover:bg-orchid-powder">
                        <Icon name="support_agent" className="text-[19px]" />
                        {copy.help}
                    </a>
                )}
            </div>
        </>
    );
}
