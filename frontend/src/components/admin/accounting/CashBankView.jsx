"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import ActionDialog from "@/components/admin/ActionDialog";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { addAccount, setOpening, transfer } from "@/lib/admin/commands/finance";
import { turkeyDate } from "@/lib/format";
import { ACCOUNT_TYPE, TX_SOURCE, date, money } from "@/lib/admin/labels";

/** Kasa ve banka hesapları: bakiyeler hareketlerden hesaplanır. Açılış bakiyesi dönem başına bir kez girilir; hesaplar arası aktarım yapılır. */
export default function CashBankView({ data }) {
    const { period, today } = useAdmin();
    const [dialog, setDialog] = useState(null);
    const closed = period.status === "closed";
    const accs = data.accounts.filter((a) => a.active);
    const opts = accs.map((a) => [a.id, a.name]);
    return (
        <div>
            <PageHeader title="Kasa & Banka" description="Nakit ve banka hesaplarının bu dönemdeki durumu."
                actions={!closed && <><button type="button" onClick={() => setDialog({ type: "account" })} className="ad-btn ad-btn-outline"><Icon name="add" className="text-[20px]" />Hesap ekle</button>{accs.length > 1 && <button type="button" onClick={() => setDialog({ type: "transfer" })} className="ad-btn ad-btn-primary"><Icon name="swap_horiz" className="text-[20px]" />Aktarım</button>}</>} />
            <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Kasa</p><p className="ad-num mt-2 text-2xl font-extrabold">{money(data.cash)}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Banka</p><p className="ad-num mt-2 text-2xl font-extrabold">{money(data.bank)}</p></Card>
                <Card><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Toplam</p><p className="ad-num mt-2 text-2xl font-extrabold">{money(data.cash + data.bank)}</p></Card>
            </div>
            <div className="mb-5 grid gap-4 md:grid-cols-2">
                {data.accounts.map((a) => (
                    <Card key={a.id} title={a.name} description={`${ACCOUNT_TYPE[a.type]}${a.iban ? ` · ${a.iban}` : ""}`} actions={!a.active ? <Badge tone="neutral">Pasif</Badge> : !closed && !data.openingDone.includes(a.id) && <button type="button" onClick={() => setDialog({ type: "opening", item: a })} className="ad-btn ad-btn-soft ad-btn-sm">Açılış bakiyesi</button>}>
                        <p className="ad-num mt-3 text-2xl font-extrabold">{money(a.balance)}</p>
                        <p className="mt-1 text-xs text-ad-muted">Açılış {money(a.opening)} · giriş {money(a.inflow)} · çıkış {money(a.outflow)}</p>
                    </Card>
                ))}
            </div>
            <Card title="Hareketler">
                <div className="ad-scroll mt-4 overflow-x-auto"><table className="ad-table">
                    <thead><tr><th>Tarih</th><th>Hesap</th><th>Kaynak</th><th>Not</th><th className="!text-end">Tutar</th></tr></thead>
                    <tbody>{data.transactions.slice(0, 100).map((t) => (
                        <tr key={t.id}><td className="ad-num">{date(t.date)}</td><td>{t.accountName}</td><td>{TX_SOURCE[t.source] ?? t.source}</td><td className="text-xs text-ad-muted">{t.note ?? "—"} <span title={turkeyDate(t.createdAt)}>{t.createdBy ? `· ${t.createdBy}` : ""}</span></td>
                            <td className={`ad-num text-end font-bold ${t.direction === "in" ? "text-ad-ok" : "text-ad-danger"}`}>{t.direction === "in" ? "+" : "−"}{money(t.amount)}</td></tr>
                    ))}{data.transactions.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-sm text-ad-muted">Henüz hareket yok.</td></tr>}</tbody>
                </table></div>
            </Card>
            {dialog?.type === "account" && <ActionDialog title="Hesap ekle" command={addAccount} success="Hesap eklendi." onClose={() => setDialog(null)} fields={[{ name: "type", label: "Tür", type: "select", options: Object.entries(ACCOUNT_TYPE), span: 1 }, { name: "name", label: "Hesap adı", type: "text", required: true, span: 1 }, { name: "iban", label: "IBAN (banka için)", type: "text" }]} />}
            {dialog?.type === "opening" && <ActionDialog title="Açılış bakiyesi" description={dialog.item.name} command={setOpening} extra={{ id: dialog.item.id, periodId: period.id }} initial={{ date: period.start }} success="Açılış bakiyesi girildi." note="Bu dönem için yalnızca bir kez girilir; yanlışsa ters hareketle düzeltilir." onClose={() => setDialog(null)} fields={[{ name: "amount", label: "Tutar", type: "number", required: true, span: 1 }, { name: "date", label: "Tarih", type: "date", span: 1 }]} />}
            {dialog?.type === "transfer" && <ActionDialog title="Hesaplar arası aktarım" command={transfer} extra={{ periodId: period.id }} initial={{ date: today, toId: opts[1]?.[0] }} success="Aktarım yapıldı." saveLabel="Aktar" onClose={() => setDialog(null)} fields={[{ name: "fromId", label: "Kaynak hesap", type: "select", options: opts, span: 1 }, { name: "toId", label: "Hedef hesap", type: "select", options: opts, span: 1 }, { name: "amount", label: "Tutar", type: "number", required: true, span: 1 }, { name: "date", label: "Tarih", type: "date", span: 1 }, { name: "note", label: "Not", type: "text" }]} />}
        </div>
    );
}
