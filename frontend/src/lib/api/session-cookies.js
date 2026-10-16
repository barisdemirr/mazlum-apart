import { STUDENT_COOKIE, STUDENT_REFRESH_COOKIE } from "@/lib/student/auth";
import { ADMIN_COOKIE, ADMIN_REFRESH_COOKIE, ADMIN_HOME } from "@/lib/admin/auth";

/**
 * Oturum çerezleri (yalnızca sunucu: oturum rotaları ve vekil yazar). Her rolün İKİ httpOnly çerezi vardır:
 *   access  : kısa ömürlü JWT (backend doğrular, ~15 dk). Vekil bunu Authorization olarak iletir.
 *   refresh : opak yenileme anahtarı. Access süresi dolunca (middleware ya da vekil) yeni çift almak için kullanılır.
 * İkisi de aynı ömürde saklanır: access çerezi süresi dolsa bile tarayıcıda kalır, böylece "süresi doldu mu" kararını
 * token içindeki exp verir ve yenileme tetiklenir. maxAge 0 ise oturum çerezidir (tarayıcı kapanınca biter).
 */
export const SESSION_COOKIES = {
    student: { access: STUDENT_COOKIE, refresh: STUDENT_REFRESH_COOKIE, home: "/ogrenci", login: "/ogrenci/giris" },
    admin: { access: ADMIN_COOKIE, refresh: ADMIN_REFRESH_COOKIE, home: ADMIN_HOME, login: "/admin/login" },
};

const options = (maxAge) => ({
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(maxAge > 0 ? { maxAge } : {}),
});

/** Çerez deposuna yazar (response.cookies ya da route handler'da next/headers cookies()). session: { token, refreshToken, maxAge } */
export function writeSession(store, role, session) {
    const names = SESSION_COOKIES[role];
    store.set(names.access, session.token, options(session.maxAge));
    store.set(names.refresh, session.refreshToken, options(session.maxAge));
}

export function setSession(response, role, session) {
    writeSession(response.cookies, role, session);
    return response;
}

export function clearSession(response, role) {
    const names = SESSION_COOKIES[role];
    response.cookies.set(names.access, "", { path: "/", maxAge: 0 });
    response.cookies.set(names.refresh, "", { path: "/", maxAge: 0 });
    return response;
}

/** Yenilemeden sonra dönülecek adres: yalnızca o rolün alanı içi (açık yönlendirme engeli), sorgu dizesi serbest */
export function safeRefreshTarget(to, role) {
    const names = SESSION_COOKIES[role];
    if (typeof to !== "string" || to.length > 500 || to.startsWith("//")) return names.home;
    const pattern = role === "admin" ? /^\/admin(\/[\w-]*)*(\?[\w\-.=&%]*)?$/ : /^\/ogrenci(\/[\w-]*)*(\?[\w\-.=&%]*)?$/;
    if (!pattern.test(to)) return names.home;
    return to.split("?")[0] === names.login ? names.home : to;
}
