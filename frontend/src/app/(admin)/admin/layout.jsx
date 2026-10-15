import { Manrope, Newsreader } from "next/font/google";
import "@/styles/admin.css";
import PwaRegister from "@/components/pwa/PwaRegister";

/* Yönetim paneli ana siteden BAĞIMSIZDIR: kendi <html> köküne, kendi CSS'ine ve kendi yazı tiplerine sahiptir. */
const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope", display: "swap" });
const newsreader = Newsreader({
    subsets: ["latin", "latin-ext"],
    variable: "--font-newsreader",
    display: "swap",
});

export const metadata = {
    title: { default: "Yönetim Paneli", template: "%s | Mazlum Apart Yönetim" },
    robots: { index: false, follow: false },
    // Yönetim paneli kendi başına kurulabilen bir PWA'dır: /admin kapsamı, kendi manifest'i ve service worker'ı
    manifest: "/pwa/admin.webmanifest",
    applicationName: "Mazlum Yönetim",
    appleWebApp: { capable: true, title: "Mazlum Yönetim", statusBarStyle: "default" },
    icons: {
        icon: [{ url: "/pwa/admin-192.png", sizes: "192x192", type: "image/png" }],
        apple: [{ url: "/pwa/admin-apple-180.png", sizes: "180x180", type: "image/png" }],
    },
    formatDetection: { telephone: false, address: false, email: false },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#1e40af", viewportFit: "cover" };

export default function AdminRootLayout({ children }) {
    return (
        <html lang="tr" className={`${manrope.variable} ${newsreader.variable}`}>
            <head>
                {/* eslint-disable-next-line @next/next/no-page-custom-font */}
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=block"
                />
            </head>
            <body>
                <PwaRegister app="admin" />
                <div className="admin-root">{children}</div>
            </body>
        </html>
    );
}
