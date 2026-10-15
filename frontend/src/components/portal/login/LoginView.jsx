"use client";

import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import LocalizedLink from "@/components/ui/LocalizedLink";
import LanguageSwitch from "@/components/layout/LanguageSwitch";
import LoginForm from "./LoginForm";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT } from "@/lib/motion";

const rise = (i) => ({
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay: 0.15 + i * 0.09, ease: EASE_OUT },
});

/** Giriş sayfası düzeni: solda marka paneli (mobilde kısa başlık), sağda form */
export default function LoginView({ from, expired }) {
    const { t } = useLanguage();
    const copy = t.studentPortal.login;

    return (
        <main className="min-h-screen bg-orchid-white lg:grid lg:grid-cols-[1.05fr_1fr]">
            {/* Marka paneli */}
            <section className="relative isolate overflow-hidden rounded-b-[36px] bg-gradient-to-br from-orchid-dark via-[#4b1d66] to-orchid-pink px-6 pb-16 pt-8 text-white lg:m-4 lg:flex lg:min-h-[calc(100vh-2rem)] lg:flex-col lg:justify-between lg:rounded-[40px] lg:p-12">
                <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-orchid-petal/40 soft-blob animate-blob" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-20 -z-10 h-80 w-80 rounded-full bg-orchid-violet/60 soft-blob animate-blob [animation-delay:-6s]" />

                <div className="flex items-center justify-between">
                    <LocalizedLink href="/" className="group flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 font-display text-xl font-semibold italic text-white backdrop-blur transition-transform duration-300 group-hover:rotate-6">
                            M
                        </span>
                        <span className="font-display text-2xl font-bold leading-none tracking-tight">
                            Mazlum<span className="ml-1 italic text-orchid-petal">Apart</span>
                        </span>
                    </LocalizedLink>
                    <LanguageSwitch id="login-lang" dark className="lg:hidden" />
                </div>

                <div className="mt-10 lg:mt-0">
                    <motion.span
                        {...rise(0)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] backdrop-blur"
                    >
                        <span className="h-2 w-2 rounded-full bg-orchid-petal animate-pulse-glow" />
                        {copy.badge}
                    </motion.span>
                    <motion.h1 {...rise(1)} className="mt-5 max-w-md font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
                        {copy.brandTitle}
                    </motion.h1>
                    <motion.p {...rise(2)} className="mt-4 max-w-md text-base leading-relaxed text-white/75">
                        {copy.brandText}
                    </motion.p>

                    <ul className="mt-8 hidden max-w-md flex-col gap-3 lg:flex">
                        {copy.points.map((point, i) => (
                            <motion.li key={point} {...rise(3 + i)} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur">
                                <Icon name={["payments", "build", "home"][i] ?? "check"} className="text-[20px] text-orchid-petal" />
                                {point}
                            </motion.li>
                        ))}
                    </ul>
                </div>

                <p className="mt-8 hidden text-sm text-white/60 lg:block">
                    {t.nav.tagline} · {t.footer.location}
                </p>
            </section>

            {/* Form */}
            <section className="relative -mt-8 flex flex-col px-4 pb-10 sm:px-8 lg:mt-0 lg:min-h-screen lg:px-12 lg:py-8">
                <div className="hidden items-center justify-between lg:flex">
                    <LocalizedLink href="/" className="flex items-center gap-1.5 text-sm font-semibold text-orchid-muted transition-colors hover:text-orchid-pink">
                        <Icon name="arrow_back" className="text-[18px]" />
                        {copy.backToSite}
                    </LocalizedLink>
                    <LanguageSwitch id="login-lang-desktop" />
                </div>

                <div className="flex flex-1 items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.25, ease: EASE_OUT }}
                        className="glass-card w-full max-w-md rounded-[36px] bg-orchid-white p-6 shadow-[0_30px_80px_-30px_rgba(123,70,199,0.35)] sm:p-9"
                    >
                        <h2 className="font-display text-3xl font-semibold tracking-tight text-orchid-dark">{copy.title}</h2>
                        <p className="mb-7 mt-2 text-sm leading-relaxed text-orchid-muted">{copy.subtitle}</p>
                        <LoginForm from={from} expired={expired} />
                        <p className="mt-6 flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-orchid-muted">
                            <Icon name="receipt_long" className="mt-px text-[15px]" />
                            {copy.scopeNote}
                        </p>
                    </motion.div>
                </div>

                <div className="mt-6 flex flex-col items-center gap-3 text-xs text-orchid-muted lg:mt-0">
                    <LocalizedLink href="/" className="font-semibold transition-colors hover:text-orchid-pink lg:hidden">
                        {copy.backToSite}
                    </LocalizedLink>
                    <span>
                        © {new Date().getFullYear()} Mazlum Apart · {copy.rights}
                    </span>
                </div>
            </section>
        </main>
    );
}
