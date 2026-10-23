"use client";

import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import SafeImage from "@/components/ui/SafeImage";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { formatDate, formatPrice } from "@/lib/format";
import { mediaAlt, mediaUrl } from "@/lib/media";
import { EASE_OUT } from "@/lib/motion";

/** Değer değişince eskisi yukarı kayıp çıkar, yenisi alttan gelir */
function Swap({ k, children }) {
    return (
        <span className="relative inline-flex overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={k}
                    initial={{ y: 14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -14, opacity: 0 }}
                    transition={{ duration: 0.22, ease: EASE_OUT }}
                    className="inline-block"
                >
                    {children}
                </motion.span>
            </AnimatePresence>
        </span>
    );
}

function Row({ label, children }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="text-orchid-muted">{label}</span>
            <span className="text-right font-semibold text-orchid-dark">{children}</span>
        </div>
    );
}

/** Kartın içeriği: hem masaüstü yapışkan karta hem mobil alt panele konur */
export function SummaryBody({ room, bed, form, plan }) {
    const { t, locale } = useLanguage();
    const s = t.apply.summary;
    const empty = <span className="font-normal text-orchid-muted">{s.empty}</span>;
    const payDayText = form.payDay === "early" ? t.apply.room.payDayEarly : form.payDay === "mid" ? t.apply.room.payDayMid : null;
    const stay = t.apply.room.stay;
    const stayText = form.stayPlan === "yearly" ? stay.yearly : form.stayPlan === "summer" ? stay.summer : stay.academic;

    return (
        <div className="flex flex-col gap-4">
            <div className="relative h-40 overflow-hidden rounded-3xl bg-orchid-powder">
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={room?.slug ?? "none"}
                        initial={{ opacity: 0, scale: 1.08 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: EASE_OUT }}
                        className="absolute inset-0"
                    >
                        <SafeImage
                            src={room ? mediaUrl(room.image, "md") : ""}
                            alt={room ? mediaAlt(room.image, locale, localized(room.name, locale)) : ""}
                            className="h-full w-full object-cover"
                        />
                    </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-orchid-dark/70 via-orchid-dark/10 to-transparent" />
                <div className="absolute inset-x-4 bottom-3 text-white">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">{s.room}</span>
                    <Swap k={room?.slug ?? "none"}>
                        <span className="font-display text-2xl font-medium">{room ? localized(room.name, locale) : s.empty}</span>
                    </Swap>
                </div>
            </div>

            <div className="flex flex-col divide-y divide-orchid-petal/20">
                <Row label={s.stayPlan}>
                    <Swap k={form.stayPlan}>{stayText}</Swap>
                </Row>
                <Row label={s.monthly}>
                    {room ? (
                        <span className="inline-flex items-baseline gap-1.5">
                            {room.listMonthlyPrice != null && <span className="text-xs font-normal text-orchid-muted line-through">{formatPrice(room.listMonthlyPrice, room.currency, locale)}</span>}
                            <AnimatedNumber value={room.monthlyPrice} format={(n) => formatPrice(n, room.currency, locale)} />
                        </span>
                    ) : (
                        empty
                    )}
                </Row>
                {room?.discount && (
                    <Row label={s.discount}>
                        <span className="inline-flex items-center gap-1.5 text-orchid-pink">
                            <Icon name="sell" filled className="text-[15px]" />
                            {room.discount.code}
                        </span>
                    </Row>
                )}
                {form.stayPlan === "yearly" && room?.summerMonthlyPrice != null && (
                    <Row label={s.summerMonthly}>
                        <AnimatedNumber value={room.summerMonthlyPrice} format={(n) => formatPrice(n, room.currency, locale)} />
                    </Row>
                )}
                {bed && (
                    <Row label={s.bed}>
                        <span className="inline-flex items-center gap-1.5">
                            <Icon name="bed" filled className="text-[16px] text-orchid-pink" />
                            {localized(bed.bedLabel, locale)}
                        </span>
                    </Row>
                )}
                <Row label={s.entry}>{form.entryDate ? <Swap k={form.entryDate}>{formatDate(form.entryDate)}</Swap> : empty}</Row>
                <Row label={s.payDay}>{payDayText ? <Swap k={form.payDay}>{payDayText}</Swap> : empty}</Row>
            </div>

            <div className="rounded-3xl bg-orchid-powder/70 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-orchid-muted">{s.dueAtRegistration}</span>
                <div className="mt-1 font-display text-4xl font-semibold leading-none tracking-tight">
                    {plan ? (
                        <AnimatedNumber
                            value={plan.dueAtRegistration}
                            format={(n) => formatPrice(n, room.currency, locale)}
                            className="bg-gradient-to-r from-orchid-pink to-orchid-violet bg-clip-text text-transparent"
                        />
                    ) : (
                        <span className="text-orchid-muted/50">—</span>
                    )}
                </div>
                <span className="mt-2 block text-xs text-orchid-muted">{s.dueNote}</span>
            </div>
        </div>
    );
}

/** Masaüstünde sağda yapışkan cam kart */
export default function SummaryCard(props) {
    const { t } = useLanguage();
    return (
        <aside className="glass-card hidden rounded-[32px] p-6 shadow-[0_24px_60px_rgba(180,57,143,0.14)] lg:sticky lg:top-28 lg:block">
            <h2 className="mb-4 font-display text-2xl font-medium text-orchid-dark">{t.apply.summary.title}</h2>
            <SummaryBody {...props} />
        </aside>
    );
}

/** Mobilde alttan açılan özet paneli */
export function SummarySheet({ open, onClose, ...props }) {
    const { t } = useLanguage();
    return (
        <AnimatePresence>
            {open && (
                <motion.div className="fixed inset-0 z-[60] lg:hidden" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
                    <motion.button
                        type="button"
                        aria-label={t.apply.summary.close}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-orchid-dark/40 backdrop-blur-sm"
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t.apply.summary.title}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 32 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
                        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[32px] bg-orchid-white p-5 pb-8 shadow-[0_-20px_60px_rgba(52,22,63,0.3)]"
                    >
                        <span className="mx-auto mb-4 block h-1.5 w-12 rounded-full bg-orchid-petal/60" />
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-display text-2xl font-medium text-orchid-dark">{t.apply.summary.title}</h2>
                            <button type="button" onClick={onClose} aria-label={t.apply.summary.close} className="flex h-10 w-10 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink">
                                <Icon name="close" className="text-[20px]" />
                            </button>
                        </div>
                        <SummaryBody {...props} />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
