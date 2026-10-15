import "server-only";
import { cookies } from "next/headers";
import { STUDENT_COOKIE, readStudentToken } from "./auth";

export const cookieOptions = (maxAge) => ({
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(maxAge ? { maxAge } : {}), // maxAge yoksa tarayıcı kapanınca biter
});

/** Geçerli oturumun token yükü ({ sub, exp }) ya da null */
export async function getStudentSession() {
    const store = await cookies();
    return readStudentToken(store.get(STUDENT_COOKIE)?.value);
}
