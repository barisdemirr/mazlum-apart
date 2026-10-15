"use client";

import { useEffect, useRef } from "react";
import Icon from "@/components/ui/Icon";
import { monthLabel } from "@/lib/student/labels";
import { formatDate, formatPrice } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const TONE = {
    paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
    partial: "border-orchid-petal/60 bg-orchid-lilac text-orchid-violet",
    upcoming: "border-orchid-petal/30 bg-white/70 text-orchid-muted",
    overdue: "border-orchid-pink bg-orchid-pink text-white",
};
const ICON = { paid: "check_circle", partial: "pie_chart", upcoming: "schedule", overdue: "error" };

/** Aylık kira kutuları (yatay kaydırılır). Sıradaki ay açılışta ortaya kaydırılır. */
export default function InstallmentStrip({ items }) {
    const { t, locale } = useLanguage();
    const copy = t.studentPortal.payments;
    const rents = items.filter((i) => i.kind === "rent");
    const currentRef = useRef(null);
    const scroller = useRef(null);
    const nextId = rents.find((i) => i.remaining > 0)?.id;

    useEffect(() => {
        const box = scroller.current;
        const el = currentRef.current;
        if (box && el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
    }, []);

    return (
        <div ref={scroller} className="no-scrollbar -mx-2 flex snap-x gap-3 overflow-x-auto px-2 pb-2">
            {rents.map((item) => (
                <div
                    key={item.id}
                    ref={item.id === nextId ? currentRef : undefined}
                    className={`w-[132px] shrink-0 snap-center rounded-3xl border p-3.5 ${TONE[item.status]} ${item.id === nextId ? "ring-2 ring-orchid-pink ring-offset-2 ring-offset-orchid-white" : ""}`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold opacity-70">{item.index}</span>
                        <Icon name={ICON[item.status]} filled className="text-[18px]" />
                    </div>
                    <p className="mt-2 text-sm font-bold">{monthLabel(item.month, locale, { withYear: false })}</p>
                    <p className="font-display text-base font-semibold">{formatPrice(item.amount, "TRY", locale)}</p>
                    <p className="mt-1 text-[10px] font-semibold opacity-75">{formatDate(item.dueDate)}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-90">{copy.status[item.status]}</p>
                </div>
            ))}
        </div>
    );
}
