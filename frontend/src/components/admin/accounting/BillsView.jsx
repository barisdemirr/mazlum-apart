"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import ActionDialog from "@/components/admin/ActionDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import useCommand from "@/components/admin/useCommand";
import DataTable from "@/components/admin/DataTable";
import { Card, PageHeader, StatusBadge } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { addBill, deleteBill, payBill } from "@/lib/admin/commands/finance";
import { monthLabel } from "@/lib/admin/month";
import { BILL_KIND, BILL_STATE, date, money } from "@/lib/admin/labels";

/** Faturalar (elektrik, su, doğalgaz, internet). Ödenince seçilen hesaptan gider kaydı otomatik oluşur. Önceki dönemden açık kalanlar ayrı gösterilir. */
export default function BillsView({ data, accounts }) {
    const { period, today } = useAdmin();
    const { exec } = useCommand();
    const [dialog, setDialog] = useState(null);
    const closed = period.status === "closed";
    const rows = [...data.items, ...data.carriedOver];
    const unpaid = rows.filter((b) => b.status === "unpaid");
    const columns = [
        { key: "kind", header: "Fatura", render: (b) => <span className="font-bold">{BILL_KIND[b.kind]}{b.periodId !== period.id && <span className="ms-1 text-[11px] font-normal text-ad-warn">({b.periodName})</span>}</span>, export: { value: (b) => BILL_KIND[b.kind] } },
        { key: "month", header: "Ay", render: (b) => monthLabel(b.month, { short: true }), export: { value: (b) => b.month } },
        { key: "due", header: "Vade", sort: (b) => b.dueDate, render: (b) => <span className="ad-num">{date(b.dueDate)}</span>, export: { type: "date", value: (b) => b.dueDate } },
        { key: "amount", header: "Tutar", align: "end", sort: (b) => b.amount, render: (b) => <span className="ad-num font-bold">{money(b.amount)}</span>, export: { type: "money", value: (b) => b.amount } },
        { key: "state", header: "Durum", render: (b) => <StatusBadge map={BILL_STATE} value={b.state} />, export: { value: (b) => BILL_STATE[b.state].label } },
        { key: "act", header: "", align: "end", render: (b) => b.status === "unpaid" ? <div className="flex justify-end gap-3 whitespace-nowrap">
            <button type="button" onClick={() => setDialog({ type: "pay", item: b })} className="text-xs font-bold text-ad-brand hover:underline">Öde</button>
            {b.periodId === period.id && !closed && <button type="button" onClick={() => setDialog({ type: "del", item: b })} className="text-xs font-bold text-ad-danger hover:underline">Sil</button>}</div> : <span className="text-xs text-ad-muted">{b.paidAt ? date(b.paidAt) : ""}</span> },
    ];
    return (
        <div>
            <PageHeader title="Faturalar" description="Vadesi gelen faturaları takip edin, ödenince hesaptan düşün." actions={!closed && <button type="button" onClick={() => setDialog({ type: "add" })} className="ad-btn ad-btn-primary"><Icon name="add" className="text-[20px]" />Fatura ekle</button>} />
            <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Ödenmemiş</p><p className="ad-num mt-2 text-2xl font-extrabold">{money(unpaid.reduce((s, b) => s + b.amount, 0))}</p><p className="text-xs text-ad-muted">{unpaid.length} fatura</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Gecikmiş</p><p className="ad-num mt-2 text-2xl font-extrabold text-ad-danger">{rows.filter((b) => b.state === "overdue").length}</p></Card>
            </div>
            <DataTable columns={columns} rows={rows} rowKey={(b) => b.id} searchText={(b) => `${BILL_KIND[b.kind]} ${b.month}`} searchPlaceholder="Fatura ara" exportName="faturalar" empty={{ icon: "receipt_long", title: "Fatura yok" }} />
            {dialog?.type === "add" && <ActionDialog title="Fatura ekle" command={addBill} extra={{ periodId: period.id }} initial={{ month: today.slice(0, 7), dueDate: today }} success="Fatura eklendi." onClose={() => setDialog(null)}
                fields={[{ name: "kind", label: "Tür", type: "select", options: Object.entries(BILL_KIND), span: 1 }, { name: "month", label: "Ay (YYYY-AA)", type: "text", required: true, span: 1 }, { name: "amount", label: "Tutar", type: "number", required: true, span: 1 }, { name: "dueDate", label: "Son ödeme tarihi", type: "date", span: 1 }, { name: "note", label: "Not", type: "text" }]} />}
            {dialog?.type === "pay" && <ActionDialog title="Faturayı öde" description={`${BILL_KIND[dialog.item.kind]} · ${money(dialog.item.amount)}`} command={payBill} extra={{ id: dialog.item.id }} initial={{ date: today }} success="Fatura ödendi, gider kaydı oluştu." saveLabel="Öde" onClose={() => setDialog(null)}
                fields={[{ name: "accountId", label: "Ödeme yapılan hesap", type: "select", options: accounts.map((a) => [a.id, a.name]), required: true }, { name: "date", label: "Tarih", type: "date" }]} />}
            <ConfirmDialog open={dialog?.type === "del"} title="Fatura silinsin mi?" message="Yalnızca ödenmemiş fatura silinebilir." confirmLabel="Sil" onCancel={() => setDialog(null)} onConfirm={async () => { const out = await exec(deleteBill, { id: dialog.item.id }, "Fatura silindi."); if (out.ok) setDialog(null); }} />
        </div>
    );
}
