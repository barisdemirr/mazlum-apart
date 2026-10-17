"use client";

import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import SafeImage from "@/components/ui/SafeImage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { mediaUrl } from "@/lib/media";

/**
 * Oda TİPİ sayfasındaki oda kartı. Birim DAİRE değil ODAdır: bir dairede farklı tiplerde odalar olabilir,
 * bu yüzden tipe ait her oda kendi fotoğrafı ve boş yatak bilgisiyle listelenir; kart bulunduğu daireye gider.
 */
function RoomCard({ room, typeSlug }) {
    const { t, tpl, locale } = useLanguage();
    const r = t.roomDetail.rooms;
    const name = localized(room.name, locale);
    const apartmentName = localized(room.apartmentName, locale);
    // ?oda=<id>: daire sayfası bu odanın boş yatağını otomatik seçer
    const hasFree = room.bedsFree > 0;
    // Dolu odada ön seçim yapılmaz; daire sayfası yine açılır (aynı dairede başka boş oda olabilir)
    const href = `/odalar/${typeSlug}/${room.apartmentSlug}${hasFree ? `?oda=${room.id}` : ""}`;
    const features = (room.features ?? []).slice(0, 3);

    return (
        <article className={`glass-card group flex h-full flex-col overflow-hidden rounded-[28px] transition-all duration-500 ${hasFree ? "shadow-[0_16px_40px_rgba(180,57,143,0.08)] hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(180,57,143,0.2)]" : "opacity-70 grayscale"}`}>
            <LocalizedLink href={href} aria-label={`${name} · ${apartmentName}`} className="relative block aspect-[4/3] w-full overflow-hidden bg-orchid-powder">
                <SafeImage src={room.cover ? mediaUrl(room.cover, "md") : null} alt={`${name} · ${apartmentName}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-orchid-dark/70 via-transparent to-transparent" />
                {!hasFree && (
                    <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">{r.full}</span>
                )}
                {room.photoCount > 0 && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white">
                        <Icon name="photo_camera" className="text-[14px]" />
                        {tpl(r.photos, { count: room.photoCount })}
                    </span>
                )}
                <span className="absolute inset-x-4 bottom-3 flex flex-col text-white">
                    <span className="font-display text-2xl font-semibold leading-tight">{name}</span>
                    <span className="text-xs font-semibold text-white/90">{tpl(r.inFlat, { flat: apartmentName, floor: room.floor })}</span>
                </span>
            </LocalizedLink>
            <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${hasFree ? "bg-orchid-powder text-orchid-pink" : "bg-orchid-lilac/60 text-orchid-muted"}`}>
                        <Icon name="bed" filled className="text-[15px]" />
                        {hasFree ? tpl(r.free, { count: room.bedsFree }) : r.full}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-orchid-muted">
                        <Icon name="person" className="text-[14px]" />
                        {tpl(r.beds, { count: room.beds })}
                    </span>
                </div>
                {features.length > 0 && (
                    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-orchid-muted">
                        {features.map((feature, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                                {feature.icon && <Icon name={feature.icon} className="text-[16px] text-orchid-pink" />}
                                {localized(feature.text, locale)}
                            </li>
                        ))}
                    </ul>
                )}
                <p className="text-[13px] text-orchid-muted">{tpl(r.people, { count: room.peopleInFlat })}</p>
                <LocalizedLink href={href} className="mt-auto flex items-center gap-1 pt-1 text-sm font-bold text-orchid-pink hover:underline">
                    {r.view}
                    <Icon name="arrow_forward" className="text-[18px]" />
                </LocalizedLink>
            </div>
        </article>
    );
}

/** Oda tipi sayfasındaki oda listesi */
export default function RoomCards({ rooms, typeSlug }) {
    const { t } = useLanguage();
    const r = t.roomDetail.rooms;
    return (
        <section id="odalar" className="scroll-mt-24">
            <Reveal className="mb-6">
                <span className="mb-1 block text-xs font-bold uppercase tracking-[0.25em] text-orchid-pink">{r.eyebrow}</span>
                <h2 className="font-display text-3xl font-normal tracking-tight text-orchid-dark sm:text-4xl">{r.title}</h2>
                <p className="mt-2 max-w-2xl text-sm text-orchid-muted sm:text-base">{r.subtitle}</p>
            </Reveal>
            {rooms.length === 0 ? (
                <p className="glass-card rounded-3xl p-8 text-center text-sm text-orchid-muted">{r.empty}</p>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {rooms.map((room) => (
                        <Reveal key={room.id}>
                            <RoomCard room={room} typeSlug={typeSlug} />
                        </Reveal>
                    ))}
                </div>
            )}
        </section>
    );
}
