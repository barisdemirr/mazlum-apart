"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { safeAdminReturn, validateAdminLogin } from "@/lib/admin/auth";

export default function LoginForm() {
    const router = useRouter();
    const params = useSearchParams();
    const from = params.get("from");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState(
        params.get("expired") === "1" ? "Oturumunuzun süresi doldu, lütfen tekrar giriş yapın." : ""
    );
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (busy) return;

        const errors = validateAdminLogin({ email: email.trim(), password });
        setFieldErrors(errors);
        if (Object.keys(errors).length) {
            setError("");
            return;
        }

        setBusy(true);
        setError("");

        try {
            const response = await fetch("/api/admin/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });

            if (!response.ok) {
                setError(
                    response.status === 429
                        ? "Çok fazla hatalı deneme yapıldı. Bir dakika sonra tekrar deneyin."
                        : response.status === 401
                          ? "E-posta veya şifre hatalı."
                          : "Giriş yapılamadı, bilgilerinizi kontrol edin."
                );
                setPassword("");
                return;
            }

            router.replace(safeAdminReturn(from));
            router.refresh(); // çerez ayarlandı, sunucu tarafı yeniden değerlendirilsin
        } catch {
            setError("Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="w-full max-w-[400px]">
            {/* Mobil marka */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ad-brand text-white shadow-ad-brand">
                    <Icon name="apartment" className="text-[24px]" />
                </span>
                <span className="flex flex-col leading-tight">
                    <span className="text-base font-bold tracking-tight text-ad-ink">Mazlum Apart</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ad-muted">
                        Yönetim Paneli
                    </span>
                </span>
            </div>

            <h1 className="ad-display text-[32px] font-semibold leading-tight text-ad-ink">Tekrar hoş geldiniz</h1>
            <p className="mt-1.5 text-sm text-ad-muted">Yönetim paneline girmek için hesabınızla oturum açın.</p>

            <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-4">
                {error && (
                    <p
                        role="alert"
                        className="flex items-start gap-2 rounded-xl border border-ad-danger/25 bg-ad-danger-soft px-3.5 py-3 text-sm text-ad-danger"
                    >
                        <Icon name="error" className="mt-px shrink-0 text-[18px]" />
                        <span>{error}</span>
                    </p>
                )}

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ad-body">E-posta</span>
                    <input
                        type="email"
                        autoComplete="username"
                        autoFocus
                        dir="ltr"
                        placeholder="ornek@eposta.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={fieldErrors.email ? "true" : undefined}
                        className="ad-field"
                    />
                    {fieldErrors.email && <span className="text-xs text-ad-danger">{fieldErrors.email}</span>}
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-ad-body">Şifre</span>
                    <span className="relative block">
                        <input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            dir="ltr"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            aria-invalid={fieldErrors.password ? "true" : undefined}
                            className="ad-field pe-12"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                            className="absolute end-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ad-muted transition-colors hover:bg-ad-sunken hover:text-ad-ink"
                        >
                            <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[19px]" />
                        </button>
                    </span>
                    {fieldErrors.password && <span className="text-xs text-ad-danger">{fieldErrors.password}</span>}
                </label>

                <button type="submit" disabled={busy} className="ad-btn ad-btn-primary mt-2 !h-12 text-sm">
                    {busy && <Icon name="progress_activity" className="animate-spin text-[18px]" />}
                    {busy ? "Giriş yapılıyor" : "Giriş Yap"}
                </button>
            </form>

            <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-ad-faint">
                <Icon name="lock" className="text-[14px]" />
                Oturumunuz şifreli çerezle korunur
            </p>
        </div>
    );
}
