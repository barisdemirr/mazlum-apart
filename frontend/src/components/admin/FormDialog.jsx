"use client";

import { useEffect } from "react";
import Icon from "@/components/ui/Icon";
import ModalPortal from "@/components/admin/ModalPortal";

const SIZES = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

/**
 * Modal pencere. `onSubmit` verilirse form olur (Enter ile gönderilir).
 * Mobilde alttan açılan sayfa, masaüstünde ortada kart.
 */
export default function FormDialog({
    open,
    title,
    description,
    busy,
    onSubmit,
    onClose,
    saveLabel = "Kaydet",
    size = "md",
    columns = 2,
    footer,
    hideFooter = false,
    danger = false,
    children,
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && !busy && onClose();
        document.addEventListener("keydown", onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previous;
        };
    }, [open, busy, onClose]);

    if (!open) return null;

    const Shell = onSubmit ? "form" : "div";

    return (
        <ModalPortal>
        <div className="fixed inset-0 z-[64] flex items-end justify-center bg-ad-ink/50 backdrop-blur-sm sm:items-center sm:p-6">
            <Shell
                {...(onSubmit ? { onSubmit, noValidate: true } : { role: "dialog", "aria-modal": "true" })}
                className={`ad-rise flex max-h-[92dvh] w-full ${SIZES[size]} flex-col overflow-hidden rounded-t-3xl border border-ad-line bg-ad-surface shadow-ad-lg sm:rounded-3xl`}
            >
                <div className="flex shrink-0 items-start gap-3 border-b border-ad-line px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                        <h2 className="ad-display text-xl font-semibold">{title}</h2>
                        {description && <p className="mt-0.5 text-xs text-ad-muted">{description}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="Kapat"
                        className="ms-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ad-muted transition-colors hover:bg-ad-sunken hover:text-ad-ink"
                    >
                        <Icon name="close" className="text-[20px]" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                    <div className={`grid grid-cols-1 gap-4 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>{children}</div>
                </div>

                {!hideFooter && (
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-ad-line px-5 py-4 sm:px-6">
                        {footer}
                        <button type="button" onClick={onClose} disabled={busy} className="ad-btn ad-btn-outline">
                            Vazgeç
                        </button>
                        {onSubmit && (
                            <button type="submit" disabled={busy} className={`ad-btn ${danger ? "ad-btn-danger" : "ad-btn-primary"}`}>
                                {busy && <Icon name="progress_activity" className="animate-spin text-[17px]" />}
                                {saveLabel}
                            </button>
                        )}
                    </div>
                )}
            </Shell>
        </div>
        </ModalPortal>
    );
}
