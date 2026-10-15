"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import ActionDialog from "@/components/admin/ActionDialog";
import DataTable from "@/components/admin/DataTable";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { addExpense, cancelExpense } from "@/lib/admin/commands/finance";
import { date, money } from "@/lib/admin/labels";

/** Giderler. Kayıt silinmez; yanlış girilen gider iptal edilir (kasa/banka hareketi ters kayıtla düzelir). */
export default function ExpensesView({ data, categories, accounts }) {
    const { period, today } = useAdmin();
    const [dialog, setDialog] = useState(null);
    const closed = period.status === "closed";
    const columns = [
        { key: "date", header: "Tarih", sort: (x) => x.date, render: (x) => <span className="ad-num">{date(x.date)}</span>, export: { type: "date", value: (x) => x.date } },
        { key: "cat", header: "Kategori", render: (x) => x.categoryName, export: { value: (x) => x.categoryName } },
        { key: "desc", header: "Açıklama", render: (x) => <span className={x.cancelledAt ? "opacity-50" : ""}>{x.description || "—"}{x.billId && <Badge tone="neutral" className="ms-2">Fatura</Badge>}{x.cancelledAt && <Badge tone="neutral" className="ms-2">İptal</Badge>}</span>, export: { value: (x) => x.description, width: 30 } },
        { key: "acc", header: "Hesap", render: (x) => x.accountName, export: { value: (x) => x.accountName } },
        { key: "amount", header: "Tutar", align: "end", sort: (x) => x.amount, render: (x) => <span className={`ad-num font-bold ${x.cancelledAt ? "line-through opacity-50" : ""}`}>{money(x.amount)}</span>, export: { type: "money", value: (x) => x.amount } },
        { key: "act", header: "", align: "end", render: (x) => !closed && !x.cancelledAt && !x.billId ? <button type="button" onClick={(e) => { e.stopPropagation(); setDialog({ type: "cancel", item: x }); }} className="text-xs font-bold text-ad-danger hover:underline">İptal et</button> : null },
    ];
    return (
        <div>
            <PageHeader title="Giderler" description="Yurdun dönem giderleri. Fatura ödemeleri Faturalar sayfasından yapılınca buraya otomatik düşer." actions={!closed && <button type="button" onClick={() => setDialog({ type: "add" })} className="ad-btn ad-btn-primary"><Icon name="add" className="text-[20px]" />Gider ekle</button>} />
            <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Toplam gider</p><p className="ad-num mt-2 text-2xl font-extrabold">{money(data.total)}</p><p className="text-xs text-ad-muted">{data.liveCount} kayıt</p></Card>
                <Card className="sm:col-span-2"><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Kategoriler</p><ul className="mt-2 flex flex-wrap gap-2">{data.byCategory.map((c) => <li key={c.categoryId} className="rounded-full bg-ad-sunken px-3 py-1 text-xs font-semibold">{c.name} · <span className="ad-num">{money(c.amount)}</span></li>)}{data.byCategory.length === 0 && <li className="text-sm text-ad-muted">Henüz gider yok.</li>}</ul></Card>
            </div>
            <DataTable columns={columns} rows={data.items} rowKey={(x) => x.id} searchText={(x) => `${x.categoryName} ${x.description}`} searchPlaceholder="Gider ara" exportName="giderler" empty={{ icon: "receipt_long", title: "Henüz gider yok" }} />
            {dialog?.type === "add" && <ActionDialog title="Gider ekle" command={addExpense} extra={{ periodId: period.id }} initial={{ date: today }} success="Gider kaydedildi." onClose={() => setDialog(null)}
                fields={[{ name: "categoryId", label: "Kategori", type: "select", options: categories.filter((c) => c.active).map((c) => [c.id, c.name]), required: true, span: 1 }, { name: "amount", label: "Tutar", type: "number", required: true, span: 1 }, { name: "date", label: "Tarih", type: "date", span: 1 }, { name: "accountId", label: "Ödenen hesap", type: "select", options: accounts.map((a) => [a.id, a.name]), span: 1 }, { name: "description", label: "Açıklama", type: "text" }]} />}
            {dialog?.type === "cancel" && <ActionDialog title="Gideri iptal et" description={`${dialog.item.categoryName} · ${money(dialog.item.amount)}`} command={cancelExpense} extra={{ id: dialog.item.id }} success="Gider iptal edildi." saveLabel="İptal et" danger onClose={() => setDialog(null)} fields={[{ name: "reason", label: "Neden", type: "textarea", required: true }]} />}
        </div>
    );
}
