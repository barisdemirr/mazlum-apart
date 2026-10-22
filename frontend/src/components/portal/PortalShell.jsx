"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import Logo from "@/components/ui/Logo";
import LocalizedLink from "@/components/ui/LocalizedLink";
import LanguageSwitch from "@/components/layout/LanguageSwitch";
import LogoutDialog from "./LogoutDialog";
import PwaBanner from "./pwa/PwaBanner";
import { PORTAL_NAV, getActivePortalHref } from "@/lib/student/nav";
import { placementText } from "@/lib/student/labels";
import { localized } from "@/lib/i18n/localized";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { SPRING_SOFT } from "@/lib/motion";

/**
 * Öğrenci portalının kabuğu.
 * Masaüstü: solda menü + oda kutusu, üstte dönem ve öğrenci. Mobil: altta yüzen menü hapı.
 */
export default function PortalShell({ student, children }) {
    const { t, tpl, locale } = useLanguage();
    const copy = t.studentPortal;
    const pathname = usePathname();
    const active = getActivePortalHref(pathname);
    const [logoutOpen, setLogoutOpen] = useState(false);

    const initials = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase();
    const fullName = `${student.firstName} ${student.lastName}`;
    const room = student.room;

    return (
        <div className="min-h-screen overflow-x-clip bg-orchid-white">
            {/* ───────── Masaüstü yan menü ───────── */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-orchid-petal/25 bg-white/60 p-5 backdrop-blur-xl lg:flex">
                <LocalizedLink href="/ogrenci" className="group flex items-center gap-3 px-2 pt-1">
                    <Logo className="h-11 w-11 transition-transform duration-300 group-hover:scale-105" />
                    <span className="flex flex-col">
                        <span className="font-display text-2xl font-bold leading-none tracking-tight text-orchid-dark">
                            Mazlum<span className="ml-1 italic text-orchid-pink">Apart</span>
                        </span>
                        <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.25em] text-orchid-muted">{t.studentPortal.login.badge}</span>
                    </span>
                </LocalizedLink>

                <nav aria-label={copy.nav.menu} className="mt-9 flex flex-col gap-1.5">
                    {PORTAL_NAV.map((item) => {
                        const on = active === item.href;
                        return (
                            <LocalizedLink
                                key={item.href}
                                href={item.href}
                                aria-current={on ? "page" : undefined}
                                className={`relative flex items-center gap-3 rounded-full px-5 py-3 text-sm font-bold transition-colors ${
                                    on ? "text-orchid-pink" : "text-orchid-muted hover:text-orchid-dark"
                                }`}
                            >
                                {on && (
                                    <motion.span
                                        layoutId="portal-side-pill"
                                        transition={SPRING_SOFT}
                                        className="absolute inset-0 rounded-full bg-white shadow-[0_8px_24px_-10px_rgba(180,57,143,0.45)]"
                                    />
                                )}
                                <Icon name={item.icon} filled={on} className="relative text-[22px]" />
                                <span className="relative">{copy.nav[item.key]}</span>
                            </LocalizedLink>
                        );
                    })}
                </nav>

                <div className="mt-auto flex flex-col gap-3">
                    <div className="rounded-3xl bg-gradient-to-br from-orchid-powder to-orchid-lilac p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orchid-pink">{copy.shell.yourRoom}</p>
                        <p className="mt-1 font-display text-lg font-semibold text-orchid-dark">{localized(room.typeName, locale)}</p>
                        <p className="mt-0.5 text-xs text-orchid-muted">
                            {placementText(room)}
                        </p>
                    </div>
                    <LocalizedLink
                        href="/"
                        className="pwa-hide flex items-center gap-3 rounded-full px-5 py-2.5 text-sm font-semibold text-orchid-muted transition-colors hover:text-orchid-pink"
                    >
                        <Icon name="arrow_back" className="text-[20px]" />
                        {copy.shell.backToSite}
                    </LocalizedLink>
                    <button
                        type="button"
                        onClick={() => setLogoutOpen(true)}
                        className="flex items-center gap-3 rounded-full px-5 py-2.5 text-sm font-semibold text-orchid-muted transition-colors hover:bg-orchid-powder hover:text-orchid-pink"
                    >
                        <Icon name="logout" className="text-[20px]" />
                        {copy.shell.logout}
                    </button>
                </div>
            </aside>

            {/* ───────── Üst çubuk ───────── */}
            <header className="fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-6 lg:left-72 lg:px-8 lg:pt-4">
                <div className="glass-nav mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 rounded-full pl-2 pr-2 sm:pl-3 lg:h-[72px] lg:pl-6">
                    <LocalizedLink href="/ogrenci" aria-label="Mazlum Apart" className="flex h-11 w-11 shrink-0 items-center justify-center lg:hidden">
                        <Logo className="h-11 w-11" />
                    </LocalizedLink>

                    <span className="hidden items-center gap-2 rounded-full bg-orchid-powder/70 px-4 py-2 text-xs font-bold text-orchid-pink sm:flex">
                        <Icon name="calendar_month" className="text-[18px]" />
                        {tpl(copy.shell.period, { period: student.period.name })}
                    </span>

                    <div className="ml-auto flex items-center gap-2 sm:gap-3">
                        <LanguageSwitch id="portal-lang" />
                        <div className="flex items-center gap-2.5 rounded-full bg-white/70 py-1 pl-1 pr-1 sm:pr-4">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orchid-pink to-orchid-violet text-xs font-bold text-white">
                                {initials}
                            </span>
                            <span className="hidden flex-col leading-tight sm:flex">
                                <span className="text-sm font-bold text-orchid-dark">{fullName}</span>
                                <span className="text-[11px] text-orchid-muted">{copy.shell.student}</span>
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setLogoutOpen(true)}
                            aria-label={copy.shell.logout}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-orchid-muted transition-colors hover:bg-orchid-powder hover:text-orchid-pink lg:hidden"
                        >
                            <Icon name="logout" className="text-[22px]" />
                        </button>
                    </div>
                </div>
            </header>

            {/* ───────── İçerik ───────── */}
            <main className="px-4 pb-32 pt-24 sm:px-6 lg:ml-72 lg:px-8 lg:pb-14 lg:pt-28">
                <div className="mx-auto min-w-0 max-w-5xl">
                    <PwaBanner />
                    {children}
                </div>
            </main>

            {/* ───────── Mobil alt menü ───────── */}
            <nav
                data-bottom-bar
                aria-label={copy.nav.menu}
                className="glass-nav fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center justify-between rounded-full p-1.5 lg:hidden"
            >
                {PORTAL_NAV.map((item) => {
                    const on = active === item.href;
                    return (
                        <LocalizedLink
                            key={item.href}
                            href={item.href}
                            aria-current={on ? "page" : undefined}
                            className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-bold transition-colors ${
                                on ? "text-orchid-pink" : "text-orchid-muted"
                            }`}
                        >
                            {on && (
                                <motion.span
                                    layoutId="portal-bottom-pill"
                                    transition={SPRING_SOFT}
                                    className="absolute inset-0 rounded-full bg-white shadow-[0_6px_18px_-8px_rgba(180,57,143,0.5)]"
                                />
                            )}
                            <Icon name={item.icon} filled={on} className="relative text-[22px]" />
                            <span className="relative max-w-full truncate px-1">{copy.nav[item.key]}</span>
                        </LocalizedLink>
                    );
                })}
            </nav>

            <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
        </div>
    );
}
