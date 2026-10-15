import Icon from "@/components/ui/Icon";

/**
 * Panelin markalı yükleme ekranı. Sayfa geçişlerinde loading.jsx üzerinden gösterilir.
 */
export default function AdminLoader({ label = "Veriler hazırlanıyor" }) {
    return (
        <div role="status" aria-live="polite" className="flex min-h-[65vh] w-full items-center justify-center p-6">
            <div className="flex flex-col items-center text-center">
                <div className="relative h-32 w-32">
                    <div className="admin-loader-pulse absolute -inset-4 rounded-full bg-ad-brand/15 blur-2xl" />
                    <div className="admin-loader-ring absolute inset-0 rounded-full" />
                    <div className="absolute inset-[7px] rounded-full bg-ad-surface shadow-[inset_0_2px_10px_rgba(11,28,48,0.08)]" />
                    <div className="admin-loader-spin-rev absolute inset-[18px] rounded-full border-2 border-dashed border-ad-brand/25" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Icon name="apartment" className="admin-loader-breathe text-[40px] text-ad-brand" />
                    </div>
                </div>

                <p className="ad-display mt-7 text-xl font-semibold text-ad-ink">Mazlum Apart Yönetim Paneli</p>
                <p className="mt-1 text-sm text-ad-muted">
                    {label}
                    <span className="admin-loader-dots" />
                </p>

                <div className="mt-5 h-1 w-52 overflow-hidden rounded-full bg-ad-raised">
                    <div className="admin-loader-slide h-full w-1/3 rounded-full bg-gradient-to-r from-ad-brand to-ad-accent-bright" />
                </div>
            </div>
        </div>
    );
}
