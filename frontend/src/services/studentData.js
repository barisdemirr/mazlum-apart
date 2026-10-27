import "server-only";
import { cache } from "react";
import { serverFetch } from "@/lib/api/server";
import { adaptPayments, adaptRequest, adaptStudent } from "@/lib/api/adapters";

/**
 * Giriş yapmış öğrencinin kendi verisi (sunucu bileşenlerinde). Token httpOnly çerezden okunur; süresi dolmuşsa
 * kullanıcı çerezi temizleyen oturum rotası üzerinden girişe yönlenir. `cache`: aynı istekte (layout + sayfa) tek çağrı.
 */
const asStudent = { role: "student" };

/** GET /api/student/me */
export const getStudentProfile = cache(async () => adaptStudent(await serverFetch("/student/me", asStudent)));

/** GET /api/student/renewal -> kayıt yenileme verisi (önceki kayıt, açık dönemler + güncel fiyatlar, başvurular) */
export const getStudentRenewal = async () => serverFetch("/student/renewal", asStudent);

/** GET /api/student/payments -> { period, bank, ledger } */
export const getStudentLedger = cache(async () => adaptPayments(await serverFetch("/student/payments", asStudent)));

/** GET /api/student/maintenance-requests */
export async function getMaintenanceRequests() {
    const list = await serverFetch("/student/maintenance-requests", asStudent);
    return (list ?? []).map(adaptRequest);
}
