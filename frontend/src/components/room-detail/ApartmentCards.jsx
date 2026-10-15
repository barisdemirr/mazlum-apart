"use client";

import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import SafeImage from "@/components/ui/SafeImage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { mediaUrl } from "@/lib/media";

/** Bir daire kartı: kapak, boş yatak, kişi sayıları; daire sayfasına gider. */
export function ApartmentCard({ apartment, typeSlug }) {
    const { t, tpl, locale } = useLanguage();
    const a = t.roomDetail.apartments;
    const name = localized(apartment.name, locale);
    const href = `/odalar/${typeSlug}/${apartment.slug}`;
    const hasFree = apartment.bedsFree > 0;

    return (
        <article className="glass-card group flex h-full flex-col overflow-hidden rounded-[28px] shadow-[0_16px_40px_rgba(180,57,143,0.08)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(180,57,143,0.2)]" data-apartment-card={apartment.slug}>
            <LocalizedLink href={href} aria-label={name} className="relative block aspect-[4/3] w-full overflow-hidden bg-orchid-powder">
                <SafeImage src={apartment.cover ? mediaUrl(apartment.cover, "md") : null} alt={name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-orchid-dark/70 via-transparent to-transparent" />
                {apartment.hasVideo && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-orchid-pink shadow-sm">
                        <Icon name="play_circle" filled className="text-[15px]" />
                        {a.video}
                    </span>
                )}
                {apartment.photoCount > 0 && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white">
                        <Icon name="photo_camera" className="text-[14px]" />
                        {tpl(a.photos, { count: apartment.photoCount })}
                    </span>
                )}
                <span className="absolute inset-x-4 bottom-3 flex items-end justify-between text-white">
                    <span className="font-display text-2xl font-semibold leading-none">{name}</span>
                    {apartment.floor > 0 && <span className="text-xs font-semibold">{tpl(a.floor, { floor: apartment.floor })}</span>}
                </span>
            </LocalizedLink>
            <div className="flex flex-1 flex-col gap-3 p-5">
                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${hasFree ? "bg-orchid-powder text-orchid-pink" : "bg-orchid-lilac/60 text-orchid-muted"}`}>
                    <Icon name="bed" filled className="text-[15px]" />
                    {hasFree ? tpl(a.free, { count: apartment.bedsFree }) : a.full}
                </span>
                <ul className="space-y-1 text-[13px] text-orchid-muted">
                    <li className="flex items-center gap-2"><Icon name="groups" className="text-[16px] text-orchid-pink" />{tpl(a.people, { count: apartment.peopleInFlat })}</li>
                    <li className="flex items-center gap-2"><Icon name="kitchen" className="text-[16px] text-orchid-pink" />{tpl(a.kitchen, { count: apartment.peopleSharingKitchen })}</li>
                    <li className="flex items-center gap-2"><Icon name="shower" className="text-[16px] text-orchid-pink" />{tpl(a.bathroom, { count: apartment.peopleSharingBathroom })}</li>
                </ul>
                <LocalizedLink href={href} className="mt-auto flex items-center gap-1 pt-1 text-sm font-bold text-orchid-pink hover:underline">
                    {a.view}
                    <Icon name="arrow_forward" className="text-[18px]" />
                </LocalizedLink>
            </div>
        </article>
    );
}

/** Oda tipi sayfasındaki daire listesi (ya da daire sayfasında "diğer daireler") */
export default function ApartmentCards({ apartments, typeSlug, eyebrow, title, subtitle }) {
    const { t } = useLanguage();
    const a = t.roomDetail.apartments;
    return (
        <section id="daireler" className="scroll-mt-24">
            <Reveal className="mb-6">
                <span className="mb-1 block text-xs font-bold uppercase tracking-[0.25em] text-orchid-pink">{eyebrow ?? a.eyebrow}</span>
                <h2 className="font-display text-3xl font-normal tracking-tight text-orchid-dark sm:text-4xl">{title ?? a.title}</h2>
                {subtitle !== null && <p className="mt-2 max-w-2xl text-sm text-orchid-muted sm:text-base">{subtitle ?? a.subtitle}</p>}
            </Reveal>
            {apartments.length === 0 ? (
                <p className="glass-card rounded-3xl p-8 text-center text-sm text-orchid-muted">{a.empty}</p>
            ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {apartments.map((apartment) => (
                        <Reveal key={apartment.id}>
                            <ApartmentCard apartment={apartment} typeSlug={typeSlug} />
                        </Reveal>
                    ))}
                </div>
            )}
        </section>
    );
}
