"use client";

import Icon from "@/components/ui/Icon";
import CountUp from "@/components/ui/CountUp";
import Reveal from "@/components/ui/Reveal";
import SpotlightCard from "@/components/ui/SpotlightCard";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";

function Heading({ eyebrow, title }) {
    return (
        <div className="mb-6">
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.25em] text-orchid-pink">{eyebrow}</span>
            <h2 className="font-display text-3xl font-medium text-orchid-dark">{title}</h2>
        </div>
    );
}

const listOf = (field, locale) => {
    const value = field?.[locale]?.length ? field[locale] : field?.tr;
    return Array.isArray(value) ? value : [];
};

/** Dairede / mutfakta / banyoda kaç kişi: üç büyük sayaç */
export function LivingPlan({ room }) {
    const { t, tpl } = useLanguage();
    const l = t.roomDetail.living;
    const items = [
        { icon: "groups", value: room.peopleInFlat, title: l.peopleTitle, text: l.peopleText, tone: "text-orchid-pink bg-orchid-powder" },
        { icon: "kitchen", value: room.peopleSharingKitchen, title: l.kitchenTitle, text: l.kitchenText, tone: "text-orchid-violet bg-orchid-lilac" },
        { icon: "shower", value: room.peopleSharingBathroom, title: l.bathroomTitle, text: l.bathroomText, tone: "text-orchid-pink bg-orchid-powder" },
    ];

    return (
        <Reveal className="rounded-[32px] border border-orchid-petal/30 bg-gradient-to-br from-orchid-powder/60 via-orchid-lilac/40 to-orchid-white p-6 sm:p-8 lg:p-10">
            <Heading eyebrow={l.eyebrow} title={l.title} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {items.map((item) => (
                    <div key={item.icon} className="glass-card flex flex-col items-center rounded-3xl p-5 text-center">
                        <span className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${item.tone}`}>
                            <Icon name={item.icon} className="text-[24px]" />
                        </span>
                        <CountUp to={item.value} className="font-display text-5xl font-semibold leading-none text-orchid-pink" />
                        <span className="mt-2 text-sm font-bold text-orchid-dark">{tpl(item.title, { count: item.value })}</span>
                        <p className="mt-1 text-xs text-orchid-muted">{tpl(item.text, { count: item.value })}</p>
                    </div>
                ))}
            </div>
        </Reveal>
    );
}

/** Panelden girilen açıklama paragrafları (yoksa bölüm çizilmez) */
export function About({ room }) {
    const { t, locale } = useLanguage();
    const paragraphs = listOf(room.description, locale);
    if (paragraphs.length === 0) return null;

    return (
        <Reveal className="glass-card rounded-[32px] p-6 sm:p-8 lg:p-10">
            <Heading eyebrow={t.roomDetail.about.eyebrow} title={t.roomDetail.about.title} />
            <div className="flex flex-col gap-4 text-base leading-relaxed text-orchid-muted">
                {paragraphs.map((text, i) => (
                    <p key={i}>{text}</p>
                ))}
            </div>
        </Reveal>
    );
}

/**
 * Daire sayfası: her odanın kendi donanımı + dairenin ortak kullanım alanları.
 * Oda özellikleri ODAYA, ortak alanlar DAİREYE aittir; dolu olanlar görünür, boşlar gizlenir.
 */
export function RoomsAndAreas({ rooms = [], sharedAreas = [] }) {
    const { t, tpl, locale } = useLanguage();
    const f = t.roomDetail.features;
    const textOf = (item) => localized(item.text, locale);
    const withFeatures = rooms.filter((room) => (room.features ?? []).length > 0);
    if (withFeatures.length === 0 && sharedAreas.length === 0) return null;

    return (
        <Reveal className="glass-card rounded-[32px] p-6 sm:p-8 lg:p-10">
            <Heading eyebrow={f.eyebrow} title={f.title} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {withFeatures.map((room) => (
                    <SpotlightCard key={room.id} className="rounded-3xl p-5">
                        <div>
                            <div className="mb-3 flex items-center gap-2.5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink">
                                    <Icon name="bed" className="text-[18px]" />
                                </span>
                                <div>
                                    <h3 className="font-display text-lg font-medium italic text-orchid-dark">{localized(room.name, locale)}</h3>
                                    {room.bedCount > 0 && <span className="text-xs text-orchid-muted">{tpl(f.roomBeds, { count: room.bedCount })}</span>}
                                </div>
                            </div>
                            <ul className="flex flex-col gap-2 text-sm text-orchid-muted">
                                {room.features.map((item, i) => (
                                    <li key={i} className="flex items-center gap-2.5">
                                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orchid-pink" />
                                        {textOf(item)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </SpotlightCard>
                ))}
                {sharedAreas.length > 0 && (
                    <SpotlightCard className="rounded-3xl p-5">
                        <div>
                            <div className="mb-3 flex items-center gap-2.5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orchid-lilac text-orchid-violet">
                                    <Icon name="countertops" className="text-[18px]" />
                                </span>
                                <h3 className="font-display text-lg font-medium italic text-orchid-dark">{f.sharedAreas}</h3>
                            </div>
                            <ul className="flex flex-col gap-2 text-sm text-orchid-muted">
                                {sharedAreas.map((item, i) => (
                                    <li key={i} className="flex items-center gap-2.5">
                                        <Icon name={item.icon || "check_circle"} className="text-[16px] text-orchid-violet" />
                                        {textOf(item)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </SpotlightCard>
                )}
            </div>
        </Reveal>
    );
}

/** "Tüm faturalar fiyata dahil" bandı; panelden girilmiş dahil hizmetler varsa listeler */
export function Included({ room }) {
    const { t, locale } = useLanguage();
    const inc = t.roomDetail.included;
    const items = listOf(room.includedServices, locale);

    return (
        <Reveal className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-orchid-dark via-orchid-violet to-orchid-pink p-6 text-white shadow-xl sm:p-8 lg:p-10">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 soft-blob animate-blob" />
            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div>
                    <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.25em] text-orchid-petal">
                        <Icon name="all_inclusive" className="text-[16px]" />
                        {inc.eyebrow}
                    </span>
                    <h2 className="font-display text-3xl font-normal">{inc.title}</h2>
                    <p className="mt-2 max-w-lg text-sm text-orchid-lilac">{inc.text}</p>
                </div>
                {items.length > 0 && (
                    <ul className="flex flex-col gap-2">
                        {items.map((item) => (
                            <li key={item} className="flex items-center gap-2.5 rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold backdrop-blur-md">
                                <Icon name="check" className="text-[18px] text-orchid-petal" />
                                {item}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Reveal>
    );
}

/** Dönem, kayıt, ödeme günü, yaz sezonu: müşterinin belirlediği kurallar */
export function Terms() {
    const { t, tpl } = useLanguage();
    const x = t.roomDetail.terms;
    const items = [
        { icon: "event", title: x.term.title, text: tpl(x.term.text, { term: t.common.term }) },
        { icon: "payments", title: x.registration.title, text: x.registration.text },
        { icon: "calendar_month", title: x.payday.title, text: x.payday.text },
        { icon: "wb_sunny", title: x.summer.title, text: x.summer.text },
    ];

    return (
        <Reveal className="glass-card rounded-[32px] p-6 sm:p-8 lg:p-10">
            <Heading eyebrow={x.eyebrow} title={x.title} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {items.map((item) => (
                    <div key={item.icon} className="flex items-start gap-4 rounded-3xl bg-orchid-white/70 p-5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orchid-powder text-orchid-pink">
                            <Icon name={item.icon} className="text-[22px]" />
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-orchid-dark">{item.title}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-orchid-muted">{item.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Reveal>
    );
}

