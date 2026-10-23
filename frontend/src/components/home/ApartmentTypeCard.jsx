"use client";

import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import SafeImage from "@/components/ui/SafeImage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { formatPrice } from "@/lib/format";
import { mediaAlt, mediaUrl } from "@/lib/media";

/** "₺9.500" ya da seçeneklerin fiyatı farklıysa "₺9.500 – ₺12.000" */
export function priceRange(from, to, currency, locale) {
    if (from == null) return "";
    return to == null || to === from ? formatPrice(from, currency, locale) : `${formatPrice(from, currency, locale)} – ${formatPrice(to, currency, locale)}`;
}

/** Ana sayfadaki daire türü kartı: tür adı, daire/oda sayısı, fiyat aralığı. Tıklayınca türün oda seçenekleri açılır. */
export default function ApartmentTypeCard({ type }) {
    const { t, tpl, locale } = useLanguage();
    const name = localized(type.name, locale);
    const href = `/daire-turleri/${type.slug}`;

    return (
        <article
            data-cursor={t.rooms.typeView}
            className="glass-card group relative flex min-w-[300px] max-w-[320px] snap-center flex-col justify-between overflow-hidden rounded-[28px] border border-orchid-petal/40 shadow-[0_16px_40px_rgba(180,57,143,0.08)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_24px_55px_rgba(180,57,143,0.18)] lg:min-w-[320px]"
        >
            <div>
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-orchid-powder">
                    <SafeImage
                        src={mediaUrl(type.image, "md")}
                        alt={mediaAlt(type.image, locale, name)}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {type.hasVideo && (
                        <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-orchid-pink shadow-sm backdrop-blur-md">
                            <Icon name="play_circle" filled className="text-[15px]" />
                            <span>{t.rooms.video}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4 p-5">
                    <div className="border-b border-orchid-petal/20 pb-3">
                        <h3 className="font-display text-xl font-medium text-orchid-dark sm:text-2xl">
                            <LocalizedLink href={href} className="after:absolute after:inset-0 after:content-['']">
                                {name}
                            </LocalizedLink>
                        </h3>
                    </div>

                    <div className="flex flex-col gap-2 text-[13px] text-orchid-muted">
                        <span className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orchid-powder/70 text-orchid-pink"><Icon name="meeting_room" className="text-[18px]" /></span>
                            {tpl(t.rooms.optionCount, { count: type.options.length })}
                        </span>
                        <span className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orchid-powder/70 text-orchid-pink"><Icon name="bed" className="text-[18px]" /></span>
                            {type.bedsFree > 0 ? tpl(t.rooms.typeFree, { count: type.bedsFree }) : t.rooms.typeFull}
                        </span>
                    </div>

                    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-orchid-powder/60 px-3 py-1.5 text-xs font-bold text-orchid-pink">
                        <Icon name="check_circle" filled className="text-[16px]" />
                        <span>{t.common.billsIncluded}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between border-t border-orchid-petal/20 p-5">
                <div>
                    <span className="block text-xs uppercase tracking-wider text-orchid-muted">{t.rooms.priceFrom}</span>
                    <span className="font-display text-lg font-bold text-orchid-pink sm:text-xl">
                        {priceRange(type.monthlyPriceFrom, type.monthlyPriceTo, type.currency, locale)}{" "}
                        <span className="font-sans text-xs font-normal text-orchid-muted">{t.common.perMonth}</span>
                    </span>
                </div>
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-orchid-dark text-white shadow-md transition-all duration-300 group-hover:bg-orchid-pink group-hover:translate-x-1">
                    <Icon name="arrow_forward" className="text-[20px]" />
                </span>
            </div>
        </article>
    );
}
