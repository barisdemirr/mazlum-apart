import { Suspense } from "react";
import Icon from "@/components/ui/Icon";
import LoginForm from "./LoginForm";

export const metadata = {
    title: "Giriş",
    robots: { index: false, follow: false },
};

const POINTS = [
    { icon: "assignment_ind", text: "Başvuru, kayıt ve yerleşim tek yerden" },
    { icon: "account_balance", text: "Dönem bazlı öğrenci hesapları, kasa ve banka" },
    { icon: "translate", text: "Türkçe ve İngilizce içerik tek formda" },
];

export default function LoginPage() {
    return (
        <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
            {/* Marka paneli: yalnızca masaüstü */}
            <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-ad-brand-dark via-ad-brand to-ad-accent p-12 text-white lg:flex">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-white/10 blur-[110px]"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-40 -right-20 h-[420px] w-[420px] rounded-full bg-ad-accent-bright/25 blur-[110px]"
                />

                <div className="relative flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                        <Icon name="apartment" className="text-[24px]" />
                    </span>
                    <span className="flex flex-col leading-tight">
                        <span className="text-base font-bold tracking-tight">Mazlum Apart</span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                            Yönetim Paneli
                        </span>
                    </span>
                </div>

                <div className="relative max-w-md">
                    <h2 className="ad-display text-[40px] font-semibold leading-[1.1]">
                        Apartın tüm işleri, tek panelde.
                    </h2>
                    <ul className="mt-9 flex flex-col gap-4">
                        {POINTS.map((p) => (
                            <li key={p.icon} className="flex items-center gap-3 text-sm text-white/85">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/15">
                                    <Icon name={p.icon} className="text-[20px]" />
                                </span>
                                {p.text}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs text-white/55">© {new Date().getFullYear()} Mazlum Apart</p>
            </div>

            {/* Form */}
            <div className="flex items-center justify-center px-4 py-12 sm:px-8">
                <Suspense>
                    <LoginForm />
                </Suspense>
            </div>
        </div>
    );
}
