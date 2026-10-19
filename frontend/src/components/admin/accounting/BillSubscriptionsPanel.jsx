"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import ActionDialog from "@/components/admin/ActionDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import useCommand from "@/components/admin/useCommand";
import DataTable from "@/components/admin/DataTable";
import { Badge } from "@/components/admin/ui";
import { addBillSubscription, deleteBillSubscription, updateBillSubscription } from "@/lib/admin/commands/finance";
import { BILL_KIND, money } from "@/lib/admin/labels";

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => [String(i + 1), `Her ayın ${i + 1}. günü`]);

/** Abonelik formunun alanları. Ekle ve düzenle aynı formu kullanır. */
const subscriptionFields = [
    { name: "kind", label: "Fatura türü", type: "select", options: Object.entries(BILL_KIND), span: 1 },
    { name: "subscriberNo", label: "Abone numarası", type: "text", required: true, span: 1 },
    { name: "provider", label: "Kurum (isteğe bağlı)", type: "text", hint: "Örn. TEDAŞ, Aksa, Türk Telekom", span: 1 },
    { name: "dueDay", label: "Son ödeme günü", type: "select", options: DAY_OPTIONS, hint: "Her ay kaydın vadesi bu gün olur; gelen faturada gerçek tarihi girersiniz.", span: 1 },
    { name: "estimatedAmount", label: "Tahmini aylık tutar", type: "number", required: true, hint: "İlk kayıt bu tutarla açılır. Sonraki aylar son girdiğiniz faturanın tutarıyla açılır.", span: 1 },
    { name: "startMonth", label: "İlk kayıt ayı (YYYY-AA)", type: "text", hint: "Boş bırakırsanız bu ay.", span: 1 },
    { name: "note", label: "Not", type: "text" },
];

/** Fatura abonelikleri: abone numarasını bir kez tanımlayın, her ay için "fatura bekleniyor" kaydı kendiliğinden açılsın. */
export default function BillSubscriptionsPanel({ subscriptions, closed }) {
    const { exec } = useCommand();
    const [dialog, setDialog] = useState(null);

    const columns = [
        { key: "kind", header: "Fatura", render: (s) => <div><span className="font-bold">{BILL_KIND[s.kind]}</span>{s.provider && <span className="block text-xs text-ad-muted">{s.provider}</span>}</div>, sort: (s) => BILL_KIND[s.kind], export: { value: (s) => BILL_KIND[s.kind] } },
        { key: "no", header: "Abone no", render: (s) => <span className="ad-num font-semibold">{s.subscriberNo}</span>, sort: (s) => s.subscriberNo, export: { value: (s) => s.subscriberNo } },
        { key: "day", header: "Son ödeme", sort: (s) => s.dueDay, render: (s) => <span className="text-sm">Her ayın {s.dueDay}. günü</span>, export: { type: "number", value: (s) => s.dueDay } },
        { key: "amount", header: "Son tutar", align: "end", sort: (s) => s.lastAmount ?? s.estimatedAmount, render: (s) => s.lastAmount != null ? <span className="ad-num font-bold">{money(s.lastAmount)}</span> : <span className="ad-num text-ad-muted" title="Henüz gerçek fatura girilmedi">~ {money(s.estimatedAmount)}</span>, export: { type: "money", value: (s) => s.lastAmount ?? s.estimatedAmount } },
        { key: "awaiting", header: "Bekleyen", align: "end", sort: (s) => s.awaitingCount, render: (s) => s.awaitingCount > 0 ? <Badge tone="accent">{s.awaitingCount} fatura</Badge> : <span className="text-xs text-ad-muted">—</span>, export: { type: "number", value: (s) => s.awaitingCount } },
        { key: "state", header: "Durum", render: (s) => <Badge tone={s.active ? "ok" : "neutral"}>{s.active ? "Aktif" : "Pasif"}</Badge>, export: { value: (s) => (s.active ? "Aktif" : "Pasif") } },
        { key: "act", header: "", align: "end", render: (s) => !closed && (
            <div className="flex justify-end gap-3 whitespace-nowrap">
                <button type="button" onClick={() => setDialog({ type: "edit", item: s })} className="text-xs font-bold text-ad-brand hover:underline">Düzenle</button>
                <button type="button" onClick={() => exec(updateBillSubscription, { ...toValues(s), id: s.id, active: !s.active }, s.active ? "Abonelik pasife alındı." : "Abonelik aktif edildi.")} className="text-xs font-bold text-ad-body hover:underline">{s.active ? "Pasife al" : "Aktif et"}</button>
                <button type="button" onClick={() => setDialog({ type: "del", item: s })} className="text-xs font-bold text-ad-danger hover:underline">Sil</button>
            </div>
        ) },
    ];

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-2xl text-sm text-ad-body">Abone numarasını bir kez tanımlayın. Her ay için “fatura bekleniyor” kaydı kendiliğinden açılır; fatura geldiğinde tutarı ve son ödeme tarihini güncellemeniz yeter.</p>
                {!closed && <button type="button" onClick={() => setDialog({ type: "add" })} className="ad-btn ad-btn-primary"><Icon name="add" className="text-[20px]" />Abonelik ekle</button>}
            </div>
            <DataTable columns={columns} rows={subscriptions} rowKey={(s) => s.id} searchText={(s) => `${BILL_KIND[s.kind]} ${s.subscriberNo} ${s.provider ?? ""}`} searchPlaceholder="Abone no ya da kurum ara" exportName="fatura-abonelikleri" empty={{ icon: "autorenew", title: "Abonelik yok", description: "Elektrik, su, doğalgaz ve internet abone numaralarını ekleyin." }} />
            {dialog?.type === "add" && <ActionDialog title="Abonelik ekle" command={addBillSubscription} initial={{ kind: "electricity", dueDay: "15" }} success="Abonelik eklendi, bu ayın kaydı açıldı." onClose={() => setDialog(null)} fields={subscriptionFields} />}
            {dialog?.type === "edit" && <ActionDialog title="Aboneliği düzenle" description="Geçmiş faturalar değişmez. Gerçek faturası girilmemiş aylık kayıtlar yeni vade gününe ve tutara uyar." command={updateBillSubscription} extra={{ id: dialog.item.id, active: dialog.item.active }} initial={toValues(dialog.item)} success="Abonelik güncellendi." onClose={() => setDialog(null)} fields={subscriptionFields} />}
            <ConfirmDialog open={dialog?.type === "del"} title="Abonelik silinsin mi?" message="Gerçek faturası girilmemiş aylık kayıtlar da silinir. Girilmiş ve ödenmiş faturalar kalır." confirmLabel="Sil" onCancel={() => setDialog(null)} onConfirm={async () => { const out = await exec(deleteBillSubscription, { id: dialog.item.id }, "Abonelik silindi."); if (out.ok) setDialog(null); }} />
        </div>
    );
}

/** Abonelik satırı -> form değerleri */
function toValues(s) {
    return { kind: s.kind, subscriberNo: s.subscriberNo, provider: s.provider ?? "", dueDay: String(s.dueDay), estimatedAmount: s.estimatedAmount, startMonth: s.startMonth, note: s.note ?? "" };
}
