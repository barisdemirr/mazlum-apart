"use client";

import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import SafeImage from "@/components/ui/SafeImage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { formatPrice, rangeText } from "@/lib/format";
import { mediaAlt, mediaUrl } from "@/lib/media";

function Feature({ icon, text }) {
    return (
        <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orchid-powder/70 text-orchid-pink">
                <Icon name={icon} className="text-[18px]" />
            </span>
            <span>{text}</span>
        </div>
    );
}

/** Dergi kapağı tarzı oda tipi kartı. Tüm kart, başlıktaki "esnetilmiş" bağlantı sayesinde tıklanabilir. */
export default function RoomCard({ room }) {
    const { t, tpl, locale } = useLanguage();
    const name = localized(room.name, locale);
    const href = `/odalar/${room.slug}`;

    return (
        <article
            data-cursor={t.rooms.view}
            className="glass-card group relative flex min-w-[300px] snap-center flex-col justify-between overflow-hidden rounded-[28px] border border-orchid-petal/40 shadow-[0_16px_40px_rgba(180,57,143,0.08)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_24px_55px_rgba(180,57,143,0.18)] sm:min-w-[300px] lg:min-w-[320px] max-w-[320px]"
        >
            <div>
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-orchid-powder">
                    <SafeImage
                        src={mediaUrl(room.image, "md")}
                        alt={mediaAlt(room.image, locale, name)}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {room.hasVideo && (
                        <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-orchid-pink shadow-sm backdrop-blur-md">
                            <Icon name="play_circle" filled className="text-[15px]" />
                            <span>{t.rooms.video}</span>
                        </div>
                    )}
                    {room.photoCount > 0 && (
                        <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                            <Icon name="photo_camera" className="text-[15px]" />
                            <span>{tpl(t.rooms.photos, { count: room.photoCount })}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4 p-5">
                    <div className="border-b border-orchid-petal/20 pb-3">
                        <h3 className="font-display text-xl font-medium text-orchid-dark sm:text-2xl">
                            {/* after:absolute inset-0 -> kartın tamamı bu bağlantıya tıklar */}
                            <LocalizedLink href={href} className="after:absolute after:inset-0 after:content-['']">
                                {name}
                            </LocalizedLink>
                        </h3>
                    </div>

                    <div className="flex flex-col gap-2 text-[13px] text-orchid-muted">
                        <Feature icon="group" text={tpl(t.rooms.peopleInFlat, { count: rangeText(room.peopleInFlat, room.peopleInFlatMax) })} />
                        <Feature icon="kitchen" text={tpl(t.rooms.kitchen, { count: rangeText(room.peopleSharingKitchen, room.peopleSharingKitchenMax) })} />
                        <Feature icon="shower" text={tpl(t.rooms.bathroom, { count: rangeText(room.peopleSharingBathroom, room.peopleSharingBathroomMax) })} />
                    </div>

                    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-orchid-powder/60 px-3 py-1.5 text-xs font-bold text-orchid-pink">
                        <Icon name="check_circle" filled className="text-[16px]" />
                        <span>{t.common.billsIncluded}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between border-t border-orchid-petal/20 p-5">
                <div>
                    <span className="block text-xs uppercase tracking-wider text-orchid-muted">{t.rooms.monthlyPrice}</span>
                    <span className="font-display text-xl font-bold text-orchid-pink sm:text-2xl">
                        {formatPrice(room.monthlyPrice, room.currency, locale)}{" "}
                        <span className="font-sans text-xs font-normal text-orchid-muted">{t.common.perMonth}</span>
                    </span>
                </div>
                <span
                    aria-hidden="true"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-orchid-dark text-white shadow-md transition-all duration-300 group-hover:bg-orchid-pink group-hover:translate-x-1"
                >
                    <Icon name="arrow_forward" className="text-[20px]" />
                </span>
            </div>
        </article>
    );
}
