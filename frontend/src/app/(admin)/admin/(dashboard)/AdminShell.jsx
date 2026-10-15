"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import ToastProvider from "@/components/admin/Toast";
import AdminProgressBar from "@/components/admin/AdminProgressBar";
import PeriodSwitcher from "@/components/admin/PeriodSwitcher";
import { logout } from "@/lib/admin/client";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { NAV_GROUPS, findNavItem, isActiveItem } from "@/lib/admin/nav";

export default function AdminShell({ user, children }) {
    const pathname = usePathname();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { period: selected, periods, view } = useAdmin();

    // Menü sayaçları: veri katmanından hesaplanır
    const badges = {
        newApplications: view.pendingApplications.length,
        openMaintenance: view.openMaintenance.length,
        dueBills: view.dueBills,
    };

    useEffect(() => {
        setDrawerOpen(false); // sayfa değişince çekmece kapanır
    }, [pathname]);

    useEffect(() => {
        if (!drawerOpen) return;
        const onKey = (e) => e.key === "Escape" && setDrawerOpen(false);
        document.addEventListener("keydown", onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previous;
        };
    }, [drawerOpen]);

    return (
        <div className="flex min-h-dvh">
            <AdminProgressBar />

            {/* Masaüstü kenar çubuğu */}
            <aside className="ad-nav fixed inset-y-0 left-0 z-30 hidden w-72 flex-col lg:flex">
                <SidebarContent pathname={pathname} badges={badges} />
            </aside>

            {/* Mobil çekmece */}
            {drawerOpen && (
                <div className="lg:hidden">
                    <button
                        type="button"
                        aria-label="Menüyü kapat"
                        onClick={() => setDrawerOpen(false)}
                        className="fixed inset-0 z-40 bg-ad-ink/50 backdrop-blur-sm"
                    />
                    <aside className="ad-nav fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-[300px] flex-col !bg-white shadow-ad-lg">
                        <button
                            type="button"
                            onClick={() => setDrawerOpen(false)}
                            aria-label="Menüyü kapat"
                            className="absolute right-3 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full text-ad-muted transition-colors hover:bg-ad-sunken hover:text-ad-ink"
                        >
                            <Icon name="close" className="text-[20px]" />
                        </button>
                        <SidebarContent pathname={pathname} badges={badges} />
                    </aside>
                </div>
            )}

            {/* İçerik sütunu */}
            <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
                <header className="ad-nav sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-ad-line !bg-white/85 px-3 sm:h-20 sm:gap-4 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        aria-label="Menüyü aç"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ad-body transition-colors hover:bg-ad-sunken lg:hidden"
                    >
                        <Icon name="menu" className="text-[24px]" />
                    </button>

                    <Breadcrumb pathname={pathname} />

                    <div className="ms-auto flex items-center gap-2">
                        <PeriodSwitcher />
                        <a
                            href="/"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ana siteyi yeni sekmede aç"
                            className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-ad-body transition-colors hover:bg-ad-sunken xl:flex"
                        >
                            <Icon name="open_in_new" className="text-[16px]" />
                            Siteyi gör
                        </a>
                        <UserMenu user={user} />
                    </div>
                </header>

                {selected.status !== "active" && <PastPeriodBanner selected={selected} periods={periods} />}

                <main className="min-w-0 flex-1 px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
                    <ToastProvider>{children}</ToastProvider>
                </main>
            </div>
        </div>
    );
}

/* ── Geçmiş dönem uyarı şeridi ── */
function PastPeriodBanner({ selected, periods }) {
    const { selectPeriod } = useAdmin();
    const active = periods.find((p) => p.status === "active");
    const back = () => active && selectPeriod(active.id);

    return (
        <div
            role="status"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-ad-warn/20 bg-ad-warn-soft px-4 py-2.5 text-sm text-ad-warn sm:px-6 lg:px-8"
        >
            <Icon name="history" className="text-[19px]" />
            <span className="min-w-0 flex-1">
                <strong className="font-bold">Geçmiş dönemi görüntülüyorsunuz: {selected.name}.</strong>{" "}
                <span className="hidden sm:inline">
                    Bu dönemde yeni kayıt açılamaz; yalnızca açık borç tahsilatı ve düzeltme kaydı yapılabilir.
                </span>
            </span>
            {active && (
                <button type="button" onClick={back} className="font-bold underline underline-offset-2 hover:no-underline">
                    Aktif döneme dön
                </button>
            )}
        </div>
    );
}

/* ── Başlık yolu ── */
function Breadcrumb({ pathname }) {
    const found = findNavItem(pathname);

    return (
        <div className="flex min-w-0 items-center gap-1.5">
            {found && (
                <>
                    <span className="hidden text-sm text-ad-faint xl:inline">{found.group}</span>
                    <Icon name="chevron_right" className="hidden text-[16px] text-ad-faint xl:inline" />
                </>
            )}
            <span className="hidden truncate text-[15px] font-bold text-ad-ink md:inline">
                {found?.item.label ?? "Yönetim Paneli"}
            </span>
        </div>
    );
}

/* ── Kullanıcı menüsü ── */
function UserMenu({ user }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        document.addEventListener("pointerdown", close);
        return () => document.removeEventListener("pointerdown", close);
    }, [open]);

    return (
        <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
            <button
                type="button"
                aria-expanded={open}
                aria-label="Hesap menüsü"
                onClick={() => setOpen((v) => !v)}
                className="flex h-10 items-center gap-1 rounded-full pe-1 ps-1 transition-colors hover:bg-ad-sunken"
            >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ad-brand text-xs font-bold uppercase text-white">
                    {user.name.charAt(0)}
                </span>
                <Icon name="expand_more" className="hidden text-[18px] text-ad-muted sm:block" />
            </button>

            {open && (
                <div className="ad-rise absolute end-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-ad-line bg-ad-surface shadow-ad-lg">
                    <div className="border-b border-ad-line px-4 py-3">
                        <div className="truncate text-sm font-bold">{user.name}</div>
                        <div dir="ltr" className="truncate text-xs text-ad-muted">
                            {user.email}
                        </div>
                    </div>
                    <Link
                        href="/admin/sistem/profil"
                        className="flex items-center gap-2.5 px-4 py-3 text-sm transition-colors hover:bg-ad-sunken"
                    >
                        <Icon name="account_circle" className="text-[19px] text-ad-muted" />
                        Profilim
                    </Link>
                    <button
                        type="button"
                        onClick={logout}
                        className="flex w-full items-center gap-2.5 border-t border-ad-line px-4 py-3 text-start text-sm font-semibold text-ad-danger transition-colors hover:bg-ad-danger-soft"
                    >
                        <Icon name="logout" className="text-[19px]" />
                        Çıkış yap
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── Kenar çubuğu içeriği ── */
function SidebarContent({ pathname, badges }) {
    return (
        <>
            <div className="flex h-16 shrink-0 items-center gap-3 px-6 sm:h-20">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ad-brand text-white shadow-ad-brand">
                    <Icon name="apartment" className="text-[22px]" />
                </span>
                <span className="flex flex-col leading-tight">
                    <span className="text-base font-bold tracking-tight text-ad-ink">Mazlum Apart</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ad-muted">
                        Yönetim Paneli
                    </span>
                </span>
            </div>

            <nav className="ad-scroll flex-1 overflow-y-auto px-4 pb-6 pt-2">
                {NAV_GROUPS.map((group, index) => (
                    <div key={group.key} className={index ? "mt-4" : ""}>
                        <div className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-ad-faint">
                            {group.label}
                        </div>
                        <div className="flex flex-col gap-0.5">
                            {group.items.map((item) => (
                                <NavLink key={item.href} item={item} pathname={pathname} count={badges[item.badge]} />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
        </>
    );
}

function NavLink({ item, pathname, count }) {
    const active = isActiveItem(item, pathname);

    return (
        <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-between gap-3 rounded-full px-3.5 py-2.5 text-sm transition-colors ${
                active ? "ad-nav-active font-bold" : "text-ad-body hover:bg-ad-raised hover:text-ad-ink"
            }`}
        >
            <span className="flex min-w-0 items-center gap-3">
                <Icon name={item.icon} className="shrink-0 text-[20px]" />
                <span className="truncate">{item.label}</span>
            </span>
            {count > 0 && (
                <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                        active ? "bg-white/25 text-white" : "bg-ad-brand text-white"
                    }`}
                >
                    {count}
                </span>
            )}
        </Link>
    );
}
