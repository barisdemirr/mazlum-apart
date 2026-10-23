import { admin } from "@/lib/admin/api";

/** İndirim kodları (kayıt yenileyen eski öğrenciler). Doğrulama backend'dedir; code boşsa backend okunaklı bir kod üretir. */
export const createDiscountCode = ({ code, label, kind, value, validUntil, maxUses, tc }) =>
    admin.post("/discount-codes", {
        code: code?.trim() || null,
        label: label?.trim() || "",
        kind,
        value: Number(value),
        validUntil: validUntil || null,
        maxUses: maxUses === "" || maxUses == null ? null : Number(maxUses),
        tc: tc?.trim() || null,
    });

/** Tür ve değer sonradan değişmez; gerekirse yeni kod açılır */
export const updateDiscountCode = ({ id, label, validUntil, maxUses, isActive, tc }) =>
    admin.put(`/discount-codes/${id}`, {
        label: label?.trim() || "",
        validUntil: validUntil || null,
        maxUses: maxUses === "" || maxUses == null ? null : Number(maxUses),
        isActive: Boolean(isActive),
        tc: tc?.trim() || null,
    });

export const deleteDiscountCode = ({ id }) => admin.del(`/discount-codes/${id}`);
