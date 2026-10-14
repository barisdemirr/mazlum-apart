import "@/styles/globals.css";
import { notFound } from "next/navigation";
import { Fraunces, Manrope } from "next/font/google";
import { Providers } from "./providers";
import UserShell from "@/components/layout/UserShell";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { LOCALES, OG_LOCALES, isLocale } from "@/lib/i18n/config";
import { PRELOADER_STORAGE_KEY } from "@/lib/constants";

const fraunces = Fraunces({
    subsets: ["latin", "latin-ext"],
    style: ["normal", "italic"],
    axes: ["opsz", "SOFT"],
    variable: "--font-fraunces",
    display: "swap",
});

const manrope = Manrope({
    subsets: ["latin", "latin-ext"],
    variable: "--font-manrope",
    display: "swap",
});

export const viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#b4398f",
};

export function generateStaticParams() {
    return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }) {
    const { lang } = await params;
    if (!isLocale(lang)) return {};

    const t = getDictionary(lang);

    return {
        title: { default: t.meta.title, template: "%s | Mazlum Apart" },
        description: t.meta.description,
        applicationName: "Mazlum Apart",
        formatDetection: { telephone: false, address: false, email: false },
        openGraph: {
            title: t.meta.title,
            description: t.meta.description,
            siteName: "Mazlum Apart",
            locale: OG_LOCALES[lang],
            type: "website",
        },
    };
}

export default async function LangLayout({ children, params }) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();

    return (
        <html lang={lang} className={`${fraunces.variable} ${manrope.variable}`} suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                {/* İkon fontu: FILL ekseni dolu ikonlar için gerekli */}
                {/* eslint-disable-next-line @next/next/no-page-custom-font */}
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
                />
                {/* Açılış bu oturumda görüldüyse ilk boyamadan önce gizle (titreme olmasın) */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `try{if(sessionStorage.getItem(${JSON.stringify(PRELOADER_STORAGE_KEY)})==="1")document.documentElement.setAttribute("data-preloader-seen","1")}catch(e){}`,
                    }}
                />
            </head>
            <body>
                <Providers locale={lang}>
                    <UserShell>{children}</UserShell>
                </Providers>
            </body>
        </html>
    );
}
