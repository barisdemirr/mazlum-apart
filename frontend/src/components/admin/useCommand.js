"use client";

import { useCallback, useState } from "react";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { useToast } from "@/components/admin/Toast";

/**
 * Bir komutu çalıştırır, bekleme durumunu tutar, başarıda/hatada toast gösterir.
 *   const { exec, busy } = useCommand();
 *   const ok = await exec(approveApplication, { applicationId }, "Başvuru onaylandı.");
 * Hata (DomainError) olursa mesaj toast'ta görünür ve undefined döner.
 */
export default function useCommand() {
    const { run } = useAdmin();
    const toast = useToast();
    const [busy, setBusy] = useState(false);

    const exec = useCallback(
        async (command, input, success) => {
            setBusy(true);
            try {
                const result = await run(command, input);
                if (success) toast.success(success);
                return { ok: true, result };
            } catch (e) {
                toast.error(e?.message || "İşlem tamamlanamadı.");
                return { ok: false, error: e };
            } finally {
                setBusy(false);
            }
        },
        [run, toast]
    );

    return { exec, busy };
}
