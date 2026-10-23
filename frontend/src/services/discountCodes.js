import { bffPost } from "@/lib/api/bff";

/**
 * Başvuru formunda indirim kodu kontrolü (tarayıcıdan, vekil üzerinden).
 * code -> { code, kind: "percent" | "fixed", value, restricted }  (restricted: kod belirli bir T.C.'ye özel)
 * Hata: ApiError. 400 -> kod geçersiz / süresi dolmuş, 429 -> çok fazla deneme.
 */
export const checkDiscountCode = (code) => bffPost("/discount-codes/check", { code });
