"use client";

import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import SafeImage from "@/components/ui/SafeImage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { formatPrice } from "@/lib/format";
import { mediaAlt, mediaUrl } from "@/lib/media";

/** /odalar sayfasındaki daire kartı: kapak, ad, kısa açıklama, kişi/oda/boş yatak ve başlangıç fiyatı. Tıklayınca daire sayfası açılır. */
export default function ApartmentListCard({ apartment }) {
    const { t, tpl, locale } = useLanguage();
    const name = localized(apartment.name, locale);
    const description = apartment.description ? localized(apartment.description, locale) : "";
    const href = `/odalar/${apartment.roomTypeSlug}/${apartment.slug}`;
    const typeName = apartment.apartmentTypeName ? localized(apartment.apartmentTypeName, locale) : "";

    return (
        <article
            data-cursor={t.roomsPage.viewApartment}
            className="glass-card group relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-orchid-petal/40 shadow-[0_16px_40px_-12px_rgba(168,85,247,0.18)] transition-shadow duration-500 hover:shadow-[0_24px_50px_-12px_rgba(168,85,247,0.3)]"
        >
            <div>
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-orchid-powder">
                    <SafeImage
                        src={mediaUrl(apartment.cover, "md")}
                        alt={mediaAlt(apartment.cover, locale, name)}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {typeName && (
                        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-orchid-violet shadow-sm backdrop-blur-md">{typeName}</span>
                    )}
                    {apartment.hasVideo && (
                        <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-orchid-pink shadow-sm backdrop-blur-md">
                            <Icon name="play_circle" filled className="text-[15px]" />
                            {t.rooms.video}
                        </span>
                    )}
                </div>

                <div className="flex flex-col gap-4 p-5">
                    <h3 className="font-display text-xl font-medium text-orchid-dark sm:text-2xl">
                        <LocalizedLink href={href} className="after:absolute after:inset-0 after:content-['']">
                            {name}
                        </LocalizedLink>
                    </h3>

                    {description && <p className="line-clamp-4 text-sm leading-relaxed text-orchid-muted">{description}</p>}

                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-orchid-dark">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-orchid-powder/70 px-3 py-1.5">
                            <Icon name="groups" className="text-[16px] text-orchid-pink" />
                            {tpl(t.rooms.peopleInFlat, { count: apartment.peopleInFlat })}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-orchid-powder/70 px-3 py-1.5">
                            <Icon name="meeting_room" className="text-[16px] text-orchid-pink" />
                            {tpl(t.roomsPage.roomCount, { count: apartment.roomCount })}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-orchid-powder/70 px-3 py-1.5">
                            <Icon name="bed" className="text-[16px] text-orchid-pink" />
                            {apartment.bedsFree > 0 ? tpl(t.rooms.typeFree, { count: apartment.bedsFree }) : t.rooms.typeFull}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between border-t border-orchid-petal/20 p-5">
                <div>
                    {apartment.monthlyPriceFrom != null && (
                        <>
                            <span className="block text-xs uppercase tracking-wider text-orchid-muted">{t.rooms.priceFrom}</span>
                            <span className="font-display text-lg font-bold text-orchid-pink sm:text-xl">
                                {formatPrice(apartment.monthlyPriceFrom, apartment.currency, locale)}{" "}
                                <span className="font-sans text-xs font-normal text-orchid-muted">{t.common.perMonth}</span>
                            </span>
                        </>
                    )}
                </div>
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-orchid-dark text-white shadow-md transition-all duration-300 group-hover:bg-orchid-pink">
                    <Icon name="arrow_forward" className="text-[20px]" />
                </span>
            </div>
        </article>
    );
}
