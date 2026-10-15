"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import DataTable from "@/components/admin/DataTable";
import { Badge, Card, Chips, PageHeader } from "@/components/admin/ui";
import { SelectInput } from "@/components/admin/fields";
import { METHOD, date, money } from "@/lib/admin/labels";
import { CancelPaymentDialog } from "./ChargeDialogs";
import DateRange, { inRange } from "./DateRange";
import PaymentDialog from "./PaymentDialog";

/** Seçili dönemin tüm tahsilat ve iadeleri. İptal edilenler silinmez, listede kalır. */
export default function PaymentsView() {
    const { state, view, period } = useAdmin();
    const [tab, setTab] = useState("collection");
    const [method, setMethod] = useState("");
    const [accountId, setAccountId] = useState("");
    const [range, setRange] = useState({ from: "", to: "" });
    const [paying, setPaying] = useState(false);
    const [cancelling, setCancelling] = useState(null);
    const closed = period.status === "closed";

    const all = useMemo(
        () => state.payments.filter((p) => p.periodId === period.id).map((p) => ({
            p,
            student: state.students.find((s) => s.id === state.enrollments.find((e) => e.id === p.enrollmentId)?.studentId),
            account: state.accounts.find((a) => a.id === p.accountId),
        })),
        [state.payments, state.enrollments, state.students, state.accounts, period.id]
    );

    const rows = all.filter(({ p }) => {
        if (tab === "collection" && (p.kind !== "collection" || p.cancelledAt)) return false;
        if (tab === "refund" && p.kind !== "refund") return false;
        if (tab === "cancelled" && !p.cancelledAt) return false;
        if (method && p.method !== method) return false;
        if (accountId && p.accountId !== accountId) return false;
        return inRange(p.date, range);
    });
    const count = (f) => all.filter(({ p }) => f(p)).length;
    const t = view.totals;

    const columns = [
        { key: "date", header: "Tarih", sort: ({ p }) => p.date, render: ({ p }) => <span className="ad-num whitespace-nowrap">{date(p.date)}</span>, export: { type: "date", value: ({ p }) => p.date } },
        {
            key: "student", header: "Öğrenci", sort: ({ student }) => student?.lastName,
            render: ({ p, student }) => <Link href={`/admin/hesaplar/${p.enrollmentId}`} onClick={(e) => e.stopPropagation()} className="font-bold hover:text-ad-brand">{student?.firstName} {student?.lastName}</Link>,
            export: { value: ({ student }) => `${student?.firstName} ${student?.lastName}`, width: 24 },
        },
        { key: "kind", header: "Tür", render: ({ p }) => p.kind === "refund" ? <Badge tone="warn">Avans iadesi</Badge> : <Badge tone="ok">Tahsilat</Badge>, export: { value: ({ p }) => (p.kind === "refund" ? "Avans iadesi" : "Tahsilat") } },
        { key: "method", header: "Yöntem", render: ({ p }) => METHOD[p.method], export: { value: ({ p }) => METHOD[p.method] } },
        { key: "account", header: "Hesap", render: ({ account }) => account?.name, export: { value: ({ account }) => account?.name ?? "" } },
        { key: "amount", header: "Tutar", align: "end", sort: ({ p }) => p.amount, render: ({ p }) => <span className={`ad-num font-bold ${p.cancelledAt ? "text-ad-faint line-through" : p.kind === "refund" ? "text-ad-warn" : "text-ad-ok"}`}>{p.kind === "refund" ? "−" : ""}{money(p.amount)}</span>, export: { type: "money", value: ({ p }) => p.amount } },
        { key: "note", header: "Açıklama", render: ({ p }) => <span className="block max-w-56 truncate text-xs text-ad-body">{p.cancelledAt ? `İptal: ${p.cancelReason}` : p.note}</span>, export: { value: ({ p }) => p.cancelledAt ? `İptal: ${p.cancelReason}` : p.note, width: 30 } },
        { key: "by", header: "Giren", render: ({ p }) => <span className="text-xs text-ad-muted">{p.createdBy}</span>, export: { value: ({ p }) => p.createdBy } },
        { key: "status", header: "Durum", render: ({ p }) => p.cancelledAt ? <Badge tone="neutral">İptal edildi</Badge> : <Badge tone="ok">Geçerli</Badge>, export: { value: ({ p }) => (p.cancelledAt ? "İptal edildi" : "Geçerli") } },
        {
            key: "act", header: "", align: "end",
            render: ({ p }) => p.kind === "collection" && !p.cancelledAt && !closed ? <button type="button" onClick={() => setCancelling(p)} className="text-xs font-bold text-ad-danger hover:underline">İptal et</button> : null,
        },
    ];

    return (
        <div>
            <PageHeader
                title="Tahsilatlar"
                description="Öğrencilerden alınan ödemeler ve avans iadeleri. Girilen kayıt değiştirilmez; hata olursa iptal edilip doğrusu girilir."
                actions={<button type="button" onClick={() => setPaying(true)} className="ad-btn ad-btn-primary"><Icon name="add_card" className="text-[20px]" />Tahsilat al</button>}
            />
            <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Toplam tahsilat</p><p className="ad-num mt-2 text-2xl font-extrabold text-ad-ok">{money(t.collected)}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Nakit</p><p className="ad-num mt-2 text-2xl font-extrabold">{money(t.byMethod.cash)}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Havale / EFT</p><p className="ad-num mt-2 text-2xl font-extrabold">{money(t.byMethod.transfer)}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">POS</p><p className="ad-num mt-2 text-2xl font-extrabold">{money(t.byMethod.pos)}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Avans iadeleri</p><p className="ad-num mt-2 text-2xl font-extrabold text-ad-warn">{money(t.refunded)}</p></Card>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Chips
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: "collection", label: "Tahsilatlar", count: count((p) => p.kind === "collection" && !p.cancelledAt) },
                        { value: "refund", label: "İadeler", count: count((p) => p.kind === "refund") },
                        { value: "cancelled", label: "İptal edilenler", count: count((p) => !!p.cancelledAt) },
                        { value: "all", label: "Tümü", count: all.length },
                    ]}
                />
            </div>
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={({ p }) => p.id}
                searchText={({ student, p }) => `${student?.firstName} ${student?.lastName} ${p.note}`}
                searchPlaceholder="Öğrenci veya açıklama ara"
                filters={
                    <>
                        <div className="w-full sm:w-40"><SelectInput value={method} onChange={(e) => setMethod(e.target.value)}><option value="">Tüm yöntemler</option>{Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</SelectInput></div>
                        <div className="w-full sm:w-44"><SelectInput value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Tüm hesaplar</option>{state.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</SelectInput></div>
                        <DateRange {...range} onChange={setRange} />
                    </>
                }
                initialSort={{ key: "date", dir: "desc" }}
                exportName="tahsilatlar"
                empty={{ icon: "payments", title: "Bu görünümde tahsilat yok", description: "Filtreleri değiştirin ya da yeni tahsilat girin." }}
            />
            {paying && <PaymentDialog onClose={() => setPaying(false)} />}
            {cancelling && <CancelPaymentDialog payment={cancelling} onClose={() => setCancelling(null)} />}
        </div>
    );
}
