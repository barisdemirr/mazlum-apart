"use client";

import Icon from "@/components/ui/Icon";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { progress } from "@/lib/admin/progress";

const CHIP_DELAY = 250; // kısa isteklerde rozet yanıp sönmesin
const NAV_TIMEOUT = 15000; // geçiş takılırsa çubuk sonsuza kadar kalmasın

export default function AdminProgressBar() {
    const requestBusy = useSyncExternalStore(progress.subscribe, progress.isBusy, () => false);
    const pathname = usePathname();

    const [navigating, setNavigating] = useState(false);
    const [width, setWidth] = useState(0);
    const [visible, setVisible] = useState(false);
    const [showChip, setShowChip] = useState(false);

    const busy = requestBusy || navigating;

    /* Panel içi bağlantıya tıklanınca geçiş başlar */
    useEffect(() => {
        const onClick = (e) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const link = e.target.closest?.("a[href]");
            if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin) return;
            if (url.pathname === window.location.pathname && url.search === window.location.search) return;

            setNavigating(true);
        };

        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, []);

    /* Yeni sayfa geldi: geçiş bitti */
    useEffect(() => {
        setNavigating(false);
    }, [pathname]);

    useEffect(() => {
        if (!navigating) return;
        const timer = setTimeout(() => setNavigating(false), NAV_TIMEOUT);
        return () => clearTimeout(timer);
    }, [navigating]);

    /* Çubuk: başta hızlı, sonra %90'a doğru yavaşlayarak ilerler; iş bitince tamamlanıp kaybolur */
    useEffect(() => {
        if (busy) {
            setVisible(true);
            setWidth((w) => (w > 0 && w < 100 ? w : 12));
            const timer = setInterval(() => setWidth((w) => (w < 90 ? w + (90 - w) * 0.1 : w)), 200);
            return () => clearInterval(timer);
        }

        setWidth((w) => (w > 0 ? 100 : 0));
        const timer = setTimeout(() => {
            setVisible(false);
            setWidth(0);
        }, 450);
        return () => clearTimeout(timer);
    }, [busy]);

    /* Rozet yalnızca API isteklerinde (kaydet, sil, yükle) ve biraz sürerse çıkar */
    useEffect(() => {
        if (!requestBusy) {
            setShowChip(false);
            return;
        }
        const timer = setTimeout(() => setShowChip(true), CHIP_DELAY);
        return () => clearTimeout(timer);
    }, [requestBusy]);

    return (
        <>
            {/* Üst çubuk */}
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] transition-opacity duration-300"
                style={{ opacity: visible ? 1 : 0 }}
            >
                <div
                    className="relative h-full bg-gradient-to-r from-ad-brand via-ad-accent to-ad-accent-bright shadow-[0_0_10px_rgba(30,64,175,0.6)]"
                    style={{ width: `${width}%`, transition: "width 250ms ease-out" }}
                >
                    {/* Parlayan uç */}
                    <span className="absolute -top-[3px] end-0 h-[9px] w-24 rounded-full bg-ad-accent-bright/60 blur-md" />
                </div>
            </div>

            {/* İşleniyor rozeti */}
            <div
                role="status"
                aria-live="polite"
                className={`pointer-events-none fixed bottom-5 end-5 z-[100] flex items-center gap-3 rounded-2xl border border-white/10 bg-ad-ink py-2.5 pe-4 ps-2.5 text-white shadow-2xl transition-all duration-300 ${showChip ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                    }`}
            >
                <span className="relative flex h-8 w-8 items-center justify-center">
                    <span className="admin-loader-ring absolute inset-0 rounded-full" />
                    <Icon name="apartment" className="relative text-[16px]" />
                </span>
                <span className="flex flex-col leading-tight">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ad-accent-bright">Mazlum</span>
                    <span className="text-[13px] font-semibold">
                        İşleniyor<span className="admin-loader-dots" />
                    </span>
                </span>
                {showChip && <span className="sr-only">İşlem sürüyor</span>}
            </div>
        </>
    );
}