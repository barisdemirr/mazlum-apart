"use client";

import { MotionConfig } from "framer-motion";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

export function Providers({ locale, children }) {
    return (
        // reducedMotion="user": cihazda "hareketi azalt" açıksa framer animasyonları sadeleşir
        <MotionConfig reducedMotion="user">
            <LanguageProvider locale={locale}>{children}</LanguageProvider>
        </MotionConfig>
    );
}
