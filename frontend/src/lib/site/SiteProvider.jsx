"use client";

import { createContext, useContext, useMemo } from "react";
import { BRAND_NAME } from "@/lib/constants";
import { localized } from "@/lib/i18n/localized";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/**
 * Site ayarları (telefon, WhatsApp, adres, harita, Instagram): yönetim panelinden girilir, backend'den gelir
 * (GET /api/site-settings) ve [lang]/layout.jsx'te bir kez okunur. Boş alanlar null'dır ve sitede hiç gösterilmez.
 */
const SiteContext = createContext(null);

const formatPhone = (digits) => (digits && digits.length === 10 ? `0 (${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}` : digits || "");

function instagramUrl(value) {
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    return `https://instagram.com/${value.replace(/^@/, "").replace(/^instagram\.com\//i, "")}`;
}

export function SiteProvider({ settings, children }) {
    const { locale } = useLanguage();

    const site = useMemo(() => {
        const s = settings ?? {};
        const whatsapp = s.whatsapp ? `90${s.whatsapp}` : "";
        return {
            name: BRAND_NAME,
            phone: formatPhone(s.phone),
            phoneHref: s.phone ? `tel:+90${s.phone}` : "",
            whatsapp,
            email: s.email ?? "",
            address: localized(s.address, locale) || "",
            mapUrl: s.mapUrl ?? "",
            instagram: instagramUrl(s.instagram),
            /** WhatsApp bağlantısı; numara yoksa null döner */
            waHref: (message) => {
                if (!whatsapp) return null;
                const base = `https://wa.me/${whatsapp}`;
                return message ? `${base}?text=${encodeURIComponent(message)}` : base;
            },
        };
    }, [settings, locale]);

    return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite() {
    const site = useContext(SiteContext);
    if (!site) throw new Error("useSite, SiteProvider dışında kullanılamaz.");
    return site;
}
