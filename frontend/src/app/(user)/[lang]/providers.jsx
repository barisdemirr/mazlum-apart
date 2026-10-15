"use client";

import { MotionConfig } from "framer-motion";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { SiteProvider } from "@/lib/site/SiteProvider";

export function Providers({ locale, site, children }) {
    return (
        // reducedMotion="user": cihazda "hareketi azalt" açıksa framer animasyonları sadeleşir
        <MotionConfig reducedMotion="user">
            <LanguageProvider locale={locale}>
                <SiteProvider settings={site}>{children}</SiteProvider>
            </LanguageProvider>
        </MotionConfig>
    );
}
