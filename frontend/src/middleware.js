import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, LANG_COOKIE, LANG_COOKIE_MAX_AGE, LOCALES, stripLocale } from "@/lib/i18n/config";
import { STUDENT_COOKIE, readStudentToken } from "@/lib/student/auth";
import { ADMIN_COOKIE, ADMIN_HOME, ADMIN_LOGIN, readAdminToken } from "@/lib/admin/auth";

/* ───────────────────────────── İKİ ROL, KATI KURALLAR ─────────────────────────────
 * Sistemde iki oturum türü vardır ve birbirinin alanına GİREMEZ:
 *
 *   yönetici (ma_admin,   typ "admin")   -> yalnızca /admin
 *   öğrenci  (ma_student, typ "student") -> yalnızca /ogrenci
 *
 * Kurallar (her iki alan için aynı mantık):
 *  1. Alanın giriş sayfası dışındaki her sayfa o ALANIN rolüyle oturum ister.
 *  2. Yanlış rolün oturumu "geçerli" sayılmaz; token'daki `typ` alanı beklenen rol değilse reddedilir.
 *     (Öğrenci token'ı ma_admin çerezine konsa bile yönetici olamaz, tersi de geçerli.)
 *  3. Karşı rolün geçerli oturumu varsa kişi giriş sayfasına değil KENDİ alanına gönderilir.
 *  4. Giriş yapmış kişi kendi alanının giriş sayfasını görmez, kendi ana sayfasına gider.
 *  5. Süresi dolmuş çerez temizlenir ve girişe ?expired=1 ile yönlenir; dönüş adresi `from` ile taşınır.
 *  6. Yanıtlar önbelleğe alınmaz ve arama motorlarına kapatılır.
 *  7. Yönetim paneli yalnızca Türkçedir ve [lang] ağacının dışındadır: /en/admin ve /tr/admin kabul edilmez.
 *  8. Öğrenci portalı PWA olarak kurulur ve PWA kapsamı tek bir yol önekidir (/ogrenci). Bu yüzden portalın adresi
 *     dil öneki taşımaz: dil `ma_lang` çerezinden okunur ve içeride /en/ogrenci/... olarak yeniden yazılır.
 *     /en/ogrenci/... ve /tr/ogrenci/... adresleri (ana sitedeki bağlantılar, eski linkler) çerezi ayarlayıp
 *     öneksiz adrese yönlenir.
 *
 * Token'ın imzası burada doğrulanamaz (anahtar backend'de); süre ve rol bakılır.
 * İmzası sahte bir token backend'den 401 alır ve girişe döner.
 * /api/admin ve /api/ai uçları matcher dışındadır; kendi içlerinde yönetici çerezini ayrıca doğrular.
 */
const AREAS = {
    student: {
        prefix: "/ogrenci",
        login: "/ogrenci/giris",
        home: "/ogrenci",
        cookie: STUDENT_COOKIE,
        read: readStudentToken,
        localized: true, // sayfa ağacı [lang] altındadır, ama adreste önek YOK (kural 8)
    },
    admin: {
        prefix: "/admin",
        login: ADMIN_LOGIN,
        home: ADMIN_HOME,
        cookie: ADMIN_COOKIE,
        read: readAdminToken,
        localized: false,
    },
};

const inArea = (path, area) => path === area.prefix || path.startsWith(`${area.prefix}/`);

function clearCookie(response, name) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
    return response;
}

/** Korunan alan yanıtları önbelleğe alınmaz, arama motorlarına açılmaz */
function privateHeaders(response) {
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
}

function handleArea(request, area, other, localePrefix, path) {
    const { search, searchParams } = request.nextUrl;
    const isLogin = path === area.login;

    const cookie = request.cookies.get(area.cookie)?.value;
    const signedIn = Boolean(area.read(cookie));
    // Karşı rolün çerezi geçerli mi? (yalnızca yönlendirme kararı için; asla bu alana giriş hakkı vermez)
    const otherSignedIn = Boolean(other.read(request.cookies.get(other.cookie)?.value));
    const otherHome = `${other.localized ? localePrefix : ""}${other.home}`;

    // Kural 3: karşı rolün oturumu var, bu alanın yok -> kendi alanına
    if (!signedIn && otherSignedIn) {
        return privateHeaders(NextResponse.redirect(new URL(otherHome, request.url)));
    }

    // Kural 4: giriş yapmış kişi giriş sayfasını görmez
    if (isLogin && signedIn) {
        return privateHeaders(
            NextResponse.redirect(new URL(`${area.localized ? localePrefix : ""}${area.home}`, request.url))
        );
    }

    // Kural 1 ve 5: oturum yok -> giriş (kaldığı yer `from` ile taşınır)
    if (!isLogin && !signedIn) {
        const url = new URL(`${area.localized ? localePrefix : ""}${area.login}`, request.url);
        const from = path + search;
        if (from !== area.home) url.searchParams.set("from", from);
        if (cookie) url.searchParams.set("expired", "1"); // çerez vardı ama süresi dolmuş ya da rolü yanlış
        return privateHeaders(clearCookie(NextResponse.redirect(url), area.cookie));
    }

    const next = area.localized ? rewriteForStudent(request) : NextResponse.next();

    // Süresi dolmuş çerezi temizleyerek giriş sayfasına devam et
    if (isLogin && searchParams.get("expired") === "1" && cookie) clearCookie(next, area.cookie);

    return privateHeaders(next);
}

/** Öğrenci alanı: dil çerezine göre /ogrenci/... -> /{lang}/ogrenci/... (adres çubuğu değişmez) */
function rewriteForStudent(request) {
    const lang = request.cookies.get(LANG_COOKIE)?.value;
    const locale = LOCALES.includes(lang) ? lang : DEFAULT_LOCALE;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
}

/** /en/ogrenci/... ve /tr/ogrenci/... -> öneksiz adres, seçilen dil çereze yazılır (307: çerez ayarlandığı için kalıcı değil) */
function redirectStudentLocale(request, locale, path) {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const response = NextResponse.redirect(url, 307);
    response.cookies.set(LANG_COOKIE, locale, { path: "/", maxAge: LANG_COOKIE_MAX_AGE, sameSite: "lax" });
    return privateHeaders(response);
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

    // Kural 7: yönetim paneli dil önekini kabul etmez, öneksiz adrese kalıcı yönlenir
    if (LOCALES.includes(first) && inArea(path, AREAS.admin)) {
        const url = request.nextUrl.clone();
        url.pathname = path;
        return NextResponse.redirect(url, 308);
    }

    // Kural 8: /en/ogrenci ve /tr/ogrenci öneksiz adrese yönlenir, dil çereze yazılır
    if (LOCALES.includes(first) && inArea(path, AREAS.student)) {
        return redirectStudentLocale(request, first, path);
    }

    if (inArea(pathname, AREAS.student)) {
        return handleArea(request, AREAS.student, AREAS.admin, "", pathname);
    }

    if (inArea(pathname, AREAS.admin)) {
        return handleArea(request, AREAS.admin, AREAS.student, "", pathname);
    }

    return handleSite(request);
}

export const config = {
    // api, _next, sitemap.xml, robots.txt ve dosya uzantılı istekler hariç
    matcher: ["/((?!api|_next|sitemap\\.xml|robots\\.txt|.*\\..*).*)"],
};
