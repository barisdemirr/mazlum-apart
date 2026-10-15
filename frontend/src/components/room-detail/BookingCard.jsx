"use client";

import { AnimatePresence, motion } from "framer-motion";
import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import { APPLY_HREF } from "@/components/layout/navigation";
import { useSite } from "@/lib/site/SiteProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { formatPrice } from "@/lib/format";

/** Başvuru bağlantısı: oda tipi ve (seçildiyse) yatak formda otomatik seçili gelir */
export function buildApplyHref(slug, bed) {
    const params = new URLSearchParams({ oda: slug });
    if (bed?.id) params.set("yatak", bed.id);
    return `${APPLY_HREF}?${params.toString()}`;
}

function whatsappFor(site, t, tpl, locale, room, bed) {
    const name = localized(room.name, locale);
    const message = bed
        ? tpl(t.roomDetail.booking.askBedMessage, {
              room: name,
              flat: localized(bed.flatName, locale),
              roomName: localized(bed.roomName, locale),
              bed: localized(bed.bedLabel, locale),
          })
        : tpl(t.roomDetail.booking.askMessage, { room: name });
    return site.waHref(message);
}

function Row({ label, children }) {
    return (
        <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="text-orchid-muted">{label}</span>
            <span className="text-right font-semibold text-orchid-dark">{children}</span>
        </div>
    );
}

/** Sağdaki yapışkan (sticky) başvuru kartı + mobil alt çubuk */
export default function BookingCard({ room, summary, selectedBed, onClear }) {
    const { t, tpl, locale } = useLanguage();
    const site = useSite();
    const b = t.roomDetail.booking;
    const hasFree = summary.free > 0;
    const applyHref = buildApplyHref(room.slug, selectedBed);
    const ask = whatsappFor(site, t, tpl, locale, room, selectedBed);
    const price = formatPrice(room.monthlyPrice, room.currency, locale);

    const applyLabel = !hasFree ? b.applyAnyway : selectedBed ? b.applyBed : b.applyRoom;

    return (
        <>
            <aside className="glass-card flex flex-col gap-5 rounded-[32px] p-6 shadow-[0_24px_60px_rgba(180,57,143,0.16)] sm:p-8 lg:sticky lg:top-28">
                <div className="flex items-baseline justify-between gap-3 border-b border-orchid-petal/30 pb-5">
                    <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-orchid-muted">{b.priceLabel}</span>
                        <div className="font-display text-4xl font-semibold tracking-tight text-orchid-dark">
                            {price} <span className="font-sans text-sm font-normal text-orchid-muted">{t.common.perMonth}</span>
                        </div>
                    </div>
                    <span className="rounded-full bg-orchid-powder px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-orchid-pink">
                        {t.common.billsIncluded}
                    </span>
                </div>

                <div className="flex flex-col divide-y divide-orchid-petal/15">
                    <Row label={b.term}>{t.common.term}</Row>
                    <Row label={b.register}>{b.registerValue}</Row>
                    <Row label={b.vacancy}>
                        {hasFree ? (
                            <span className="inline-flex items-center gap-1.5 text-orchid-pink">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-orchid-pink opacity-75 animate-ping" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-orchid-pink" />
                                </span>
                                {summary.free} / {summary.total}
                            </span>
                        ) : (
                            <span className="text-orchid-violet">{b.noVacancy}</span>
                        )}
                    </Row>
                </div>

                {/* Seçilen yatak */}
                <div className="rounded-2xl bg-orchid-white/70 p-4">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-orchid-muted">{b.selected}</span>
                    <AnimatePresence mode="wait" initial={false}>
                        {selectedBed ? (
                            <motion.div
                                key={selectedBed.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center justify-between gap-3"
                            >
                                <span className="flex items-center gap-2 text-sm font-semibold text-orchid-dark">
                                    <Icon name="bed" filled className="text-[20px] text-orchid-pink" />
                                    {localized(selectedBed.flatName, locale)} · {localized(selectedBed.roomName, locale)} · {localized(selectedBed.bedLabel, locale)}
                                </span>
                                <button
                                    type="button"
                                    onClick={onClear}
                                    aria-label={b.clear}
                                    title={b.clear}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink transition-colors hover:bg-orchid-pink hover:text-white"
                                >
                                    <Icon name="close" className="text-[16px]" />
                                </button>
                            </motion.div>
                        ) : (
                            <motion.span
                                key="any"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-center gap-2 text-sm font-semibold text-orchid-dark"
                            >
                                <Icon name="shuffle" className="text-[20px] text-orchid-pink" />
                                {b.anyBed}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>

                {!hasFree && <p className="text-xs leading-relaxed text-orchid-muted">{b.noVacancyHint}</p>}

                <div className="flex flex-col gap-3">
                    <LocalizedLink
                        href={applyHref}
                        data-cursor={b.applyShort}
                        className="aurora-btn flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <span>{applyLabel}</span>
                        <Icon name="arrow_forward" className="text-[18px]" />
                    </LocalizedLink>
                    {ask && (
                        <a
                            href={ask}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-full items-center justify-center gap-2 rounded-full border border-orchid-petal/40 bg-white/70 px-6 py-3 text-sm font-semibold text-orchid-dark transition-colors hover:bg-white"
                        >
                            <Icon name="chat" filled className="text-[18px] text-[#25d366]" />
                            <span>{b.ask}</span>
                        </a>
                    )}
                </div>
            </aside>

            {/* Mobil: ekranın altında sabit çubuk (sağ tarafta WhatsApp butonuna yer bırakılır) */}
            <div className="glass-nav fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 rounded-t-3xl px-4 py-3 pr-24 lg:hidden">
                <div className="flex flex-col leading-tight">
                    <span className="font-display text-xl font-semibold text-orchid-pink">
                        {price} <span className="font-sans text-xs font-normal text-orchid-muted">{t.common.perMonth}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-orchid-muted">
                        {hasFree ? `${b.vacancy}: ${summary.free}` : b.noVacancy}
                    </span>
                </div>
                <LocalizedLink href={applyHref} className="aurora-btn rounded-full px-6 py-3 text-sm font-bold text-white">
                    {b.applyShort}
                </LocalizedLink>
            </div>
        </>
    );
}

