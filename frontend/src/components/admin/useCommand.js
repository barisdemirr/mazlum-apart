"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { track } from "@/lib/admin/progress";
import { ApiError } from "@/lib/api/error";

/** ApiError -> kullanıcıya gösterilecek tek metin (alan hataları birleştirilir) */
export function errorText(error) {
    if (error instanceof ApiError) {
        const messages = error.getAllMessages().filter(Boolean);
        if (error.errors && messages.length) return messages.join(" ");
        return error.detail || (error.status === 0 ? error.detail : null) || error.title || "İşlem tamamlanamadı.";
    }
    return error?.message || "İşlem tamamlanamadı.";
}

/**
 * Bir komutu çalıştırır: bekleme durumu, hata/başarı bildirimi, başarıdan sonra sayfa verisini yenileme.
 *   const { exec, busy } = useCommand();
 *   const out = await exec(approveApplication, { id }, "Başvuru onaylandı.");   // out: { ok, result } | { ok:false, error }
 * `command`, girdiyi alıp API'ye giden async fonksiyondur (lib/admin/commands/*).
 * { refresh: false } verilirse sayfa yenilenmez (örn. dosya yükleme sürerken).
 */
export default function useCommand() {
    const router = useRouter();
    const toast = useToast();
    const [busy, setBusy] = useState(false);

    const exec = useCallback(
        async (command, input, success, { refresh = true } = {}) => {
            setBusy(true);
            try {
                const result = await track(command(input));
                if (success) toast.success(typeof success === "function" ? success(result) : success);
                if (refresh) router.refresh();
                return { ok: true, result };
            } catch (error) {
                toast.error(errorText(error));
                return { ok: false, error };
            } finally {
                setBusy(false);
            }
        },
        [router, toast]
    );

    return { exec, busy };
}
