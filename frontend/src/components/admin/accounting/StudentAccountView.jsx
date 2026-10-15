"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import { Badge, Card, EmptyState, PageHeader, StatusBadge } from "@/components/admin/ui";
import { describeCovered, round } from "@/lib/admin/domain/accounting";
import { enrollmentRow } from "@/lib/admin/domain/selectors";
import { AUDIT_ACTION, ENROLLMENT_STATUS, METHOD, PAY_STATUS, date, money } from "@/lib/admin/labels";
import { CancelPaymentDialog, ChargeDialog, RefundDialog, ReverseChargeDialog } from "./ChargeDialogs";
import PaymentDialog, { itemLabel } from "./PaymentDialog";

const Stat = ({ label, value, tone = "", hint }) => (
    <Card>
        <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">{label}</p>
        <p className={`ad-num mt-2 text-2xl font-extrabold ${tone}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-ad-muted">{hint}</p>}
    </Card>
);

function itemState(i, today) {
    if (i.reversed) return { label: "İptal edildi", tone: "neutral" };
    if (i.net < 0) return { label: "İndirim", tone: "accent" };
    if (i.remaining === 0) return { label: "Ödendi", tone: "ok" };
    if (i.dueDate < today) return { label: i.allocated > 0 ? "Kısmi · gecikmiş" : "Gecikmiş", tone: "danger" };
    return { label: i.allocated > 0 ? "Kısmi ödendi" : "Bekliyor", tone: "brand" };
}

export default function StudentAccountView({ enrollmentId }) {
    const { state, periodId, selectPeriod } = useAdmin();
    const enrollment = state.enrollments.find((e) => e.id === enrollmentId);

    // Eski dönem borcundan gelindiyse panelin dönemi de o döneme geçer
    useEffect(() => {
        if (enrollment && enrollment.periodId !== periodId) selectPeriod(enrollment.periodId);
    }, [enrollment, periodId, selectPeriod]);

    if (!enrollment) {
        return (
            <div>
                <PageHeader title="Hesap bulunamadı" back={{ href: "/admin/hesaplar", label: "Öğrenci Hesapları" }} />
                <EmptyState icon="account_balance_wallet" title="Bu hesap yok" description="Bağlantı eski olabilir." />
            </div>
        );
    }
    return <Account enrollment={enrollment} />;
}

function Account({ enrollment }) {
    const { state, today, periods } = useAdmin();
    const [dialog, setDialog] = useState(null); // { type, item?, payment? }

    const row = useMemo(() => enrollmentRow(state, enrollment, today), [state, enrollment, today]);
    const { student, summary } = row;
    const period = periods.find((p) => p.id === enrollment.periodId);
    const closedPeriod = period.status === "closed";
    const ended = ["cancelled", "left"].includes(enrollment.status);
    const fullName = `${student.firstName} ${student.lastName}`;

    const reversalNote = (chargeId) => state.charges.find((c) => c.reversalOf === chargeId)?.note ?? "";
    const payments = state.payments.filter((p) => p.enrollmentId === enrollment.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const accountName = (id) => state.accounts.find((a) => a.id === id)?.name ?? "";
    const allocationsOf = (paymentId) => {
        const per = new Map();
        for (const a of state.allocations.filter((x) => x.paymentId === paymentId)) per.set(a.chargeId, round((per.get(a.chargeId) ?? 0) + a.amount));
        return [...per].filter(([, v]) => v > 0).map(([chargeId, amount]) => ({ item: summary.items.find((i) => i.id === chargeId), amount }));
    };

    const ids = new Set([enrollment.id, ...state.charges.filter((c) => c.enrollmentId === enrollment.id).map((c) => c.id), ...payments.map((p) => p.id)]);
    const history = state.audit.filter((a) => ids.has(a.entityId) && ["payment", "charge", "enrollment"].includes(a.entity)).sort((a, b) => b.at.localeCompare(a.at));

    const stop = () => setDialog(null);

    return (
        <div>
            <PageHeader
                back={{ href: "/admin/hesaplar", label: "Öğrenci Hesapları" }}
                eyebrow={period.name}
                title={fullName}
                description={`${row.room?.label ?? "Yerleşmedi"} · ${row.roomType?.name.tr ?? ""}`}
                actions={
                    <>
                        {summary.remaining > 0 && <WhatsAppButton row={row} item={summary.next} purpose={summary.status === "overdue" ? "payment_overdue" : "payment_reminder"} compact={false} label="WhatsApp" className="!h-10 !px-4" />}
                        <Link href={`/admin/ogrenciler/${enrollment.id}`} className="ad-btn ad-btn-outline"><Icon name="person" className="text-[20px]" />Öğrenci</Link>
                        {!closedPeriod && <button type="button" onClick={() => setDialog({ type: "charge" })} className="ad-btn ad-btn-outline"><Icon name="post_add" className="text-[20px]" />Kalem ekle</button>}
                        <button type="button" onClick={() => setDialog({ type: "pay" })} className="ad-btn ad-btn-primary"><Icon name="add_card" className="text-[20px]" />Tahsilat al</button>
                    </>
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <StatusBadge map={ENROLLMENT_STATUS} value={enrollment.status} />
                <StatusBadge map={PAY_STATUS} value={summary.status} />
                {closedPeriod && <Badge tone="warn">Kapalı dönem · yalnızca tahsilat ve iade yapılabilir</Badge>}
            </div>

            <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Stat label="Toplam borç" value={money(summary.charged)} />
                <Stat label="Ödenen" value={money(summary.allocated)} tone="text-ad-ok" />
                <Stat label="Kalan" value={money(summary.remaining)} tone={summary.overdue > 0 ? "text-ad-danger" : ""} hint={summary.overdue > 0 ? `${money(summary.overdue)} vadesi geçmiş` : undefined} />
                <Stat label="Sıradaki ödeme" value={summary.next ? money(summary.next.remaining) : "—"} hint={summary.next ? `${itemLabel(summary.next)} · ${date(summary.next.dueDate)}` : "Açık borç yok"} />
                <Card>
                    <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Avans</p>
                    <p className="ad-num mt-2 text-2xl font-extrabold text-ad-accent">{money(summary.advance)}</p>
                    {summary.advance > 0 ? <button type="button" onClick={() => setDialog({ type: "refund" })} className="mt-1 text-xs font-bold text-ad-brand hover:underline">İade et</button> : <p className="mt-1 text-xs text-ad-muted">Fazla ödeme yok</p>}
                </Card>
            </div>

            <p className="mb-5 rounded-2xl bg-ad-brand-soft px-4 py-3 text-sm font-semibold text-ad-brand-dark">
                <Icon name="event_available" className="me-2 align-middle text-[20px]" />{describeCovered(summary.covered, money)}
            </p>

            <Card title="Borç kalemleri" description="Kalemler düzenlenmez; hatalı bir kalem iptal edilir (ters kayıt) ve doğrusu girilir." padded={false} className="mb-5">
                <div className="ad-scroll mt-4 overflow-x-auto">
                    <table className="ad-table">
                        <thead><tr><th>Kalem</th><th>Vade</th><th className="!text-end">Tutar</th><th className="!text-end">Ödenen</th><th className="!text-end">Kalan</th><th>Durum</th><th /></tr></thead>
                        <tbody>
                            {summary.items.map((i) => {
                                const st = itemState(i, today);
                                const struck = i.reversed;
                                return (
                                    <tr key={i.id} className={struck ? "opacity-60" : ""}>
                                        <td className={`font-semibold ${struck ? "line-through" : ""}`}>{itemLabel(i)}{struck && <span className="ms-2 text-xs font-normal no-underline text-ad-muted">{reversalNote(i.id)}</span>}</td>
                                        <td className="ad-num whitespace-nowrap">{date(i.dueDate)}</td>
                                        <td className="ad-num text-end">{money(i.amount)}</td>
                                        <td className="ad-num text-end text-ad-ok">{i.net > 0 ? money(i.allocated + i.discounted) : "—"}</td>
                                        <td className={`ad-num text-end font-bold ${i.remaining > 0 && i.dueDate < today ? "text-ad-danger" : ""}`}>{i.net > 0 ? money(i.remaining) : "—"}</td>
                                        <td><Badge tone={st.tone}>{st.label}</Badge></td>
                                        <td className="text-end">{!i.reversed && !closedPeriod && <button type="button" onClick={() => setDialog({ type: "reverse", item: i })} className="text-xs font-bold text-ad-danger hover:underline">İptal et</button>}</td>
                                    </tr>
                                );
                            })}
                            {summary.items.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-sm text-ad-muted">Bu kayıtta henüz borç kalemi yok.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="grid gap-5 xl:grid-cols-2">
                <Card title="Tahsilat ve iadeler" description="Girilen her ödeme burada kalır; iptal edilenler üstü çizili görünür.">
                    {payments.length === 0 ? (
                        <p className="mt-4 text-sm text-ad-muted">Bu öğrenciden henüz tahsilat yok.</p>
                    ) : (
                        <ul className="mt-4 space-y-3">
                            {payments.map((p) => {
                                const refund = p.kind === "refund";
                                const cancelled = !!p.cancelledAt;
                                const alloc = refund ? [] : allocationsOf(p.id);
                                return (
                                    <li key={p.id} className="rounded-2xl border border-ad-line p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className={cancelled ? "opacity-60" : ""}>
                                                <p className={`ad-num text-lg font-extrabold ${refund ? "text-ad-warn" : "text-ad-ok"} ${cancelled ? "line-through" : ""}`}>{refund ? "−" : "+"}{money(p.amount)}</p>
                                                <p className="text-xs text-ad-muted">{date(p.date)} · {refund ? "Avans iadesi" : METHOD[p.method]} · {accountName(p.accountId)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {cancelled && <Badge tone="neutral">İptal edildi</Badge>}
                                                {!refund && !cancelled && !closedPeriod && <button type="button" onClick={() => setDialog({ type: "cancel", payment: p })} className="text-xs font-bold text-ad-danger hover:underline">İptal et</button>}
                                            </div>
                                        </div>
                                        {p.note && <p className="mt-1 text-xs text-ad-body">{p.note}</p>}
                                        {cancelled && <p className="mt-1 text-xs text-ad-muted">Neden: {p.cancelReason}</p>}
                                        {!cancelled && alloc.length > 0 && (
                                            <ul className="mt-2 flex flex-wrap gap-1.5">
                                                {alloc.map((a, idx) => <li key={idx} className="rounded-full bg-ad-sunken px-2.5 py-1 text-[11px] font-semibold">{a.item ? itemLabel(a.item) : "Kalem"} · {money(a.amount)}</li>)}
                                            </ul>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>

                <Card title="İşlem geçmişi" description="Bu hesapta yapılan tüm işlemler, kim ne zaman yaptı.">
                    {history.length === 0 ? <p className="mt-4 text-sm text-ad-muted">Kayıtlı işlem yok.</p> : (
                        <ol className="mt-4 space-y-2.5">
                            {history.slice(0, 12).map((h) => (
                                <li key={h.id} className="flex items-start justify-between gap-3 text-sm">
                                    <span className="min-w-0"><span className="font-semibold">{AUDIT_ACTION[h.action] ?? h.action}</span>{h.note && <span className="block truncate text-xs text-ad-muted">{h.note}</span>}</span>
                                    <span className="ad-num shrink-0 text-xs text-ad-muted">{date(h.at.slice(0, 10))} · {h.by}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </Card>
            </div>

            {dialog?.type === "pay" && <PaymentDialog enrollmentId={enrollment.id} onClose={stop} />}
            {dialog?.type === "charge" && <ChargeDialog enrollmentId={enrollment.id} advance={summary.advance} onClose={stop} />}
            {dialog?.type === "reverse" && <ReverseChargeDialog item={dialog.item} onClose={stop} />}
            {dialog?.type === "refund" && <RefundDialog enrollmentId={enrollment.id} advance={summary.advance} onClose={stop} />}
            {dialog?.type === "cancel" && <CancelPaymentDialog payment={dialog.payment} onClose={stop} />}
        </div>
    );
}
