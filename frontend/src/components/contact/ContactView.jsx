"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import LocalizedLink from "@/components/ui/LocalizedLink";
import Magnetic from "@/components/ui/Magnetic";
import Reveal from "@/components/ui/Reveal";
import SafeImage from "@/components/ui/SafeImage";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useSite } from "@/lib/site/SiteProvider";
import { mediaUrl } from "@/lib/media";
import { EASE_OUT, VIEWPORT_ONCE } from "@/lib/motion";

function Word({ children, delay, className = "" }) {
    return (
        <span className="inline-block overflow-hidden pb-2 align-bottom">
            <motion.span initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay, ease: EASE_OUT }} className={`inline-block ${className}`}>
                {children}
            </motion.span>
        </span>
    );
}

const words = (text, delay, className) =>
    String(text)
        .split(" ")
        .map((w, i) => (
            <Word key={`${w}-${i}`} delay={delay + i * 0.08} className={className}>
                {w}&nbsp;
            </Word>
        ));

/** Kopyala düğmesi: tıklanınca ikon tik işaretine döner (kullanıcının eylemine cevap veren hareket) */
function CopyButton({ value, label, copiedLabel }) {
    const [copied, setCopied] = useState(false);
    const copy = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            /* pano izni yoksa sessizce geç */
        }
    };
    return (
        <button
            type="button"
            onClick={copy}
            aria-label={copied ? copiedLabel : label}
            className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orchid-petal/40 bg-white/80 text-orchid-muted transition-colors hover:border-orchid-pink hover:text-orchid-pink"
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={copied ? "ok" : "copy"}
                    initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.4, opacity: 0, rotate: 30 }}
                    transition={{ duration: 0.25 }}
                    className="flex"
                >
                    <Icon name={copied ? "check" : "content_copy"} className={`text-[18px] ${copied ? "text-emerald-600" : ""}`} />
                </motion.span>
            </AnimatePresence>
        </button>
    );
}

/** İletişim kanalı kartı: ikon küresi, etiket, değer ve eylem. Kartın tamamı tıklanabilir. */
function ChannelCard({ icon, label, value, action, href, external, copy, accent, index, c }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={VIEWPORT_ONCE}
            transition={{ duration: 0.7, delay: index * 0.08, ease: EASE_OUT }}
            className="h-full"
        >
            <div className="glass-card group relative flex h-full flex-col justify-between gap-8 overflow-hidden rounded-[32px] border border-orchid-petal/40 p-6 shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(180,57,143,0.18)] sm:p-7">
                {/* Kartın tamamını kaplayan bağlantı; kopyala düğmesi onun üstünde durur (iç içe etkileşimli öğe yok) */}
                {href && <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} aria-label={`${label}: ${action}`} className="absolute inset-0 z-[1] rounded-[32px]" />}
                <span aria-hidden="true" className={`pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-60 ${accent}`} />
                <div className="relative flex items-start justify-between gap-3">
                    <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 ${accent}`}>
                        <Icon name={icon} filled className="text-[26px]" />
                    </span>
                    {copy && <CopyButton value={copy} label={c.copy} copiedLabel={c.copied} />}
                </div>
                <div className="relative flex flex-col gap-1">
                    <span className="text-sm font-semibold text-orchid-muted">{label}</span>
                    <span className="break-words font-display text-xl font-medium text-orchid-dark sm:text-2xl">{value}</span>
                    {href && (
                        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-orchid-pink">
                            {action}
                            <Icon name="arrow_outward" className="text-[18px] transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

/**
 * İletişim sayfası. Bilgilerin tamamı yönetim panelindeki Site Ayarları'ndan gelir (useSite):
 * boş alanlar hiç gösterilmez, uydurma bilgi konmaz. Hiçbiri yoksa başvuru ve odalara yönlendirilir.
 */
export default function ContactView({ mapImage }) {
    const { t } = useLanguage();
    const site = useSite();
    const c = t.contactPage;
    const whatsapp = site.waHref(t.whatsapp.defaultMessage);
    const mapSrc = mediaUrl(mapImage);

    const channels = [
        site.phone && { id: "phone", icon: "call", label: c.phone, value: site.phone, action: c.call, href: site.phoneHref, copy: site.phone, accent: "bg-gradient-to-br from-orchid-pink to-orchid-violet" },
        site.email && { id: "email", icon: "mail", label: c.email, value: site.email, action: c.sendMail, href: `mailto:${site.email}`, copy: site.email, accent: "bg-gradient-to-br from-orchid-violet to-[#5b2fa6]" },
        site.instagram && {
            id: "instagram",
            icon: "photo_camera",
            label: c.instagram,
            value: `@${site.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, "")}`,
            action: c.follow,
            href: site.instagram,
            external: true,
            accent: "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]",
        },
        site.address && { id: "address", icon: "location_on", label: c.address, value: site.address, action: site.mapUrl ? c.directions : c.copyAddress, href: site.mapUrl || undefined, external: Boolean(site.mapUrl), copy: site.address, accent: "bg-gradient-to-br from-orchid-petal to-orchid-pink" },
    ].filter(Boolean);

    const empty = !whatsapp && channels.length === 0;

    return (
        <main className="relative overflow-x-clip">
            {/* ───────── Hero ───────── */}
            <section className="relative flex flex-col items-center px-4 pb-14 pt-36 text-center sm:px-8 sm:pt-44">
                {/* Lekeler bölümün altına taşabilir (kesik kenar oluşmasın); yatay taşmayı <main> keser */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                    <div className="absolute -top-32 left-1/2 h-[520px] w-[760px] max-w-full -translate-x-1/2 rounded-full bg-gradient-to-tr from-orchid-petal/40 via-orchid-lilac/60 to-orchid-powder/50 soft-blob animate-blob" />
                    <div className="absolute -left-40 top-[45%] h-[420px] w-[420px] rounded-full bg-orchid-powder/70 soft-blob animate-blob [animation-delay:5s]" />
                    <div className="absolute -right-40 top-[30%] h-[460px] w-[460px] rounded-full bg-orchid-lilac/70 soft-blob animate-blob [animation-delay:9s]" />
                </div>

                {/* Dönen ince halka içinde nabız atan mesaj ikonu */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.9, delay: 0.3, ease: EASE_OUT }}
                    aria-hidden="true"
                    className="relative mb-8 flex h-24 w-24 items-center justify-center"
                >
                    <span className="absolute inset-0 rounded-full border border-dashed border-orchid-pink/40 animate-spin-slow" />
                    <span className="absolute inset-3 rounded-full bg-orchid-pink/15 animate-pulse-glow" />
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orchid-pink to-orchid-violet text-white shadow-xl">
                        <Icon name="forum" filled className="text-[26px]" />
                    </span>
                </motion.div>

                <h1 className="font-display text-[2.6rem] font-medium leading-[1.05] tracking-tight text-orchid-dark sm:text-6xl lg:text-7xl">
                    <span className="block">{words(c.titleStart, 0.5)}</span>
                    <span className="block">{words(c.titleAccent, 0.75, "font-normal italic text-orchid-pink")}</span>
                </h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.05, ease: EASE_OUT }}
                    className="mt-6 max-w-xl text-base leading-relaxed text-orchid-muted sm:text-lg"
                >
                    {c.subtitle}
                </motion.p>
            </section>

            {/* ───────── Kanallar ───────── */}
            <section className="px-4 pb-16 sm:px-8 lg:px-12">
                <div className="mx-auto max-w-[1240px]">
                    {empty ? (
                        <Reveal className="glass-card mx-auto flex max-w-xl flex-col items-center gap-5 rounded-[36px] p-10 text-center">
                            <Icon name="schedule" className="text-[40px] text-orchid-pink" />
                            <p className="text-orchid-muted">{c.empty}</p>
                            <LocalizedLink href="/basvuru" className="aurora-btn rounded-full px-8 py-3.5 text-sm font-bold text-white">{c.apply}</LocalizedLink>
                        </Reveal>
                    ) : (
                        <div className="grid gap-5 lg:grid-cols-12">
                            {/* WhatsApp: en hızlı kanal, büyük kart */}
                            {whatsapp && (
                                <motion.a
                                    href={whatsapp}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-cursor="WhatsApp"
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.9, delay: 1.2, ease: EASE_OUT }}
                                    className={`group relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[40px] bg-gradient-to-br from-[#1fae55] via-[#25d366] to-[#7be3a4] p-7 text-white shadow-[0_30px_70px_rgba(37,211,102,0.35)] sm:p-10 ${channels.length ? "lg:col-span-5 lg:row-span-2" : "lg:col-span-12"}`}
                                >
                                    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                                        <span className="absolute -right-10 -top-10 h-64 w-64 rounded-full border border-white/25 transition-transform duration-1000 group-hover:scale-125" />
                                        <span className="absolute -right-2 -top-2 h-44 w-44 rounded-full border border-white/30 transition-transform duration-1000 group-hover:scale-110" />
                                        <span className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/15 soft-blob animate-blob" />
                                    </div>
                                    <div className="relative flex items-center gap-3">
                                        <span className="relative flex h-3 w-3">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                                            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                                        </span>
                                        <span className="text-sm font-bold text-white/90">{c.whatsappTag}</span>
                                    </div>
                                    <div className="relative flex flex-col gap-4">
                                        <Icon name="chat" filled className="text-[56px] drop-shadow-lg transition-transform duration-700 group-hover:-rotate-12 group-hover:scale-110" />
                                        <h2 className="font-display text-3xl font-medium leading-tight sm:text-4xl">{c.whatsappTitle}</h2>
                                        <p className="max-w-sm text-white/85">{c.whatsappText}</p>
                                        <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#128c4a] shadow-lg transition-transform duration-500 group-hover:scale-105">
                                            {c.whatsappCta}
                                            <Icon name="arrow_outward" className="text-[18px]" />
                                        </span>
                                    </div>
                                </motion.a>
                            )}

                            {channels.length > 0 && (
                                <div className={`grid gap-5 sm:grid-cols-2 ${whatsapp ? "lg:col-span-7" : "lg:col-span-12 lg:grid-cols-4"}`}>
                                    {channels.map((item, i) => (
                                        <ChannelCard key={item.id} {...item} index={i} c={c} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* ───────── Konum ───────── */}
            {(site.mapUrl || mapSrc) && (
                <section className="px-4 pb-20 sm:px-8 lg:px-12">
                    <Reveal className="mx-auto max-w-[1240px]">
                        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <h2 className="font-display text-4xl font-normal tracking-tight text-orchid-dark sm:text-5xl">{c.mapTitle}</h2>
                            {site.address && <p className="max-w-md text-sm text-orchid-muted sm:text-right">{site.address}</p>}
                        </div>
                        <a
                            href={site.mapUrl || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-cursor={t.contact.openMap}
                            className="group relative block h-[380px] overflow-hidden rounded-[40px] border-4 border-white bg-gradient-to-br from-orchid-powder via-orchid-lilac to-orchid-white shadow-[0_30px_80px_rgba(123,70,199,0.2)] sm:h-[480px]"
                        >
                            {mapSrc && <SafeImage src={mapSrc} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-110" />}
                            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-orchid-dark/40 via-transparent to-transparent" />

                            {/* Pin: dalga dalga yayılan halkalar */}
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div className="relative flex items-center justify-center">
                                    <span className="absolute h-40 w-40 rounded-full border-2 border-orchid-pink/40 animate-ping [animation-duration:2.4s]" />
                                    <span className="absolute h-24 w-24 rounded-full bg-orchid-pink/30 animate-ping [animation-duration:1.8s]" />
                                    <motion.span
                                        initial={{ y: -60, opacity: 0 }}
                                        whileInView={{ y: 0, opacity: 1 }}
                                        viewport={VIEWPORT_ONCE}
                                        transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.3 }}
                                        className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-orchid-pink to-orchid-violet text-white shadow-2xl"
                                    >
                                        <Icon name="home_pin" filled className="text-[30px]" />
                                    </motion.span>
                                </div>
                            </div>

                            {site.mapUrl && (
                                <div className="glass-card absolute bottom-5 left-5 right-5 flex items-center justify-between gap-4 rounded-3xl border border-white/70 p-4 shadow-lg sm:bottom-8 sm:left-8 sm:right-auto sm:min-w-[320px]">
                                    <span className="flex flex-col">
                                        <span className="text-sm font-bold text-orchid-dark">{site.name}</span>
                                        <span className="text-xs text-orchid-muted">{c.directionsHint}</span>
                                    </span>
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orchid-pink text-white transition-transform duration-500 group-hover:rotate-45">
                                        <Icon name="north_east" className="text-[20px]" />
                                    </span>
                                </div>
                            )}
                        </a>
                    </Reveal>
                </section>
            )}

            {/* ───────── Sonraki adım ───────── */}
            <section className="px-4 pb-24 sm:px-8 lg:px-12">
                <Reveal className="mx-auto max-w-[1240px]">
                    <div className="glass-card relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-[36px] border border-orchid-petal/40 p-8 text-center sm:p-10 lg:flex-row lg:text-left">
                        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-orchid-lilac soft-blob animate-blob" />
                        <div className="relative">
                            <h2 className="font-display text-3xl font-normal tracking-tight text-orchid-dark sm:text-4xl">{c.nextTitle}</h2>
                            <p className="mt-2 max-w-lg text-orchid-muted">{c.nextText}</p>
                        </div>
                        <div className="relative flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                            <Magnetic className="w-full sm:w-auto">
                                <LocalizedLink href="/odalar" className="flex w-full items-center justify-center gap-2 rounded-full border border-orchid-petal/60 bg-white px-7 py-3.5 text-sm font-bold text-orchid-dark transition-colors hover:border-orchid-pink hover:text-orchid-pink sm:w-auto">
                                    <Icon name="bed" className="text-[20px]" />
                                    {c.rooms}
                                </LocalizedLink>
                            </Magnetic>
                            <Magnetic className="w-full sm:w-auto">
                                <LocalizedLink href="/basvuru" className="aurora-btn flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white sm:w-auto">
                                    <Icon name="edit_note" className="text-[20px]" />
                                    {c.apply}
                                </LocalizedLink>
                            </Magnetic>
                        </div>
                    </div>
                </Reveal>
            </section>
        </main>
    );
}
