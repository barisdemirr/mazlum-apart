"use client";

import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import SafeImage from "@/components/ui/SafeImage";
import { APPLY_HREF } from "@/components/layout/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { formatPrice, rangeText } from "@/lib/format";
import { mediaAlt, mediaUrl } from "@/lib/media";

function Pill({ icon, children }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orchid-powder/70 px-3 py-1.5 text-[13px] font-medium text-orchid-muted">
            <Icon name={icon} className="text-[16px] text-orchid-pink" />
            {children}
        </span>
    );
}

/** Oda listesi kartı: fotoğraf üstünde başlık, altında özellikler, fiyat ve iki aksiyon */
export default function RoomListCard({ room }) {
    const { t, tpl, locale } = useLanguage();
    const name = localized(room.name, locale);
    const detailHref = `/odalar/${room.slug}`;
    const applyHref = `${APPLY_HREF}?oda=${encodeURIComponent(room.slug)}`;

    return (
        <article className="glass-card group flex h-full flex-col overflow-hidden rounded-[32px] shadow-[0_16px_40px_rgba(180,57,143,0.08)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_28px_60px_rgba(180,57,143,0.2)]">
            <LocalizedLink
                href={detailHref}
                data-cursor={t.roomsPage.details}
                aria-label={name}
                className="relative block aspect-[4/3] w-full overflow-hidden bg-orchid-powder"
            >
                <SafeImage
                    src={mediaUrl(room.image, "md")}
                    alt={mediaAlt(room.image, locale, name)}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-orchid-dark/80 via-orchid-dark/20 to-transparent" />

                {room.hasVideo && (
                    <>
                        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-orchid-pink shadow-sm backdrop-blur-md">
                            <Icon name="play_circle" filled className="text-[15px]" />
                            {t.rooms.video}
                        </span>
                        {/* Üzerine gelince oynat göstergesi */}
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-orchid-dark/25 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
                            <span className="flex h-16 w-16 scale-90 items-center justify-center rounded-full bg-white/95 text-orchid-pink shadow-[0_0_35px_rgba(255,255,255,0.8)] transition-transform duration-300 group-hover:scale-100">
                                <Icon name="play_arrow" filled className="ml-0.5 text-[34px]" />
                            </span>
                        </span>
                    </>
                )}

                {room.photoCount > 0 && (
                    <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                        <Icon name="photo_camera" className="text-[15px]" />
                        {tpl(t.rooms.photos, { count: room.photoCount })}
                    </span>
                )}

                <div className="absolute inset-x-5 bottom-5 flex flex-col items-start gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-orchid-petal/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                        <Icon name="check_circle" filled className="text-[13px]" />
                        {t.common.billsIncluded}
                    </span>
                    <h2 className="font-display text-2xl font-medium leading-tight text-white sm:text-[1.7rem]">{name}</h2>
                </div>
            </LocalizedLink>

            <div className="flex flex-1 flex-col justify-between gap-6 p-6">
                <div className="flex flex-wrap gap-2">
                    <Pill icon="groups">{tpl(t.rooms.peopleInFlat, { count: rangeText(room.peopleInFlat, room.peopleInFlatMax) })}</Pill>
                    <Pill icon="kitchen">{tpl(t.rooms.kitchen, { count: rangeText(room.peopleSharingKitchen, room.peopleSharingKitchenMax) })}</Pill>
                    <Pill icon="shower">{tpl(t.rooms.bathroom, { count: rangeText(room.peopleSharingBathroom, room.peopleSharingBathroomMax) })}</Pill>
                </div>

                <div className="flex flex-col gap-4 border-t border-orchid-petal/25 pt-5">
                    <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-orchid-muted">{t.rooms.monthlyPrice}</span>
                        <span className="font-display text-3xl font-bold text-orchid-pink">
                            {formatPrice(room.monthlyPrice, room.currency, locale)}{" "}
                            <span className="font-sans text-xs font-normal text-orchid-muted">{t.common.perMonth}</span>
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <LocalizedLink
                            href={detailHref}
                            className="rounded-full border border-orchid-petal/40 bg-white/70 py-3 text-center text-sm font-semibold text-orchid-dark transition-colors hover:border-orchid-pink hover:bg-white hover:text-orchid-pink"
                        >
                            {t.roomsPage.details}
                        </LocalizedLink>
                        <LocalizedLink
                            href={applyHref}
                            data-cursor={t.roomsPage.apply}
                            className="aurora-btn rounded-full py-3 text-center text-sm font-bold text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
                        >
                            {t.roomsPage.apply}
                        </LocalizedLink>
                    </div>
                </div>
            </div>
        </article>
    );
}
