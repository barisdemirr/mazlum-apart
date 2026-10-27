/**
 * Marka logosu (şeffaf arka planlı PNG, kare 512x512). Boyut className ile verilir.
 * variant: "dark" (varsayılan, açık zeminler için siyah logo: public/logo.png) | "light" (koyu zeminler için beyaz logo: public/logo-light.png)
 */
export default function Logo({ className = "h-10 w-10", variant = "dark" }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={variant === "light" ? "/logo-light.png" : "/logo.png"} alt="Mazlum Apart" width={512} height={512} className={`shrink-0 object-contain ${className}`} />;
}
