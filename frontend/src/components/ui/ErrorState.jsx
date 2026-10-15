"use client";

import { useEffect } from "react";
import Icon from "@/components/ui/Icon";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/** Sayfa verisi alınamadığında (backend ulaşılamıyor vb.) gösterilen ortak hata ekranı: çökme yerine "tekrar dene" */
export default function ErrorState({ error, reset, className = "min-h-[60vh]" }) {
    const { t } = useLanguage();
    const copy = t.common.errorPage;

    useEffect(() => {
        console.error("[page]", error);
    }, [error]);

    return (
        <div role="alert" className={`flex flex-col items-center justify-center gap-4 px-6 text-center ${className}`}>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink">
                <Icon name="cloud_off" className="text-[28px]" />
            </span>
            <h2 className="font-display text-2xl font-medium text-orchid-dark">{copy.title}</h2>
            <p className="max-w-sm text-sm text-orchid-muted">{copy.text}</p>
            <button type="button" onClick={reset} className="aurora-btn h-11 rounded-full px-6 text-sm font-bold text-white">
                {copy.retry}
            </button>
        </div>
    );
}
