"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import ModalPortal from "@/components/admin/ModalPortal";

/**
 * open, title, message, confirmLabel, onConfirm (async olabilir), onCancel
 * Yıkıcı işlemler için: silme, pasife alma.
 */
export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "Sil",
    danger = true,
    onConfirm,
    onCancel,
}) {
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && !busy && onCancel?.();
        document.addEventListener("keydown", onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previous;
        };
    }, [open, busy, onCancel]);

    if (!open) return null;

    const confirm = async () => {
        setBusy(true);
        try {
            await onConfirm?.();
        } finally {
            setBusy(false);
        }
    };

    return (
        <ModalPortal>
        <div className="fixed inset-0 z-[65] flex items-end justify-center bg-ad-ink/55 p-4 backdrop-blur-sm sm:items-center">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                className="w-full max-w-md rounded-3xl border border-ad-line bg-ad-surface p-5 shadow-ad-lg sm:p-6"
            >
                <div className="flex items-start gap-3.5">
                    <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${danger ? "bg-ad-danger-soft text-ad-danger" : "bg-ad-sunken text-ad-body"
                            }`}
                    >
                        <Icon name={danger ? "warning" : "help"} className="text-[22px]" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                        <h2 id="confirm-title" className="text-base font-bold">
                            {title}
                        </h2>
                        {message && <p className="mt-1.5 text-sm leading-relaxed text-ad-muted">{message}</p>}
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="ad-btn ad-btn-outline"
                    >
                        Vazgeç
                    </button>
                    <button
                        type="button"
                        onClick={confirm}
                        disabled={busy}
                        className={`ad-btn ${danger ? "ad-btn-danger" : "ad-btn-primary"}`}
                    >
                        {busy && <Icon name="progress_activity" className="animate-spin text-[17px]" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
        </ModalPortal>
    );
}