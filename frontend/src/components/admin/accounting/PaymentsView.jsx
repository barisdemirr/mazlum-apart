"use client";

import Link from "next/link";
import DataTable from "@/components/admin/DataTable";
import { Card, PageHeader } from "@/components/admin/ui";
import { turkeyDate } from "@/lib/format";
import { METHOD, date, money } from "@/lib/admin/labels";

/** Dönemin tahsilat ve iade listesi (yalnızca okuma; giriş ve iptal öğrenci hesabından yapılır). */
export default function PaymentsView({ data }) {
    const { items, totals } = data;
    const columns = [
        { key: "date", header: "Tarih", sort: (p) => p.date, render: (p) => <span className="ad-num">{date(p.date)}</span>, export: { type: "date", value: (p) => p.date } },
        { key: "student", header: "Öğrenci", sort: (p) => p.student.lastName, render: (p) => <Link href={`/admin/hesaplar/${p.enrollmentId}`} className="font-bold hover:text-ad-brand" onClick={(e) => e.stopPropagation()}>{p.student.firstName} {p.student.lastName}</Link>, export: { value: (p) => `${p.student.firstName} ${p.student.lastName}`, width: 24 } },
        { key: "kind", header: "Tür", render: (p) => (p.kind === "refund" ? "İade" : "Tahsilat"), export: { value: (p) => (p.kind === "refund" ? "İade" : "Tahsilat") } },
        { key: "method", header: "Yöntem", render: (p) => METHOD[p.method], export: { value: (p) => METHOD[p.method] } },
        { key: "acc", header: "Hesap", render: (p) => p.accountName, export: { value: (p) => p.accountName } },
        { key: "amount", header: "Tutar", align: "end", sort: (p) => p.amount, render: (p) => <span className={`ad-num font-bold ${p.cancelledAt ? "line-through opacity-50" : p.kind === "refund" ? "text-ad-danger" : ""}`}>{money(p.amount)}</span>, export: { type: "money", value: (p) => p.amount } },
        { key: "by", header: "Giren", render: (p) => p.createdBy ?? "—", export: { value: (p) => p.createdBy ?? "" } },
        { key: "state", header: "Durum", render: (p) => (p.cancelledAt ? `İptal · ${date(turkeyDate(p.cancelledAt))}` : "—"), export: { value: (p) => (p.cancelledAt ? "İptal" : "") } },
    ];
    return (
        <div>
            <PageHeader title="Tahsilatlar" description="Bu dönemde alınan tüm ödemeler ve iadeler. Yeni tahsilat, öğrencinin hesap sayfasından girilir." />
            <div className="mb-5 grid gap-4 sm:grid-cols-4">
                {[["Tahsilat", totals.collected], ["İade", totals.refunded], ["Net", totals.collected - totals.refunded], ["Nakit / Havale / POS", null]].map(([l, v]) => (
                    <Card key={l}><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">{l}</p>
                        {v === null ? <p className="ad-num mt-2 text-sm font-bold">{money(totals.byMethod.cash)} · {money(totals.byMethod.transfer)} · {money(totals.byMethod.pos)}</p> : <p className="ad-num mt-2 text-2xl font-extrabold">{money(v)}</p>}</Card>
                ))}
            </div>
            <DataTable columns={columns} rows={items} rowKey={(p) => p.id} searchText={(p) => `${p.student.firstName} ${p.student.lastName} ${p.note ?? ""}`} searchPlaceholder="Öğrenci ara" exportName="tahsilatlar" empty={{ icon: "payments", title: "Henüz tahsilat yok" }} />
        </div>
    );
}
