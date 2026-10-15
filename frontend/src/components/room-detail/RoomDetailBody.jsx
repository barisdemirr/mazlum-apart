"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import RoomListCard from "@/components/rooms/RoomListCard";
import MediaGallery from "./MediaGallery";
import AvailabilityPicker from "./AvailabilityPicker";
import BookingCard, { buildApplyHref } from "./BookingCard";
import { About, Features, Included, LivingPlan, Terms } from "./DetailSections";
import { summarizeAvailability } from "@/lib/availability";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { formatPrice } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";

/**
 * Oda tipi detay sayfasının içeriği. Yatak seçimi hem seçiciyi hem de
 * sağdaki başvuru kartını etkilediği için burada, ortak durumda tutulur.
 */
export default function RoomDetailBody({ room, availability, otherRooms }) {
    const { t, tpl, locale } = useLanguage();
    const [selectedBed, setSelectedBed] = useState(null); // { id, bedLabel, roomName, flatName } | null = yatak fark etmez
    const summary = useMemo(() => summarizeAvailability(availability), [availability]);

    // Fotoğraf–oda eşleşmesi: doluluk ekranında bir odanın "fotoğraflar" düğmesi galeriyi o odanın etiketine süzer
    const [galleryFilter, setGalleryFilter] = useState("all");
    const photoKeys = useMemo(() => new Set((room.gallery ?? []).filter((item) => item.type === "image" && item.tag).map((item) => item.tag.key)), [room.gallery]);
    const showRoomPhotos = useCallback((tagKey) => {
        setGalleryFilter(tagKey);
        document.getElementById("galeri")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, []);

    const name = localized(room.name, locale);
    const lead =
        listFirst(room.description, locale) ||
        tpl(t.roomDetail.summaryFallback, {
            flat: room.peopleInFlat,
            kitchen: room.peopleSharingKitchen,
            bathroom: room.peopleSharingBathroom,
        });

    return (
        <>
            {/* ───────── Üst: breadcrumb + medya (ilk izlenim) ───────── */}
            <section className="relative mx-auto w-full max-w-7xl px-4 pt-24 sm:px-8 sm:pt-28 lg:px-12">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute -top-24 left-1/3 h-[420px] w-[620px] max-w-full rounded-full bg-gradient-to-tr from-orchid-petal/35 via-orchid-lilac/55 to-orchid-powder/40 soft-blob animate-blob" />
                    <div className="absolute right-0 top-40 h-[360px] w-[360px] rounded-full bg-orchid-lilac/60 soft-blob animate-blob [animation-delay:6s]" />
                </div>

                <motion.nav
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5, ease: EASE_OUT }}
                    aria-label="breadcrumb"
                    className="mb-3 flex flex-wrap items-center gap-2 text-sm text-orchid-muted sm:mb-4"
                >
                    <LocalizedLink href="/" className="transition-colors hover:text-orchid-pink">
                        {t.nav.home}
                    </LocalizedLink>
                    <span className="text-orchid-petal">/</span>
                    <LocalizedLink href="/odalar" className="transition-colors hover:text-orchid-pink">
                        {t.nav.rooms}
                    </LocalizedLink>
                    <span className="text-orchid-petal">/</span>
                    <span className="font-semibold text-orchid-pink" aria-current="page">
                        {name}
                    </span>
                </motion.nav>

                <motion.div
                    id="galeri"
                    initial={{ opacity: 0, scale: 0.97, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.9, delay: 0.55, ease: EASE_OUT }}
                    className="scroll-mt-24"
                >
                    <MediaGallery items={room.gallery ?? []} roomName={name} filter={galleryFilter} onFilterChange={setGalleryFilter} />
                </motion.div>
            </section>

            {/* ───────── Başlık: rozetler, ad, fiyat, hızlı başvuru ───────── */}
            <section className="mx-auto w-full max-w-7xl px-4 pb-4 pt-6 sm:px-8 sm:pt-8 lg:px-12">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.95, ease: EASE_OUT }}
                            className="mb-4 flex flex-wrap items-center gap-2"
                        >
                            <span className="glass-card inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-orchid-pink">
                                <Icon name="female" filled className="text-[16px]" />
                                {t.common.girlsOnly}
                            </span>
                            <span className="glass-card inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-orchid-violet">
                                <Icon name="verified" filled className="text-[16px]" />
                                {t.common.billsIncluded}
                            </span>
                            <span className="glass-card inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-orchid-dark">
                                {summary.free > 0 ? (
                                    <>
                                        <span className="relative flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-orchid-pink opacity-75 animate-ping" />
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-orchid-pink" />
                                        </span>
                                        {tpl(t.roomDetail.availability.summary, { total: summary.total, free: summary.free })}
                                    </>
                                ) : (
                                    t.roomDetail.availability.summaryNone
                                )}
                            </span>
                        </motion.div>

                        <h1 className="overflow-hidden pb-2 font-display text-4xl font-medium leading-tight tracking-tight text-orchid-dark sm:text-5xl md:text-6xl">
                            <motion.span
                                initial={{ y: "110%" }}
                                animate={{ y: 0 }}
                                transition={{ duration: 0.9, delay: 1, ease: EASE_OUT }}
                                className="inline-block"
                            >
                                {name}
                            </motion.span>
                        </h1>
                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 1.1, ease: EASE_OUT }}
                            className="mt-2 max-w-2xl text-base text-orchid-muted sm:text-lg"
                        >
                            {lead}
                        </motion.p>
                    </div>

                    {/* Fiyat + (mobilde) hemen başvur: sayfaya giren kişi ilk ekranda kirala diyebilsin */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1.15, ease: EASE_OUT }}
                        className="glass-card flex items-center justify-between gap-4 rounded-3xl px-5 py-4 md:justify-start"
                    >
                        <div>
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-orchid-muted">{t.roomDetail.priceLabel}</span>
                            <span className="font-display text-3xl font-semibold leading-none text-orchid-pink">
                                {formatPrice(room.monthlyPrice, room.currency, locale)}{" "}
                                <span className="font-sans text-xs font-normal text-orchid-muted">{t.common.perMonth}</span>
                            </span>
                        </div>
                        <LocalizedLink
                            href={buildApplyHref(room.slug, null)}
                            className="aurora-btn flex items-center gap-1.5 rounded-full px-5 py-3 text-sm font-bold text-white transition-transform active:scale-[0.97] lg:hidden"
                        >
                            {t.roomDetail.booking.applyShort}
                            <Icon name="arrow_forward" className="text-[18px]" />
                        </LocalizedLink>
                    </motion.div>
                </div>
            </section>

            {/* ───────── İçerik + başvuru kartı ───────── */}
            <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-8 lg:px-12">
                <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                    <div className="flex min-w-0 flex-col gap-8 lg:col-span-8">
                        <LivingPlan room={room} />
                        <AvailabilityPicker
                            availability={availability}
                            selectedBedId={selectedBed?.id ?? null}
                            onSelect={setSelectedBed}
                            photoKeys={photoKeys}
                            onShowPhotos={showRoomPhotos}
                        />
                        <About room={room} />
                        <Features room={room} />
                        <Included room={room} />
                        <Terms />
                    </div>

                    <div className="lg:col-span-4">
                        <BookingCard room={room} summary={summary} selectedBed={selectedBed} onClear={() => setSelectedBed(null)} />
                    </div>
                </div>
            </section>

            {/* ───────── Diğer oda tipleri ───────── */}
            {otherRooms.length > 0 && (
                <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:px-8 lg:px-12">
                    <Reveal className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                        <div>
                            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.25em] text-orchid-pink">{t.roomDetail.others.eyebrow}</span>
                            <h2 className="font-display text-4xl font-normal tracking-tight text-orchid-dark">{t.roomDetail.others.title}</h2>
                        </div>
                        <LocalizedLink href="/odalar" className="flex items-center gap-1 text-sm font-bold text-orchid-pink hover:underline">
                            {t.roomDetail.others.all}
                            <Icon name="arrow_forward" className="text-[18px]" />
                        </LocalizedLink>
                    </Reveal>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                        {otherRooms.map((other) => (
                            <Reveal key={other.id}>
                                <RoomListCard room={other} />
                            </Reveal>
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}

function listFirst(field, locale) {
    const list = field?.[locale]?.length ? field[locale] : field?.tr;
    return Array.isArray(list) ? list[0] : "";
}
