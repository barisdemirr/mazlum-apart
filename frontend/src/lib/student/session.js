import "server-only";
import { cookies } from "next/headers";
import { STUDENT_COOKIE, readStudentToken } from "./auth";

/** Geçerli oturumun token yükü ({ sub, exp }) ya da null */
export async function getStudentSession() {
    const store = await cookies();
    return readStudentToken(store.get(STUDENT_COOKIE)?.value);
}
