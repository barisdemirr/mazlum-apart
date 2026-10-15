import { Manrope, Newsreader } from "next/font/google";
import "@/styles/admin.css";

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
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#1e40af" };

export default function AdminRootLayout({ children }) {
    return (
        <html lang="tr" className={`${manrope.variable} ${newsreader.variable}`}>
            <head>
                {/* eslint-disable-next-line @next/next/no-page-custom-font */}
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
                />
            </head>
            <body>
                <div className="admin-root">{children}</div>
            </body>
        </html>
    );
}
