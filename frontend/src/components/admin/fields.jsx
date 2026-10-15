"use client";

import { useRef } from "react";
import Icon from "@/components/ui/Icon";

/** Etiket + yardım metni + hata sarmalayıcısı */
export function Field({ label, hint, error, required, htmlFor, children, className = "" }) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-xs font-semibold text-ad-body">
                    {label}
                    {required && <span className="text-ad-danger">*</span>}
                </label>
            )}
            {children}
            {error ? (
                <p className="flex items-start gap-1.5 text-xs text-ad-danger">
                    <Icon name="error" className="mt-px shrink-0 text-[13px]" />
                    {error}
                </p>
            ) : (
                hint && <p className="text-xs text-ad-faint">{hint}</p>
            )}
        </div>
    );
}

export function TextInput({ error, as = "input", rows = 4, ...rest }) {
    const Tag = as;
    return (
        <Tag
            {...rest}
            {...(as === "textarea" ? { rows } : {})}
            aria-invalid={error ? "true" : undefined}
            className={`ad-field ${as === "textarea" ? "min-h-24 resize-y leading-relaxed" : ""}`}
        />
    );
}

export function SelectInput({ error, children, ...rest }) {
    return (
        <span className="relative block">
            <select {...rest} aria-invalid={error ? "true" : undefined} className="ad-field cursor-pointer pe-10">
                {children}
            </select>
            <Icon
                name="expand_more"
                className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[20px] text-ad-muted"
            />
        </span>
    );
}

/** Para, sayı: sağa hizalı, birim eki */
export function NumberInput({ suffix, error, ...rest }) {
    return (
        <span className="relative block">
            <input
                {...rest}
                type="number"
                inputMode="decimal"
                dir="ltr"
                aria-invalid={error ? "true" : undefined}
                className={`ad-field ${suffix ? "pe-14" : ""}`}
            />
            {suffix && (
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ad-muted">
                    {suffix}
                </span>
            )}
        </span>
    );
}

/** Açık/kapalı anahtarı */
export function Switch({ checked, onChange, label, hint, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className="flex w-full items-center justify-between gap-4 rounded-xl border border-ad-line bg-ad-surface px-4 py-3 text-start transition-colors hover:border-ad-line-strong disabled:opacity-60"
        >
            <span className="min-w-0">
                <span className="block text-sm font-semibold">{label}</span>
                {hint && <span className="mt-0.5 block text-xs text-ad-muted">{hint}</span>}
            </span>
            <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-ad-brand" : "bg-ad-line-strong"
                    }`}
            >
                <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${checked ? "start-[1.4rem]" : "start-0.5"
                        }`}
                />
            </span>
        </button>
    );
}

/** Form bölümü: başlık + kart */
export function FormSection({ title, description, children, columns = 2 }) {
    return (
        <section className="ad-card p-4 sm:p-6">
            <div className="mb-5">
                <h2 className="text-sm font-bold">{title}</h2>
                {description && <p className="mt-1 text-xs text-ad-muted">{description}</p>}
            </div>
            <div className={`grid grid-cols-1 gap-4 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>{children}</div>
        </section>
    );
}

/** Formun altındaki sabit işlem çubuğu */
export function FormActions({ busy, onCancel, saveLabel = "Kaydet", extra }) {
    return (
        <div className="sticky bottom-0 z-10 -mx-3 flex items-center gap-2 border-t border-ad-line bg-ad-surface/90 px-3 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            {extra}
            <div className="ms-auto flex items-center gap-2">
                {onCancel && (
                    <button type="button" onClick={onCancel} disabled={busy} className="ad-btn ad-btn-outline">
                        Vazgeç
                    </button>
                )}
                <button type="submit" disabled={busy} className="ad-btn ad-btn-primary">
                    {busy && <Icon name="progress_activity" className="animate-spin text-[17px]" />}
                    {saveLabel}
                </button>
            </div>
        </div>
    );
}

/** Tarih alanı: ekranda her zaman gg/aa/yyyy, tıklayınca cihazın takvimi açılır */
export function DateInput({ value, onChange, error, min, max, required }) {
    const ref = useRef(null);
    const text = value ? value.split("-").reverse().join("/") : "";

    // Chrome takvimi yalnızca kendi simgesine basılınca açıyor, simge görünmez olduğu için elle açıyoruz
    const openPicker = () => {
        try {
            ref.current?.showPicker?.();
        } catch {
            ref.current?.focus();
        }
    };

    return (
        <span
            onClick={openPicker}
            className="ad-field relative flex cursor-pointer items-center justify-between gap-2"
        >
            <span className={text ? "" : "text-ad-faint"}>{text || "gg/aa/yyyy"}</span>
            <Icon name="calendar_month" className="shrink-0 text-[18px] text-ad-muted" />
            <input
                ref={ref}
                type="date"
                value={value ?? ""}
                min={min}
                max={max}
                required={required}
                aria-invalid={error ? "true" : undefined}
                onChange={onChange}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
        </span>
    );
}