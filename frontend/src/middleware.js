import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, LOCALES, stripLocale } from "@/lib/i18n/config";
import { STUDENT_COOKIE, readStudentToken } from "@/lib/student/auth";

/* ───────────────────────────── ÖĞRENCİ PORTALI ─────────────────────────────
 * /ogrenci/giris dışındaki her portal sayfası oturum ister.
 * Token'ın imzası burada doğrulanamaz (anahtar backend'de); yalnızca süresine bakılır.
 * İmzası geçersiz bir token backend'den 401 alır ve girişe döner.
 * Admin paneli (/admin) ilgili aşamada buraya eklenecek.
 */
const LOGIN_PATH = "/ogrenci/giris";

function handleStudent(request, localePrefix, path) {
    const { search, searchParams } = request.nextUrl;
    const isLogin = path === LOGIN_PATH;
    const cookie = request.cookies.get(STUDENT_COOKIE)?.value;
    const signedIn = Boolean(readStudentToken(cookie));

    // Giriş yapılmışsa giriş sayfası görülmez
    if (isLogin && signedIn) {
        return NextResponse.redirect(new URL(`${localePrefix}/ogrenci`, request.url));
    }

    // Giriş yok: portal sayfaları girişe gider; girişten sonra kaldığı yere döner
    if (!isLogin && !signedIn) {
        const url = new URL(`${localePrefix}${LOGIN_PATH}`, request.url);
        const from = path + search;
        if (from !== "/ogrenci") url.searchParams.set("from", from);
        if (cookie) url.searchParams.set("expired", "1"); // çerez vardı ama süresi dolmuş
        const response = NextResponse.redirect(url);
        response.cookies.set(STUDENT_COOKIE, "", { path: "/", maxAge: 0 });
        return response;
    }

    if (isLogin && searchParams.get("expired") === "1" && cookie) {
        // süresi dolmuş çerezi temizleyerek giriş sayfasına devam et
        const response = handleSite(request);
        response.cookies.set(STUDENT_COOKIE, "", { path: "/", maxAge: 0 });
        return studentHeaders(response);
    }

    return studentHeaders(handleSite(request));
}

/** Portal yanıtları önbelleğe alınmaz, arama motorlarına açılmaz */
function studentHeaders(response) {
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
}

/* ───────────────────────────── SITE (i18n) ─────────────────────────────
 * Türkçe öneksizdir (/odalar), İngilizce /en altındadır (/en/odalar).
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
    const { pathname } = request.nextUrl;
    const first = pathname.split("/")[1];
    const path = stripLocale(pathname);

    // /tr/... önce öneksiz adrese yönlenir (handleSite), sonra buraya öneksiz gelir
    if (first !== DEFAULT_LOCALE && (path === "/ogrenci" || path.startsWith("/ogrenci/"))) {
        const localePrefix = LOCALES.includes(first) ? `/${first}` : "";
        return handleStudent(request, localePrefix, path);
    }

    return handleSite(request);
}

export const config = {
    // api, _next, sitemap.xml, robots.txt ve dosya uzantılı istekler hariç
    matcher: ["/((?!api|_next|sitemap\\.xml|robots\\.txt|.*\\..*).*)"],
};
