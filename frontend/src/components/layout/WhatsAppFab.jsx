"use client";

import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import { useSite } from "@/lib/site/SiteProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { SPRING_BOUNCY } from "@/lib/motion";

/** Sağ altta sabit WhatsApp butonu. Numara tanımlı değilse hiç çizilmez. */
export default function WhatsAppFab() {
    const { t } = useLanguage();
    const site = useSite();
    const href = site.waHref(t.whatsapp.defaultMessage);
    if (!href) return null;

    return (
        <motion.a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.whatsapp.aria}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...SPRING_BOUNCY, delay: 1.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="wa-fab group fixed bottom-6 right-6 z-50 flex items-center rounded-full bg-[#25d366] p-3.5 text-white shadow-[0_12px_35px_rgba(37,211,102,0.4)] transition-shadow duration-300 hover:shadow-[0_16px_45px_rgba(37,211,102,0.6)] sm:p-4"
        >
            <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full bg-[#25d366] opacity-40 animate-ping" />
            <Icon name="chat" filled className="text-[26px]" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-bold opacity-0 transition-all duration-300 group-hover:ml-2.5 group-hover:max-w-[8rem] group-hover:opacity-100">
                {t.whatsapp.fab}
            </span>
        </motion.a>
    );
}
