"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import DataTable from "@/components/admin/DataTable";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import { Avatar, Badge, Card, EmptyState, PageHeader, ProgressBar, StatusBadge } from "@/components/admin/ui";
import { turkeyDate } from "@/lib/format";
import { adaptDue } from "@/lib/admin/adapters";
import { writePeriodCookie } from "@/lib/admin/client";
import { diffDays, monthLabel } from "@/lib/admin/month";
import { BILL_KIND, BILL_STATE, CHARGE_KIND, MAINT_STATUS, SOURCE, date, money } from "@/lib/admin/labels";

const total = (list, pick) => list.reduce((s, x) => s + pick(x), 0);

const itemLabel = (item) =>
    `${CHARGE_KIND[item.kind]}${item.kind === "rent" ? ` · ${monthLabel(item.month, { short: true })}` : ""}`;

/**
 * Ana panel. Tüm rakamlar backend'in GET /api/admin/dashboard yanıtından gelir (defter kayıtlarından hesaplanır);
 * doluluk GET /api/admin/occupancy'den. Burada hesap yapılmaz, yalnızca gösterilir.
 */
export default function DashboardView({ data, occupancy }) {
    const { period, today } = useAdmin();
    const router = useRouter();
    const isActive = period.status === "active";

    const view = {
        ...data,
        overdue: data.overdue.map((d) => adaptDue(d, "overdue")),
        upcoming: data.upcoming.map((d) => adaptDue(d, "upcoming")),
    };
    const weekCash = data.weekCash;
    const bankAccounts = data.balances.filter((b) => b.type === "bank");
    const expenseCount = data.expenseCount;
    const overdueTotal = total(view.overdue, (r) => r.item.remaining);

    const open = (row) => router.push(`/admin/hesaplar/${row.enrollment.id}`);

    const dueColumns = (kind) => [
        {
            key: "student",
            header: "Öğrenci",
            sort: (r) => r.student.lastName,
            render: (r) => (
                <div className="flex items-center gap-2.5">
                    <Avatar name={`${r.student.firstName} ${r.student.lastName}`} />
                    <div className="min-w-0">
                        <div className="truncate font-bold">{r.student.firstName} {r.student.lastName}</div>
                        <div className="text-[11px] font-normal text-ad-muted">
                            {r.lastContact ? `Son iletişim: ${date(turkeyDate(r.lastContact.at))}` : "Henüz iletişim yok"}
                        </div>
                    </div>
                </div>
            ),
            export: { value: (r) => `${r.student.firstName} ${r.student.lastName}`, width: 24 },
        },
        { key: "room", header: "Oda / Daire", render: (r) => r.room?.label ?? <span className="text-ad-faint">Yerleşmedi</span>, export: { value: (r) => r.room?.label ?? "" } },
        { key: "item", header: "Kalem", render: (r) => itemLabel(r.item), export: { value: (r) => itemLabel(r.item) } },
        { key: "remaining", header: "Kalan", align: "end", sort: (r) => r.item.remaining, render: (r) => <span className="ad-num font-bold">{money(r.item.remaining)}</span>, export: { type: "money", value: (r) => r.item.remaining } },
        {
            key: "due",
            header: kind === "overdue" ? "Vade / Gecikme" : "Vade",
            sort: (r) => r.item.dueDate,
            render: (r) => (
                <div>
                    <div className="ad-num">{date(r.item.dueDate)}</div>
                    {kind === "overdue" ? (
                        <Badge tone="danger">{r.item.lateDays} gün gecikti</Badge>
                    ) : (
                        <span className="text-[11px] text-ad-muted">{r.item.inDays === 0 ? "Bugün" : `${r.item.inDays} gün sonra`}</span>
                    )}
                </div>
            ),
            export: { type: "date", value: (r) => r.item.dueDate },
        },
        {
            key: "actions",
            header: "İşlem",
            render: (r) => (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <WhatsAppButton row={r} item={r.item} purpose={kind === "overdue" ? "payment_overdue" : "payment_reminder"} />
                    <Link href={`/admin/hesaplar/${r.enrollment.id}`} className="ad-btn ad-btn-soft ad-btn-sm">
                        Hesap
                    </Link>
                </div>
            ),
        },
    ];

    const carried = isActive ? data.carriedOver : [];
    const dueBills = data.dueBills;
    const latestApplications = data.latestApplications;
    const occ = occupancy.totals;

    return (
        <div>
            <PageHeader
                eyebrow={
                    <span className="inline-flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isActive ? "animate-pulse bg-ad-accent" : "bg-ad-faint"}`} />
                        {isActive ? "Aktif dönem" : "Geçmiş dönem"} · {period.name}
                    </span>
                }
                title="Finansal Durum ve Operasyonel Özet"
                description="Seçili dönemin kasa, tahsilat, gider ve doluluk durumu. Tüm tutarlar defter kayıtlarından hesaplanır."
                actions={
                    <Link href="/admin/tahsilatlar" className="ad-btn ad-btn-primary">
                        <Icon name="add_circle" className="text-[20px]" />
                        Tahsilat Gir
                    </Link>
                }
            />

            {/* KPI kartları */}
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="relative overflow-hidden flex flex-col justify-between rounded-[1.25rem] bg-ad-brand p-6 text-white shadow-ad-brand md:col-span-2 xl:col-span-1 xl:row-span-2">
                    <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 rounded-full bg-ad-accent-bright/25 soft-blob" />
                    <div className="relative flex items-start justify-between">
                        <div>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/75">
                                <Icon name="account_balance_wallet" className="text-[16px]" />
                                Nakit Kasa
                            </span>
                            <div className="ad-display ad-num mt-2 text-[52px] font-semibold leading-none">{money(data.cashBalance)}</div>
                        </div>
                    </div>
                    <div className="relative mt-6 flex items-center justify-between border-t border-white/20 pt-3 text-xs">
                        <span className="flex items-center gap-1 text-white/80">
                            <Icon name={weekCash >= 0 ? "trending_up" : "trending_down"} className="text-[16px]" />
                            <strong className="text-white">{weekCash >= 0 ? "+" : ""}{money(weekCash)}</strong> son 7 gün
                        </span>
                        <Link href="/admin/kasa-banka" className="font-bold text-white underline-offset-2 hover:underline">Hareketler</Link>
                    </div>
                </div>

                <StatCard icon="account_balance" label="Banka Hesapları" value={money(data.bankBalance)}
                    badge={`${bankAccounts.length} hesap`}
                    foot={<span className="truncate">{bankAccounts.map((b) => b.name).join(", ") || "Hesap yok"}</span>} />

                <StatCard icon="savings" label="Dönem Tahsilatı" value={money(view.totals.collected)}
                    badge={`%${Math.round(view.collectionRate * 100)}`}
                    foot={
                        <>
                            <ProgressBar value={view.collectionRate} className="mb-1.5" />
                            <span>Borçlandırılan: {money(view.charged)}</span>
                        </>
                    } />

                <StatCard icon="receipt_long" label="Dönem Gideri" value={money(view.totals.spent)} tone="tertiary"
                    badge={`${expenseCount} kalem`}
                    foot={<span>Net durum: <strong className={view.totals.net >= 0 ? "text-ad-ok" : "text-ad-danger"}>{money(view.totals.net)}</strong></span>} />

                <StatCard icon="pending_actions" label="Öğrencilerden Alacak" value={money(view.receivable)} tone={view.receivable > 0 ? "danger" : "ink"}
                    badge={`${view.debtors} öğrenci`} badgeTone="danger"
                    foot={
                        <span>
                            {overdueTotal > 0 && <>Gecikmiş: <strong className="text-ad-danger">{money(overdueTotal)}</strong> · </>}
                            Avans: <strong>{money(view.advances)}</strong>
                            <span className="mt-0.5 block">Dönem boyunca ödenecek kalan toplam</span>
                        </span>
                    } />
            </div>

            {/* Gecikenler ve yaklaşanlar */}
            <div className="mb-8 grid grid-cols-1 gap-6 2xl:grid-cols-2">
                <DueCard
                    tone="danger"
                    title="Geciken Ödemeler"
                    description="Vadesi geçmiş ve kalan tutarı olan kalemler."
                    count={view.overdue.length}
                    rows={view.overdue}
                    columns={dueColumns("overdue")}
                    exportName="geciken-odemeler"
                    onRowClick={open}
                    empty="Geciken ödeme yok"
                />
                <DueCard
                    tone="accent"
                    title="Yaklaşan Ödemeler"
                    description="Önümüzdeki 7 gün içinde vadesi dolacak kalemler. Peşin ödeyenler vadesi gelene kadar görünmez."
                    count={view.upcoming.length}
                    rows={view.upcoming}
                    columns={dueColumns("upcoming")}
                    exportName="yaklasan-odemeler"
                    onRowClick={open}
                    empty="Önümüzdeki 7 günde vadesi gelen ödeme yok"
                />
            </div>

            {isActive && carried.length > 0 && (
                <Card
                    className="mb-8"
                    title="Önceki Dönemlerden Açık Kalanlar"
                    description="Eski dönemlerin ödenmemiş öğrenci borçları ve faturaları. Satıra tıklayınca o döneme geçilir; tahsilat o eski döneme yazılır."
                    padded={false}
                >
                    <ul className="divide-y divide-ad-line px-5 pb-2 pt-3 sm:px-6">
                        {carried.map((c) => (
                            <li key={c.kind === "student" ? c.enrollmentId : c.bill.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        writePeriodCookie(c.periodId); // tahsilat o eski döneme yazılır
                                        router.push(c.kind === "student" ? `/admin/hesaplar/${c.enrollmentId}` : "/admin/faturalar");
                                    }}
                                    className="flex w-full items-center gap-3 py-3 text-start transition-colors hover:text-ad-brand"
                                >
                                    {c.kind === "student" ? <Avatar name={`${c.student.firstName} ${c.student.lastName}`} /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ad-warn-soft text-ad-warn"><Icon name="description" className="text-[17px]" /></span>}
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-bold">
                                            {c.kind === "student" ? `${c.student.firstName} ${c.student.lastName}` : `${BILL_KIND[c.bill.kind]} faturası (${monthLabel(c.bill.month, { short: true })})`}
                                        </span>
                                        <span className="text-xs text-ad-muted">{c.periodName} · {c.kind === "student" ? "Öğrenci borcu" : "Ödenmemiş fatura"}</span>
                                    </span>
                                    <span className="ad-num text-sm font-bold text-ad-danger">{money(c.amount)}</span>
                                    <Icon name="chevron_right" className="text-[18px] text-ad-faint" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                <Card title="Faturalar" description="Vadesi yaklaşan ve geçen ödenmemiş faturalar." actions={<Link href="/admin/faturalar" className="text-xs font-bold text-ad-brand hover:underline">Tümü</Link>} padded={false}>
                    {dueBills.length === 0 ? (
                        <EmptyState icon="task_alt" title="Bekleyen fatura yok" description="Vadesi yaklaşan ya da geçen fatura görünmüyor." />
                    ) : (
                        <ul className="divide-y divide-ad-line px-5 pb-2 pt-3 sm:px-6">
                            {dueBills.map((bill) => (
                                <li key={bill.id} className="flex items-center gap-3 py-3">
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-bold">{BILL_KIND[bill.kind]} · {monthLabel(bill.month, { short: true })}</span>
                                        <span className="text-xs text-ad-muted">Son ödeme: {date(bill.dueDate)}{bill.state === "overdue" ? ` · ${diffDays(today, bill.dueDate)} gün gecikti` : ""}</span>
                                    </span>
                                    <span className="ad-num text-sm font-bold">{money(bill.amount)}</span>
                                    <StatusBadge map={BILL_STATE} value={bill.state} />
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card title="Yeni Başvurular" description="İnceleme bekleyen başvurular. Bekleyen başvurular doluluğu etkilemez." actions={<Link href="/admin/basvurular" className="text-xs font-bold text-ad-brand hover:underline">Tümü</Link>} padded={false}>
                    {latestApplications.length === 0 ? (
                        <EmptyState icon="inbox" title="Bekleyen başvuru yok" />
                    ) : (
                        <ul className="divide-y divide-ad-line px-5 pb-2 pt-3 sm:px-6">
                            {latestApplications.map((a) => (
                                <li key={a.id}>
                                    <Link href="/admin/basvurular" className="flex items-center gap-3 py-3 hover:text-ad-brand">
                                        <Avatar name={a.fullName} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-bold">{a.fullName}</span>
                                            <span className="text-xs text-ad-muted">{a.roomTypeName} · {SOURCE[a.source]}</span>
                                        </span>
                                        <span className="text-xs text-ad-muted">{date(turkeyDate(a.createdAt))}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card title="Doluluk ve Arıza" description={`Doluluk ${occupancy.day === today ? "bugüne" : "dönem başına"} göre hesaplanır.`} actions={<Link href="/admin/yerlesim" className="text-xs font-bold text-ad-brand hover:underline">Yerleşim</Link>}>
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="ad-display ad-num text-[40px] font-semibold leading-none">{occ.taken}<span className="text-xl text-ad-muted"> / {occ.beds}</span></div>
                            <div className="mt-1 text-xs text-ad-muted">dolu yatak · {occ.free} boş</div>
                        </div>
                        <Badge tone="brand">%{Math.round(occ.rate * 100)}</Badge>
                    </div>
                    <ProgressBar value={occ.rate} className="mt-3" />

                    <div className="mt-5 border-t border-ad-line pt-4">
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-ad-muted">Açık arıza kayıtları</span>
                            <Link href="/admin/ariza" className="text-xs font-bold text-ad-brand hover:underline">Tümü</Link>
                        </div>
                        {data.openMaintenance.length === 0 ? (
                            <p className="text-sm text-ad-muted">Açık arıza kaydı yok.</p>
                        ) : (
                            <ul className="space-y-2.5">
                                {data.openMaintenance.map((m) => (
                                    <li key={m.id} className="flex items-center gap-2.5">
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold">{m.title}</span>
                                            <span className="text-xs text-ad-muted">{m.roomLabel}</span>
                                        </span>
                                        <StatusBadge map={MAINT_STATUS} value={m.status} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, badge, badgeTone = "brand", foot, tone = "ink", className = "" }) {
    const color = { ink: "text-ad-ink", tertiary: "text-[#2d3449]", danger: "text-ad-danger" }[tone];
    return (
        <div className={`ad-card flex flex-col justify-between p-5 ${className}`}>
            <div>
                <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ad-muted">
                        <Icon name={icon} className="text-[16px] text-ad-accent" />
                        {label}
                    </span>
                    {badge && <Badge tone={badgeTone}>{badge}</Badge>}
                </div>
                <div className={`ad-display ad-num mt-3 text-[28px] font-semibold leading-none ${color}`}>{value}</div>
            </div>
            {foot && <div className="mt-4 flex flex-col text-xs text-ad-muted">{foot}</div>}
        </div>
    );
}

function DueCard({ tone, title, description, count, rows, columns, exportName, onRowClick, empty }) {
    return (
        <section>
            <div className="mb-3 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${tone === "danger" ? "bg-ad-danger" : "bg-ad-accent"}`} />
                <h2 className="ad-display text-xl font-semibold">{title}</h2>
                <Badge tone={tone}>{count}</Badge>
            </div>
            <p className="mb-3 text-xs text-ad-muted">{description}</p>
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(r) => r.item.id}
                onRowClick={onRowClick}
                exportName={exportName}
                pageSize={6}
                empty={{ icon: "task_alt", title: empty, description: "" }}
            />
        </section>
    );
}
