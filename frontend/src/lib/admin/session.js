import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, readAdminToken } from "./auth";

export const cookieOptions = (maxAge) => ({
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(maxAge !== undefined ? { maxAge } : {}),
});

/** Geçerli yönetici oturumunun token yükü ya da null */
export async function getAdminSession() {
    const store = await cookies();
    return readAdminToken(store.get(ADMIN_COOKIE)?.value);
}
