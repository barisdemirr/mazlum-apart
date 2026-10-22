"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import LocalizedLink from "@/components/ui/LocalizedLink";
import Icon from "@/components/ui/Icon";
import Logo from "@/components/ui/Logo";
import Magnetic from "@/components/ui/Magnetic";
import LanguageSwitch from "./LanguageSwitch";
import MobileMenu from "./MobileMenu";
import { APPLY_HREF, NAV_ITEMS, STUDENT_LOGIN_HREF, getActiveHref } from "./navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT, SPRING_SOFT } from "@/lib/motion";

/**
 * Yüzen cam hap navbar.
 * - Aşağı kaydırınca gizlenir, yukarı kaydırınca geri gelir (menü açıkken hep görünür).
 * - Aktif / üzerine gelinen bağlantının arkasında beyaz hap kayarak taşınır.
 */
export default function SiteHeader() {
    const { t } = useLanguage();
    const pathname = usePathname();
    const activeHref = getActiveHref(pathname);

    const [hovered, setHovered] = useState(null);
    const [hidden, setHidden] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [origin, setOrigin] = useState({ x: 0, y: 0 });
    const toggleRef = useRef(null);

    const { scrollY } = useScroll();
    useMotionValueEvent(scrollY, "change", (latest) => {
        if (menuOpen) return;
        const previous = scrollY.getPrevious() ?? 0;
        if (latest < 90) setHidden(false);
        else if (latest > previous + 2) setHidden(true);
        else if (latest < previous - 2) setHidden(false);
    });

    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const toggleMenu = () => {
        if (!menuOpen && toggleRef.current) {
            const rect = toggleRef.current.getBoundingClientRect();
            setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
        setMenuOpen((value) => !value);
    };

    // Sayfa değişince menü kapansın
    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    const highlighted = hovered ?? activeHref;

    return (
        <>
            <motion.header
                initial={false}
                animate={{ y: hidden && !menuOpen ? "-150%" : 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
                onFocusCapture={() => setHidden(false)}
                className="pointer-events-none fixed inset-x-0 top-4 z-[70] px-4 sm:px-8"
            >
                <div className="glass-nav pointer-events-auto mx-auto flex h-16 max-w-[1180px] items-center justify-between rounded-full px-3 sm:h-20 sm:px-6">
                    {/* Marka */}
                    <LocalizedLink href="/" data-cursor="Mazlum" className="group flex items-center gap-3" onClick={closeMenu}>
                        <Logo className="h-10 w-10 transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11" />
                        <span className="flex flex-col">
                            <span className="font-display text-xl font-bold leading-none tracking-tight text-orchid-dark sm:text-2xl">
                                Mazlum<span className="ml-1 italic text-orchid-pink">Apart</span>
                            </span>
                            <span className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.25em] text-orchid-muted sm:block">
                                {t.nav.tagline}
                            </span>
                        </span>
                    </LocalizedLink>

                    {/* Masaüstü bağlantılar */}
                    <nav
                        aria-label={t.nav.menu}
                        onMouseLeave={() => setHovered(null)}
                        className="relative hidden items-center rounded-full border border-orchid-petal/25 bg-orchid-powder/40 p-1.5 text-sm lg:flex"
                    >
                        {NAV_ITEMS.map((item) => {
                            const on = highlighted === item.href;
                            return (
                                <LocalizedLink
                                    key={item.href}
                                    href={item.href}
                                    onMouseEnter={() => setHovered(item.href)}
                                    onFocus={() => setHovered(item.href)}
                                    onBlur={() => setHovered(null)}
                                    aria-current={activeHref === item.href ? "page" : undefined}
                                    className={`relative rounded-full px-5 py-2 font-semibold transition-colors ${
                                        on ? "text-orchid-pink" : "text-orchid-muted"
                                    }`}
                                >
                                    {on && (
                                        <motion.span
                                            layoutId="nav-pill"
                                            transition={SPRING_SOFT}
                                            className="absolute inset-0 rounded-full border border-orchid-petal/40 bg-white shadow-[0_4px_16px_rgba(180,57,143,0.2)]"
                                        />
                                    )}
                                    <span className="relative">{t.nav[item.key]}</span>
                                </LocalizedLink>
                            );
                        })}
                    </nav>

                    {/* Sağ taraf */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <LanguageSwitch id="nav-lang" className="hidden md:flex" />

                        <LocalizedLink
                            href={STUDENT_LOGIN_HREF}
                            data-cursor={t.nav.studentLogin}
                            className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-orchid-petal/40 bg-white/70 px-4 py-2.5 text-xs font-semibold text-orchid-dark shadow-sm transition-all duration-300 hover:border-orchid-pink hover:bg-white hover:text-orchid-pink sm:inline-flex sm:px-5 sm:text-sm"
                        >
                            <Icon name="lock_open" className="text-[17px]" />
                            <span>{t.nav.studentLogin}</span>
                        </LocalizedLink>

                        <Magnetic strength={0.25} className="hidden sm:inline-flex">
                            <LocalizedLink
                                href={APPLY_HREF}
                                data-cursor={t.nav.apply}
                                className="aurora-btn inline-flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-xs font-bold text-white transition-transform duration-300 hover:scale-[1.04] active:scale-[0.97] sm:px-6 sm:py-3 sm:text-sm"
                            >
                                <span>{t.nav.apply}</span>
                                <Icon name="auto_awesome" className="hidden text-[18px] sm:block" />
                            </LocalizedLink>
                        </Magnetic>

                        {/* Hamburger */}
                        <button
                            ref={toggleRef}
                            type="button"
                            onClick={toggleMenu}
                            aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
                            aria-expanded={menuOpen}
                            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-orchid-petal/40 bg-white/80 text-orchid-dark shadow-sm lg:hidden"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.span
                                    key={menuOpen ? "close" : "menu"}
                                    initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                    exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex"
                                >
                                    <Icon name={menuOpen ? "close" : "menu"} className="text-[24px]" />
                                </motion.span>
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </motion.header>

            <MobileMenu open={menuOpen} onClose={closeMenu} origin={origin} activeHref={activeHref} />
        </>
    );
}
