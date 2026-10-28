import Logo from "@/components/ui/Logo";
import { BRAND_NAME } from "@/lib/constants";

/**
 * Sitenin markalı yükleme animasyonu: nefes alan logo, dönen halka, ters dönen kesik çizgili halka ve ilerleme çubuğu.
 * Yönetim panelindeki AdminLoader'ın orkide (site teması) renklerindeki karşılığıdır.
 * Kullanıldığı yerler: açılış ekranı (layout/Preloader) ve sayfa geçişleri (app/(user)/[lang]/loading.jsx).
 * Animasyon sınıfları globals.css içindedir (.site-loader-*). Kancasızdır: sunucu bileşeninden de kullanılabilir.
 */
export default function SiteLoader() {
    return (
        <div className="flex flex-col items-center text-center">
            <div className="relative h-32 w-32">
                <div className="site-loader-pulse soft-blob absolute -inset-4 rounded-full bg-orchid-pink/15" />
                <div className="site-loader-ring absolute inset-0 rounded-full" />
                <div className="absolute inset-[7px] rounded-full bg-orchid-white shadow-[inset_0_2px_10px_rgba(52,22,63,0.08)]" />
                <div className="site-loader-spin-rev absolute inset-[18px] rounded-full border-2 border-dashed border-orchid-petal/50" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Logo className="site-loader-breathe h-12 w-12" />
                </div>
            </div>

            <p className="mt-7 font-display text-3xl font-semibold tracking-tight text-orchid-dark">
                {BRAND_NAME.slice(0, 7)}
                <span className="italic text-orchid-pink">{BRAND_NAME.slice(7)}</span>
            </p>

            <div className="mt-5 h-1 w-52 overflow-hidden rounded-full bg-orchid-powder">
                <div className="site-loader-slide h-full w-1/3 rounded-full bg-gradient-to-r from-orchid-pink to-orchid-violet" />
            </div>
        </div>
    );
}
