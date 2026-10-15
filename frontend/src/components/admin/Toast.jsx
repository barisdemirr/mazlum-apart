"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";

const ToastContext = createContext(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast, ToastProvider içinde kullanılmalı.");
    return context;
}

const STYLES = {
    success: { icon: "check_circle", cls: "border-ad-ok/25 bg-ad-ok-soft text-ad-ok" },
    error: { icon: "error", cls: "border-ad-danger/30 bg-ad-danger-soft text-ad-danger" },
    info: { icon: "info", cls: "border-ad-line bg-ad-surface text-ad-body" },
};

export default function ToastProvider({ children }) {
    const [items, setItems] = useState([]);

    const dismiss = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), []);

    const push = useCallback(
        (type, message) => {
            const id = Math.random().toString(36).slice(2);
            setItems((list) => [...list, { id, type, message }]);
            setTimeout(() => dismiss(id), type === "error" ? 6000 : 3500);
        },
        [dismiss]
    );

    const api = useMemo(
        () => ({
            success: (m) => push("success", m),
            error: (m) => push("error", m),
            info: (m) => push("info", m),
        }),
        [push]
    );

    return (
        <ToastContext.Provider value={api}>
            {children}

            <div
                aria-live="polite"
                className="pointer-events-none fixed inset-x-3 bottom-3 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:end-6 sm:items-end"
            >
                {items.map((t) => {
                    const style = STYLES[t.type] ?? STYLES.info;
                    return (
                        <div
                            key={t.id}
                            role="status"
                            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-ad-lg ${style.cls}`}
                        >
                            <Icon name={style.icon} className="mt-px shrink-0 text-[18px]" />
                            <span className="min-w-0 flex-1">{t.message}</span>
                            <button
                                type="button"
                                onClick={() => dismiss(t.id)}
                                aria-label="Kapat"
                                className="-me-1 shrink-0 opacity-50 transition-opacity hover:opacity-100"
                            >
                                <Icon name="close" className="text-[16px]" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}