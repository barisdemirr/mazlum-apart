"use client";

import Icon from "@/components/ui/Icon";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/** Henüz hazırlanmamış portal bölümleri için geçici kart (sonraki aşamalarda kaldırılır) */
export default function ComingSoon() {
    const { t } = useLanguage();
    return (
        <div className="glass-card flex flex-col items-center rounded-[32px] px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink">
                <Icon name="hourglass_top" className="text-[30px]" />
            </span>
            <h2 className="mt-5 font-display text-2xl font-semibold text-orchid-dark">{t.studentPortal.soon.title}</h2>
            <p className="mt-2 text-sm text-orchid-muted">{t.studentPortal.soon.text}</p>
        </div>
    );
}
