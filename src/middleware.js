import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/config";

/* ───────────────────────────── SITE (i18n) ─────────────────────────────
 * Türkçe öneksizdir (/odalar), İngilizce /en altındadır (/en/odalar).
 * Panel (/admin) ve öğrenci alanı ilgili aşamalarda buraya eklenecek.
 */
function handleSite(request) {
    const { pathname } = request.nextUrl;
    const first = pathname.split("/")[1];

    // /tr/... kopya içerik olmasın diye öneksiz adrese kalıcı yönlenir
    if (first === DEFAULT_LOCALE) {
        const url = request.nextUrl.clone();
        url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
        return NextResponse.redirect(url, 308);
    }

    // /en/... doğrudan [lang] rotasına gider
    if (LOCALES.includes(first)) {
        return NextResponse.next();
    }

    // Öneksiz adresler Türkçedir: içeride /tr/... olarak yeniden yazılır, tarayıcıda adres değişmez
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.rewrite(url);
}

export function middleware(request) {
    return handleSite(request);
}

export const config = {
    // api, _next, sitemap.xml, robots.txt ve dosya uzantılı istekler hariç
    matcher: ["/((?!api|_next|sitemap\\.xml|robots\\.txt|.*\\..*).*)"],
};
