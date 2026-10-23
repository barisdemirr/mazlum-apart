import { admin } from "@/lib/admin/api";

/** Ön başvurular: durum / not güncelleme, silme, sitedeki alanın ayarları. SMS için commands/support.js (preRegistrationId alıcısı). */

/** Yalnızca verilen alan değişir: status ya da adminNote boş bırakılırsa backend dokunmaz */
export const updatePreRegistration = ({ id, status, adminNote }) =>
    admin.put(`/pre-registrations/${id}`, { status: status ?? null, adminNote: adminNote ?? null });

export const deletePreRegistration = ({ id }) => admin.del(`/pre-registrations/${id}`);

export const savePreRegistrationSettings = ({ enabled, announceDate }) =>
    admin.put("/pre-registrations/settings", { enabled: Boolean(enabled), announceDate: announceDate || null });
