"use client";

import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import SafeImage from "@/components/ui/SafeImage";
import { SITE, waHref } from "@/lib/constants";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function Row({ icon, label, children }) {
    return (
        <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orchid-petal/30 bg-white text-orchid-pink shadow-sm">
                <Icon name={icon} className="text-[22px]" />
            </span>
            <div className="flex flex-col">
                <span className="text-xs font-bold uppercase text-orchid-muted">{label}</span>
                <span className="text-sm font-semibold text-orchid-dark">{children}</span>
            </div>
        </div>
    );
}

/**
 * İletişim ve konum. Henüz gelmeyen bilgiler (adres, telefon, WhatsApp, harita) gösterilmez;
 * hiçbiri yoksa bölüm hiç çizilmez. Bilgiler SITE sabitlerine girildiğinde kendiliğinden belirir.
 */
export default function ContactSection({ mapImage }) {
    const { t } = useLanguage();
    const whatsapp = waHref(t.whatsapp.defaultMessage);
    const hasMap = Boolean(SITE.mapUrl);

    if (!SITE.address && !SITE.phone && !whatsapp && !SITE.instagram && !hasMap) return null;

    return (
        <section id="iletisim" className="relative w-full bg-orchid-powder/35 px-4 py-24 sm:px-8 lg:px-12">
            <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
                <Reveal className={hasMap ? "lg:col-span-5" : "lg:col-span-12"}>
                    <div className="glass-card flex h-full flex-col justify-between gap-8 rounded-[36px] border border-orchid-petal/50 p-8 shadow-sm sm:p-10">
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-bold uppercase tracking-[0.25em] text-orchid-pink">{t.contact.eyebrow}</span>
                                <h2 className="font-display text-4xl font-normal tracking-tight text-orchid-dark">{t.contact.title}</h2>
                                <p className="text-sm text-orchid-muted">{t.contact.subtitle}</p>
                            </div>

                            <div className="flex flex-col gap-5 pt-2">
                                {SITE.address && (
                                    <Row icon="location_on" label={t.contact.address}>
                                        {SITE.address}
                                    </Row>
                                )}
                                {SITE.phone && (
                                    <Row icon="call" label={t.contact.phone}>
                                        <a href={SITE.phoneHref || undefined} className="hover:text-orchid-pink">
                                            {SITE.phone}
                                        </a>
                                    </Row>
                                )}
                                {SITE.instagram && (
                                    <Row icon="photo_camera" label={t.contact.instagram}>
                                        <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-orchid-pink">
                                            {SITE.instagram.replace(/^https?:\/\/(www\.)?/, "")}
                                        </a>
                                    </Row>
                                )}
                            </div>
                        </div>

                        {whatsapp && (
                            <a
                                href={whatsapp}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-cursor="WhatsApp"
                                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25d366] px-6 py-4 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:bg-[#1ebe5d] active:scale-[0.98]"
                            >
                                <Icon name="chat" filled className="text-[20px]" />
                                <span>{t.contact.whatsapp}</span>
                            </a>
                        )}
                    </div>
                </Reveal>

                {hasMap && (
                    <Reveal delay={0.1} className="lg:col-span-7">
                        <a
                            href={SITE.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-cursor={t.contact.openMap}
                            className="group relative block min-h-[420px] h-full overflow-hidden rounded-[36px] border border-orchid-petal/40 bg-orchid-lilac shadow-xl"
                        >
                            <SafeImage
                                src={mapImage}
                                alt=""
                                loading="lazy"
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="relative flex items-center justify-center">
                                    <span className="absolute inline-flex h-16 w-16 rounded-full bg-orchid-pink opacity-75 animate-ping" />
                                    <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-orchid-pink text-white shadow-2xl">
                                        <Icon name="pin_drop" className="text-[24px]" />
                                    </span>
                                </div>
                            </div>
                            <div className="glass-card absolute bottom-6 left-6 right-6 flex items-center gap-3 rounded-2xl border border-white/70 p-4 shadow-lg sm:right-auto sm:max-w-xs">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orchid-pink text-white">
                                    <Icon name="open_in_new" className="text-[20px]" />
                                </span>
                                <span className="flex flex-col">
                                    <span className="text-xs font-bold text-orchid-dark">{SITE.name}</span>
                                    <span className="text-[11px] text-orchid-muted">{t.contact.openMap}</span>
                                </span>
                            </div>
                        </a>
                    </Reveal>
                )}
            </div>
        </section>
    );
}
