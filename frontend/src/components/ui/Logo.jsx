/**
 * Marka logosu (şeffaf arka planlı PNG, kare 512x512). Boyut className ile verilir.
 * variant: "dark" (varsayılan, açık zeminler için siyah logo: public/logo.png) | "light" (koyu zeminler için beyaz logo: public/logo-light.png)
 */
export default function Logo({ className = "h-10 w-10", variant = "dark" }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={variant === "light" ? "/logo-light.png" : "/logo.png"} alt="Mazlum Apart" width={512} height={512} className={`shrink-0 object-contain ${className}`} />;
}

/**
 * Yatay marka logosu (simge + "MAZLUM / KIZ ÖĞRENCİ EVLERİ" yazısı bir arada). Yüksekliği className ile verin (örn. "h-10"), genişlik oranla uyar.
 * variant: "dark" (varsayılan, açık zeminler için: public/widelogo.png) | "light" (koyu zeminler için beyaz: public/widelogowhite.png)
 */
export function WideLogo({ className = "h-10", variant = "dark" }) {
    const light = variant === "light";
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={light ? "/widelogowhite.png" : "/widelogo.png"} alt="Mazlum Apart" width={light ? 668 : 670} height={light ? 157 : 154} className={`w-auto shrink-0 object-contain ${className}`} />;
}
