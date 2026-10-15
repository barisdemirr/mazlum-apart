"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { writePeriodCookie } from "@/lib/admin/client";

/**
 * Panel bağlamı: oturumdaki yönetici, dönemler, seçili dönem, menü sayaçları.
 * Veri burada TUTULMAZ: her sayfa kendi verisini sunucuda okur (lib/admin/data.js), komutlar API'ye gider (lib/admin/commands)
 * ve useCommand başarıdan sonra sayfayı yeniler. Dönem değişince çerez yazılır ve tüm sayfa yeni dönemle yeniden okunur.
 */
const AdminContext = createContext(null);

export function useAdmin() {
    const ctx = useContext(AdminContext);
    if (!ctx) throw new Error("useAdmin, AdminDataProvider içinde kullanılmalı.");
    return ctx;
}

export default function AdminDataProvider({ user, periods, period, badges, today, children }) {
    const router = useRouter();

    const selectPeriod = useCallback(
        (id) => {
            writePeriodCookie(id);
            router.refresh();
        },
        [router]
    );

    const value = useMemo(
        () => ({ user, periods, period, periodId: period?.id ?? null, badges, today, selectPeriod }),
        [user, periods, period, badges, today, selectPeriod]
    );

    return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
