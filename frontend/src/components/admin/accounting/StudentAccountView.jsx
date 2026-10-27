"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import ActionDialog from "@/components/admin/ActionDialog";
import ReceiptDialog from "@/components/admin/accounting/Receipt";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import useCommand from "@/components/admin/useCommand";
import { Badge, Card, PageHeader, StatusBadge } from "@/components/admin/ui";
import { adaptRow, describeCovered } from "@/lib/admin/adapters";
import { addCharge, amendCharge, applyMonthlyDiscount, cancelPayment, recordPayment, refundAdvance, resetStudentPassword, reverseCharge } from "@/lib/admin/commands/finance";
import { monthLabel } from "@/lib/admin/month";
import { turkeyDate } from "@/lib/format";
import { CHARGE_KIND, ENROLLMENT_STATUS, METHOD, PAY_STATUS, date, money } from "@/lib/admin/labels";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";

const REASON = [{ name: "reason", label: "Neden", type: "textarea", required: true }];

/** Tek öğrencinin hesabı: kalem kalem borç, tahsilatlar, işlem geçmişi. Kayıtlar silinmez; hata ters kayıtla düzeltilir. */
export default function StudentAccountView({ account, accounts }) {
    const { today } = useAdmin();
    const { exec } = useCommand();
    const [dialog, setDialog] = useState(null);
    const [password, setPassword] = useState(null);
    const [receiptId, setReceiptId] = useState(null);

    const row = useMemo(() => adaptRow(account.enrollment), [account.enrollment]);
    const { student, summary } = row;
    const e = account.enrollment;
    const closed = account.period.status === "closed";
    const ended = ["cancelled", "left"].includes(e.status);
    const acc = accounts.map((a) => [a.id, a.name]);
    const accountField = { name: "accountId", label: "Hesap (kasa / banka)", type: "select", options: acc, required: true };
    const close = () => setDialog(null);
    const name = `${student.firstName} ${student.lastName}`;

    const resetPassword = async () => {
        const out = await exec(resetStudentPassword, { studentId: student.id });
        if (out.ok) setPassword(out.result);
    };

    const openItems = account.items.filter((i) => !i.reversed && i.remaining > 0);
    const dialogs = {
        pay: <ActionDialog title="Tahsilat gir" description={name} command={recordPayment} extra={{ enrollmentId: e.id }} initial={{ amount: summary.remaining || "", date: today, method: "cash" }} success="Tahsilat kaydedildi." onClose={close} onDone={(r) => setReceiptId(r?.paymentId)} note="Tutar, en eski vadeli borçtan başlayarak kalemlere otomatik dağıtılır. Fazlası avans olur."
            fields={[{ name: "amount", label: "Tutar", type: "number", required: true, span: 1 }, { name: "date", label: "Tarih", type: "date", span: 1 }, { name: "method", label: "Yöntem", type: "select", options: Object.entries(METHOD), span: 1 }, { ...accountField, span: 1 }, { name: "note", label: "Not", type: "text" }]} />,
        refund: <ActionDialog title="Avans iadesi" description={`${name} · avans ${money(summary.advance)}`} command={refundAdvance} extra={{ enrollmentId: e.id }} initial={{ amount: summary.advance, date: today }} success="İade kaydedildi." saveLabel="İade et" onClose={close}
            fields={[{ name: "amount", label: "Tutar", type: "number", required: true, span: 1 }, { name: "date", label: "Tarih", type: "date", span: 1 }, accountField, { name: "note", label: "Not", type: "text" }]} />,
        charge: <ActionDialog title="Borç / indirim ekle" description={name} command={addCharge} extra={{ enrollmentId: e.id }} initial={{ kind: "other", dueDate: today, month: today.slice(0, 7) }} success="Kalem eklendi." onClose={close} note="İndirim için türü “İndirim” seçin; tutar pozitif yazılır."
            fields={[{ name: "kind", label: "Tür", type: "select", options: Object.entries(CHARGE_KIND), span: 1 }, { name: "amount", label: "Tutar", type: "number", required: true, span: 1 }, { name: "month", label: "Ay (YYYY-AA)", type: "text", span: 1 }, { name: "dueDate", label: "Vade", type: "date", span: 1 }, { name: "note", label: "Not", type: "text" }]} />,
        discount: <ActionDialog title="İndirim uygula" description={name} command={applyMonthlyDiscount} extra={{ enrollmentId: e.id }} initial={{ includePaid: "no" }} success="İndirim uygulandı." saveLabel="İndirimi uygula" onClose={close}
            note="Girilen aylık tutar depozito ve tüm kira/yaz taksitlerinden düşülür (bir taksit en az 1 ₺ kalır). Eski kalemler ters kayıtla kapanır, indirimli yenisi açılır; toplam borç, kalan ve taksit tutarları yeniden hesaplanır. Tutar, tarih ve işlemi yapan kullanıcı işlem geçmişine yazılır."
            fields={[
                { name: "amount", label: "Aylık indirim tutarı", type: "number", required: true, span: 1 },
                { name: "includePaid", label: "Ödenmiş taksitler", type: "select", span: 1, options: [["no", "Dokunma (yalnızca ödenmemiş)"], ["yes", "Dahil et (fazla ödeme avansa döner)"]], hint: "Dahil edilirse ödenen fazla tutar avans olur ve açık taksitlere otomatik mahsup edilir." },
                { name: "reason", label: "Gerekçe", type: "text", required: true, hint: "Örn. “Kardeş indirimi”, “Burs anlaşması”" },
            ]} />,
        amend: dialog?.item && (
            <ActionDialog
                title="Tutarı değiştir"
                description={`${CHARGE_KIND[dialog.item.kind]}${dialog.item.month && ["rent", "summer"].includes(dialog.item.kind) ? ` · ${monthLabel(dialog.item.month, { short: true })}` : ""} · şu an ${money(dialog.item.amount)}`}
                command={amendCharge}
                extra={{ id: dialog.item.id }}
                initial={{ amount: dialog.item.amount }}
                success="Tutar güncellendi."
                onClose={close}
                note="Eski kalem ters kayıtla kapanır, aynı ay ve vadeyle yeni tutarda kalem açılır. Ödenmiş kısım yeni kaleme otomatik sayılır. İşlem geçmişine yazılır."
                fields={[
                    { name: "amount", label: "Yeni tutar", type: "number", required: true, span: 1 },
                    { name: "reason", label: "Neden", type: "text", required: true, hint: "Örn. “Yaz fiyatı anlaşmaya göre düzeltildi”" },
                ]}
            />
        ),
        reverse: dialog?.item && <ActionDialog title="Kalemi ters çevir" description={`${CHARGE_KIND[dialog.item.kind]} · ${money(dialog.item.amount)}`} command={reverseCharge} extra={{ id: dialog.item.id }} success="Kalem iptal edildi (ters kayıt)." saveLabel="Ters çevir" danger onClose={close} fields={REASON} />,
        cancel: dialog?.item && <ActionDialog title="Tahsilatı iptal et" description={`${money(dialog.item.amount)} · ${date(dialog.item.date)}`} command={cancelPayment} extra={{ id: dialog.item.id }} success="Tahsilat iptal edildi." saveLabel="İptal et" danger onClose={close} fields={REASON} note="Kasa/banka hareketi ters kayıtla düzeltilir; dağıtılan tutar avansa döner." />,
    };

    return (
        <div>
            <PageHeader back={{ href: "/admin/hesaplar", label: "Hesaplar" }} eyebrow={account.period.name} title={name} description={`${row.room?.label ?? "Yerleşmedi"} · +90 ${student.phone}`}
                actions={<>
                    <WhatsAppButton row={row} item={summary.next ?? undefined} purpose={summary.status === "overdue" ? "payment_overdue" : "payment_reminder"} compact={false} className="!h-10 !px-4" />
                    <Link href={`/admin/ogrenciler/${e.id}`} className="ad-btn ad-btn-outline">Öğrenci</Link>
                    {!closed && !ended && <button type="button" onClick={() => setDialog({ type: "pay" })} className="ad-btn ad-btn-primary"><Icon name="add_card" className="text-[20px]" />Tahsilat gir</button>}
                </>} />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <StatusBadge map={ENROLLMENT_STATUS} value={e.status} />
                {!ended && <StatusBadge map={PAY_STATUS} value={summary.status} />}
                {closed && <Badge tone="warn">Kapalı dönem: salt okunur</Badge>}
                <button type="button" onClick={resetPassword} className="ms-auto text-xs font-bold text-ad-brand hover:underline">Portal şifresini sıfırla</button>
            </div>
            {password && <div className="mb-4 rounded-2xl bg-ad-ok-soft p-4 text-sm text-ad-ok">Yeni şifre: <code className="rounded bg-ad-surface px-2 py-0.5 tracking-widest">{password.password}</code> · yalnızca şimdi gösterilir; öğrenciye iletin.</div>}

            <div className="mb-5 grid gap-4 sm:grid-cols-4">
                {[["Toplam borç", summary.charged], ["Ödenen", summary.allocated], ["Kalan", summary.remaining], ["Avans", summary.advance]].map(([l, v]) => (
                    <Card key={l}><p className="text-xs font-bold uppercase tracking-wider text-ad-muted">{l}</p><p className="ad-num mt-2 text-2xl font-extrabold">{money(v)}</p></Card>
                ))}
            </div>
            <p className="mb-5 rounded-xl bg-ad-sunken px-3 py-2 text-xs">{describeCovered(summary.covered, money)}</p>

            <Card title="Borç kalemleri" actions={!closed && !ended && <div className="flex gap-1.5"><button type="button" onClick={() => setDialog({ type: "discount" })} className="ad-btn ad-btn-soft ad-btn-sm">İndirim uygula</button><button type="button" onClick={() => setDialog({ type: "charge" })} className="ad-btn ad-btn-soft ad-btn-sm">Kalem ekle</button>{summary.advance > 0 && <button type="button" onClick={() => setDialog({ type: "refund" })} className="ad-btn ad-btn-outline ad-btn-sm">Avans iade</button>}</div>}>
                <div className="ad-scroll mt-4 overflow-x-auto"><table className="ad-table">
                    <thead><tr><th>Kalem</th><th>Vade</th><th className="!text-end">Tutar</th><th className="!text-end">Ödenen</th><th className="!text-end">Kalan</th><th /></tr></thead>
                    <tbody>{account.items.map((i) => (
                        <tr key={i.id} className={i.reversed ? "opacity-50" : ""}>
                            <td className="font-semibold">{CHARGE_KIND[i.kind]}{i.kind === "rent" || i.kind === "summer" ? ` · ${monthLabel(i.month, { short: true })}` : ""}{i.note ? <span className="font-normal text-ad-muted"> · {i.note}</span> : null}{i.reversed && <Badge tone="neutral" className="ms-2">İptal</Badge>}</td>
                            <td className="ad-num" title={i.remaining > 0 && i.deadline !== i.dueDate ? `Planlanan vade: ${date(i.dueDate)}` : undefined}>{date(i.remaining > 0 && i.deadline ? i.deadline : i.dueDate)}</td>
                            <td className="ad-num text-end">{money(i.amount)}</td>
                            <td className="ad-num text-end text-ad-ok">{money(i.allocated)}</td>
                            <td className={`ad-num text-end font-bold ${i.remaining > 0 && (i.deadline ?? i.dueDate) < today ? "text-ad-danger" : ""}`}>{money(i.remaining)}</td>
                            <td className="text-end">
                                {!closed && !i.reversed && i.amount > 0 && (
                                    <span className="flex justify-end gap-3 whitespace-nowrap">
                                        <button type="button" onClick={() => setDialog({ type: "amend", item: i })} className="text-xs font-bold text-ad-brand hover:underline">Tutarı değiştir</button>
                                        <button type="button" onClick={() => setDialog({ type: "reverse", item: i })} className="text-xs font-bold text-ad-danger hover:underline">Ters çevir</button>
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}</tbody>
                </table></div>
                {openItems.length === 0 && <p className="mt-3 text-xs text-ad-muted">Açık borç yok.</p>}
            </Card>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <Card title="Tahsilatlar ve iadeler">
                    {account.payments.length === 0 ? <p className="mt-4 text-sm text-ad-muted">Henüz tahsilat yok.</p> : (
                        <ul className="mt-4 divide-y divide-ad-line">{account.payments.map((p) => (
                            <li key={p.id} className={`flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm ${p.cancelledAt ? "opacity-50" : ""}`}>
                                <span><b className="ad-num">{p.kind === "refund" ? "−" : ""}{money(p.amount)}</b> <span className="text-xs text-ad-muted">· {date(p.date)} · {METHOD[p.method]} · {p.accountName}</span>{p.cancelledAt && <Badge tone="neutral" className="ms-2">İptal</Badge>}</span>
                                <span className="flex items-center gap-3">
                                {p.kind !== "refund" && <button type="button" onClick={() => setReceiptId(p.id)} className="text-xs font-bold text-ad-brand hover:underline">Makbuz</button>}
                                {!closed && !p.cancelledAt && <button type="button" onClick={() => setDialog({ type: "cancel", item: p })} className="text-xs font-bold text-ad-danger hover:underline">İptal et</button>}
                                </span>
                            </li>
                        ))}</ul>
                    )}
                </Card>
                <Card title="İşlem geçmişi">
                    <ul className="mt-4 space-y-2 text-sm">{account.history.length === 0 ? <li className="text-ad-muted">Kayıt yok.</li> : account.history.slice(0, 15).map((h) => (
                        <li key={h.id} className="flex justify-between gap-2"><span className="min-w-0"><b>{h.action}</b>{h.note ? <span className="text-ad-muted"> · {h.note}</span> : null}</span><span className="ad-num shrink-0 text-xs text-ad-muted">{date(turkeyDate(h.at))} · {h.by}</span></li>
                    ))}</ul>
                </Card>
            </div>
            {dialog && dialogs[dialog.type]}
            {receiptId && <ReceiptDialog paymentId={receiptId} onClose={() => setReceiptId(null)} />}
        </div>
    );
}
