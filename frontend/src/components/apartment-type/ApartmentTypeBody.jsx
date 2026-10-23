"use client";

import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import SafeImage from "@/components/ui/SafeImage";
import { priceRange } from "@/components/home/ApartmentTypeCard";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { formatPrice, rangeText } from "@/lib/format";
import { mediaAlt, mediaUrl } from "@/lib/media";
import { APPLY_HREF } from "@/components/layout/navigation";

const paragraphs = (list, locale) => (list?.[locale]?.length ? list[locale] : list?.tr) ?? [];

/**
 * Daire türü sayfası: türün tanıtımı + oda seçenekleri. Her seçeneğin kendi fiyatı vardır (balkonlu/balkonsuz, zemin/üst kat...).
 * Öğrenci seçeneği seçer: odaları ve yatakları görüp (oda sayfası) ya da doğrudan başvurur (başvuru formu o seçenekle açılır).
 */
export default function ApartmentTypeBody({ type }) {
    const { t, tpl, locale } = useLanguage();
    const p = t.typePage;
    const name = localized(type.name, locale);
    const text = paragraphs(type.description, locale);

    return (
        <>
            <section className="relative mx-auto w-full max-w-7xl px-4 pt-24 sm:px-8 sm:pt-28 lg:px-12">
                <nav aria-label="breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-orchid-muted">
                    <LocalizedLink href="/" className="transition-colors hover:text-orchid-pink">{t.nav.home}</LocalizedLink>
                    <span className="text-orchid-petal">/</span>
                    <LocalizedLink href="/odalar" className="transition-colors hover:text-orchid-pink">{t.nav.rooms}</LocalizedLink>
                    <span className="text-orchid-petal">/</span>
                    <span className="font-semibold text-orchid-pink" aria-current="page">{name}</span>
                </nav>

                <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-[28px] bg-orchid-powder shadow-[0_16px_40px_rgba(180,57,143,0.12)]">
                        <SafeImage src={mediaUrl(type.image, "lg")} alt={mediaAlt(type.image, locale, name)} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-4">
                        <span className="text-xs font-bold uppercase tracking-[0.25em] text-orchid-pink">{p.eyebrow}</span>
                        <h1 className="font-display text-4xl font-normal tracking-tight text-orchid-dark sm:text-5xl">{name}</h1>
                        {text.map((para, i) => <p key={i} className="whitespace-pre-line text-base text-orchid-muted">{para}</p>)}
                        <div className="flex flex-wrap gap-2 text-xs font-bold">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-orchid-powder px-3 py-1.5 text-orchid-pink"><Icon name="check_circle" filled className="text-[15px]" />{t.common.billsIncluded}</span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-orchid-muted"><Icon name="bed" className="text-[15px]" />{type.bedsFree > 0 ? tpl(p.free, { count: type.bedsFree }) : p.full}</span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-orchid-muted"><Icon name="payments" className="text-[15px]" />{priceRange(type.monthlyPriceFrom, type.monthlyPriceTo, type.currency, locale)} {t.common.perMonth}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-8 lg:px-12">
                <Reveal className="mb-6 flex flex-col gap-2">
                    <h2 className="font-display text-3xl font-normal text-orchid-dark sm:text-4xl">{p.optionsTitle}</h2>
                    <p className="max-w-2xl text-sm text-orchid-muted">{p.optionsSubtitle}</p>
                </Reveal>

                {type.options.length === 0 ? <p className="text-orchid-muted">{p.noOptions}</p> : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {type.options.map((o) => {
                            const oName = localized(o.name, locale);
                            const hasFree = o.bedsFree > 0;
                            return (
                                <article key={o.id} className={`glass-card flex flex-col overflow-hidden rounded-[28px] ${hasFree ? "shadow-[0_16px_40px_rgba(180,57,143,0.08)]" : "opacity-75"}`}>
                                    <LocalizedLink href={`/odalar/${o.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-orchid-powder" aria-label={oName}>
                                        <SafeImage src={mediaUrl(o.image, "md")} alt={mediaAlt(o.image, locale, oName)} loading="lazy" className="h-full w-full object-cover" />
                                        {!hasFree && <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">{p.full}</span>}
                                    </LocalizedLink>
                                    <div className="flex flex-1 flex-col gap-3 p-5">
                                        <h3 className="font-display text-xl font-medium text-orchid-dark sm:text-2xl">{oName}</h3>
                                        <div className="flex flex-wrap gap-2 text-xs font-semibold text-orchid-muted">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-orchid-powder/70 px-3 py-1 text-orchid-pink"><Icon name="bed" filled className="text-[14px]" />{hasFree ? tpl(p.free, { count: o.bedsFree }) : p.full}</span>
                                            {o.peopleInFlat != null && <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1"><Icon name="group" className="text-[14px]" />{tpl(p.inFlat, { count: rangeText(o.peopleInFlat, o.peopleInFlatMax) })}</span>}
                                        </div>
                                        <div className="mt-auto pt-2">
                                            <span className="block font-display text-2xl font-bold text-orchid-pink">
                                                {formatPrice(o.monthlyPrice, o.currency, locale)} <span className="font-sans text-xs font-normal text-orchid-muted">{t.common.perMonth}</span>
                                            </span>
                                            {o.depositAmount != null && <span className="text-xs text-orchid-muted">{p.deposit}: {formatPrice(o.depositAmount, o.currency, locale)}</span>}
                                        </div>
                                        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                                            <LocalizedLink href={`${APPLY_HREF}?oda=${o.slug}`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-orchid-pink px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-95">
                                                {p.apply}
                                            </LocalizedLink>
                                            <LocalizedLink href={`/odalar/${o.slug}`} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-orchid-petal/60 bg-white/80 px-4 py-3 text-sm font-bold text-orchid-dark transition-colors hover:bg-white">
                                                {p.viewRooms}
                                            </LocalizedLink>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </>
    );
}
