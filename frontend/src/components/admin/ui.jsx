import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { initials } from "@/lib/admin/labels";

/** Panelin küçük, tekrar kullanılan görsel parçaları. Davranış yok, yalnızca görünüm. */

export function PageHeader({ eyebrow, title, description, actions, back }) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
                {back && (
                    <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-ad-brand hover:underline">
                        <Icon name="arrow_back" className="text-[16px]" />
                        {back.label}
                    </Link>
                )}
                {eyebrow && <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ad-muted">{eyebrow}</div>}
                <h1 className="ad-display text-[28px] font-semibold leading-tight sm:text-[32px]">{title}</h1>
                {description && <p className="mt-1 max-w-2xl text-sm text-ad-muted">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export function Badge({ tone = "neutral", children, icon, className = "" }) {
    return (
        <span className={`ad-badge ad-badge-${tone} ${className}`}>
            {icon && <Icon name={icon} className="text-[13px]" />}
            {children}
        </span>
    );
}

/** Durum haritasından rozet: <StatusBadge map={ENROLLMENT_STATUS} value="active" /> */
export function StatusBadge({ map, value }) {
    const item = map[value];
    return item ? <Badge tone={item.tone}>{item.label}</Badge> : null;
}

export function Avatar({ name, size = 32 }) {
    return (
        <span
            style={{ width: size, height: size, fontSize: size * 0.36 }}
            className="flex shrink-0 items-center justify-center rounded-full bg-ad-accent-soft font-bold text-ad-brand-dark"
        >
            {initials(name)}
        </span>
    );
}

export function Card({ title, description, actions, children, className = "", padded = true }) {
    return (
        <section className={`ad-card ${className}`}>
            {(title || actions) && (
                <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
                    <div className="min-w-0">
                        <h2 className="ad-display text-xl font-semibold">{title}</h2>
                        {description && <p className="mt-0.5 text-xs text-ad-muted">{description}</p>}
                    </div>
                    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
                </div>
            )}
            <div className={padded ? "p-5 sm:p-6" : ""}>{children}</div>
        </section>
    );
}

export function EmptyState({ icon = "inbox", title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ad-sunken text-ad-brand">
                <Icon name={icon} className="text-[26px]" />
            </span>
            <p className="mt-4 text-sm font-bold">{title}</p>
            {description && <p className="mt-1 max-w-sm text-xs text-ad-muted">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function ProgressBar({ value, tone = "brand", className = "" }) {
    const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
    const color = { brand: "bg-ad-brand", accent: "bg-ad-accent", ok: "bg-ad-ok", danger: "bg-ad-danger", warn: "bg-ad-warn" }[tone];
    return (
        <div className={`h-2 w-full overflow-hidden rounded-full bg-ad-raised ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
    );
}

/** Sayfa içi sekmeler (bağlantı): alt sayfalı bölümlerde (İçerik, Sistem, Dönemler...) */
export function LinkTabs({ tabs, current }) {
    return (
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-full bg-ad-sunken p-1 ad-scroll">
            {tabs.map((t) => (
                <Link
                    key={t.href}
                    href={t.href}
                    aria-current={t.href === current ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        t.href === current ? "bg-ad-surface text-ad-brand-dark shadow-ad-sm" : "text-ad-body hover:text-ad-ink"
                    }`}
                >
                    {t.icon && <Icon name={t.icon} className="text-[18px]" />}
                    {t.label}
                </Link>
            ))}
        </div>
    );
}

/** Durum filtresi (sayaçlı hap butonlar) */
export function Chips({ items, value, onChange }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((i) => (
                <button
                    key={i.value}
                    type="button"
                    onClick={() => onChange(i.value)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                        value === i.value
                            ? "border-ad-brand bg-ad-brand text-white"
                            : "border-ad-line-strong bg-ad-surface text-ad-body hover:bg-ad-sunken"
                    }`}
                >
                    {i.label}
                    {i.count !== undefined && (
                        <span className={`rounded-full px-1.5 text-[10px] ${value === i.value ? "bg-white/25" : "bg-ad-raised text-ad-brand-dark"}`}>
                            {i.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

export function SearchInput({ value, onChange, placeholder = "Ara..." }) {
    return (
        <span className="relative block w-full sm:w-72">
            <Icon name="search" className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[19px] text-ad-muted" />
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-10 w-full rounded-full bg-ad-sunken ps-10 pe-4 text-sm text-ad-ink outline-none ring-1 ring-ad-line-strong transition-shadow placeholder:text-ad-muted focus:ring-2 focus:ring-ad-brand"
            />
        </span>
    );
}
