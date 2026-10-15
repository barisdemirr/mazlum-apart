"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { buildSeed } from "@/lib/admin/mock/seed";
import { writePeriodCookie } from "@/lib/admin/client";
import { track } from "@/lib/admin/progress";
import { todayISO } from "@/lib/admin/domain/dates";
import { DomainError } from "@/lib/admin/domain/core";
import { periodView } from "@/lib/admin/domain/selectors";

/**
 * Panel veri katmanı. Şimdilik bellekte çalışır (sayfa yenilenince örnek veriye döner):
 * her komut, backend'deki bir endpoint'in karşılığı olan saf bir fonksiyondur.
 *
 * Backend gelince YALNIZCA bu dosya değişir: run() bir fetch'e, state bir önbelleğe dönüşür.
 * Ekranlar `useAdmin()` üzerinden okur ve `run(komut, girdi)` ile yazar; başka hiçbir şey bilmez.
 */
const AdminDataContext = createContext(null);

export function useAdmin() {
    const ctx = useContext(AdminDataContext);
    if (!ctx) throw new Error("useAdmin, AdminDataProvider içinde kullanılmalı.");
    return ctx;
}

export default function AdminDataProvider({ user, initialPeriodId, children }) {
    const [state, setState] = useState(() => buildSeed());
    const stateRef = useRef(state);
    const [today] = useState(() => todayISO());

    const [periodId, setPeriodId] = useState(() => {
        const exists = state.periods.some((p) => p.id === initialPeriodId);
        return exists ? initialPeriodId : (state.periods.find((p) => p.status === "active") ?? state.periods[0]).id;
    });

    const selectPeriod = useCallback((id) => {
        setPeriodId(id);
        writePeriodCookie(id);
    }, []);

    /**
     * Komut çalıştırır: run(ledger.recordPayment, { ... }) -> sonuç.
     * Hata olursa DomainError fırlatır (arayüz mesajını toast'ta gösterir). Ağ gecikmesi taklit edilir.
     */
    const run = useCallback(
        async (command, input) => {
            await track(new Promise((resolve) => setTimeout(resolve, 350)));
            const ctx = { now: new Date().toISOString(), today: todayISO(), by: user?.name ?? "Yönetici" };
            const out = command(stateRef.current, input, ctx);
            stateRef.current = out.state;
            setState(out.state);
            return out.result;
        },
        [user]
    );

    const view = useMemo(() => periodView(state, periodId, today), [state, periodId, today]);

    const value = useMemo(
        () => ({ state, view, periodId, period: view.period, periods: state.periods, selectPeriod, run, today, user }),
        [state, view, periodId, selectPeriod, run, today, user]
    );

    return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export { DomainError };
