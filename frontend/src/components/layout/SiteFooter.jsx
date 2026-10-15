"use client";

import { motion } from "framer-motion";
import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import { APPLY_HREF, NAV_ITEMS, STUDENT_LOGIN_HREF } from "./navigation";
import { SITE, waHref } from "@/lib/constants";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT } from "@/lib/motion";

const GIANT_LETTERS = Array.from(SITE.name);

const socialClass =
    "flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-orchid-petal transition-colors hover:bg-orchid-pink hover:text-white";

export default function SiteFooter() {
    const { t } = useLanguage();
    const whatsapp = waHref(t.whatsapp.defaultMessage);

    // Henüz gelmeyen iletişim bilgileri gösterilmez
    const hasContact = Boolean(SITE.phone || SITE.address || whatsapp);

    return (
        <footer className="relative mt-24 w-full overflow-hidden rounded-t-[48px] bg-orchid-dark pb-10 pt-20 text-white">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-0 h-[200px] w-[700px] max-w-full -translate-x-1/2 rounded-full bg-orchid-pink/20 soft-blob"
            />

            <div className="relative z-10 mx-auto flex max-w-[1340px] flex-col gap-16 px-4 sm:px-8 lg:px-12">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
                    {/* Marka */}
                    <div className="flex flex-col gap-5 lg:col-span-2">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 font-display text-xl font-semibold italic text-orchid-petal">
                                M
                            </span>
                            <span className="font-display text-2xl font-bold tracking-tight">
                                Mazlum<span className="ml-1 italic text-orchid-petal">Apart</span>
                            </span>
                        </div>
                        <p className="max-w-sm text-sm leading-relaxed text-orchid-lilac/70">{t.footer.about}</p>

                        {(SITE.instagram || whatsapp) && (
                            <div className="flex items-center gap-3 pt-2">
                                {SITE.instagram && (
                                    <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" aria-label={t.footer.instagram} className={socialClass}>
                                        <Icon name="photo_camera" className="text-[18px]" />
                                    </a>
                                )}
                                {whatsapp && (
                                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={t.footer.whatsapp} className={socialClass}>
                                        <Icon name="chat" className="text-[18px]" />
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Menü */}
                    <div className="flex flex-col gap-4">
                        <span className="text-xs font-bold uppercase tracking-[0.25em] text-orchid-petal">{t.footer.menu}</span>
                        <ul className="flex flex-col gap-2.5 text-sm text-orchid-lilac/70">
                            {NAV_ITEMS.map((item) => (
                                <li key={item.href}>
                                    <LocalizedLink href={item.href} className="transition-colors hover:text-white">
                                        {t.nav[item.key]}
                                    </LocalizedLink>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Öğrenci */}
                    <div className="flex flex-col gap-4">
                        <span className="text-xs font-bold uppercase tracking-[0.25em] text-orchid-petal">{t.footer.student}</span>
                        <ul className="flex flex-col gap-2.5 text-sm text-orchid-lilac/70">
                            <li>
                                <LocalizedLink href={APPLY_HREF} className="transition-colors hover:text-white">
                                    {t.nav.apply}
                                </LocalizedLink>
                            </li>
                            <li>
                                <LocalizedLink href={STUDENT_LOGIN_HREF} className="transition-colors hover:text-white">
                                    {t.nav.studentLogin}
                                </LocalizedLink>
                            </li>
                        </ul>
                    </div>

                    {/* İletişim: yalnızca dolu alanlar */}
                    {hasContact && (
                        <div className="flex flex-col gap-4">
                            <span className="text-xs font-bold uppercase tracking-[0.25em] text-orchid-petal">{t.footer.contact}</span>
                            <div className="flex flex-col gap-2.5 text-sm text-orchid-lilac/70">
                                {SITE.address && <p className="leading-relaxed">{SITE.address}</p>}
                                {SITE.phone && (
                                    <a href={SITE.phoneHref || undefined} className="font-semibold text-white">
                                        {SITE.phone}
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Ekran genişliğinde dev yazı: harfler yükselerek belirir */}
                <div aria-hidden="true" className="select-none overflow-hidden border-t border-white/10 pt-10 text-center">
                    {/* Gözlem kapsayıcıda yapılır: harfler overflow ile kırpıldığı için tek tek gözlenemez */}
                    <motion.span
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ staggerChildren: 0.04 }}
                        className="flex justify-center font-display text-[9vw] font-bold uppercase leading-[1.1] tracking-tight text-white/10 transition-colors duration-700 hover:text-white/20"
                    >
                        {GIANT_LETTERS.map((char, i) => (
                            <motion.span
                                key={i}
                                variants={{ hidden: { y: "100%" }, show: { y: 0 } }}
                                transition={{ duration: 0.8, ease: EASE_OUT }}
                                className="inline-block"
                            >
                                {char === " " ? "\u00A0" : char}
                            </motion.span>
                        ))}
                    </motion.span>
                </div>

                <div className="flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 text-xs text-orchid-lilac/60 sm:flex-row">
                    <p>
                        © {new Date().getFullYear()} {SITE.name}. {t.footer.rights}
                    </p>
                    <span>{t.footer.location}</span>
                </div>
            </div>
        </footer>
    );
}
