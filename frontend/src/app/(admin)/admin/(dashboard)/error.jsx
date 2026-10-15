"use client";

import Icon from "@/components/ui/Icon";

/** Sayfa verisi okunamazsa (API kapalı, beklenmeyen hata) panelin geri kalanı çalışmaya devam eder. */
export default function AdminError({ error, reset }) {
    return (
        <div className="flex min-h-[55vh] flex-col items-center justify-center text-center" role="alert">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ad-danger-soft text-ad-danger">
                <Icon name="error" className="text-[30px]" />
            </span>
            <h1 className="ad-display mt-5 text-2xl font-semibold">Sayfa yüklenemedi</h1>
            <p className="mt-1.5 max-w-md text-sm text-ad-muted">
                Sunucuya ulaşılamadı ya da beklenmeyen bir hata oluştu. Birkaç saniye sonra tekrar deneyin.
                {error?.digest ? <span className="mt-2 block text-xs text-ad-faint">Hata kodu: {error.digest}</span> : null}
            </p>
            <button type="button" onClick={reset} className="ad-btn ad-btn-primary mt-6">Tekrar dene</button>
        </div>
    );
}
