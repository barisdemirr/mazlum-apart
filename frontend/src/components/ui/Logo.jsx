/** Marka logosu: public/logo.png (kare, 512x512). Boyut className ile verilir. */
export default function Logo({ className = "h-10 w-10" }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/logo.png" alt="Mazlum Apart" width={512} height={512} className={`shrink-0 object-contain ${className}`} />;
}
