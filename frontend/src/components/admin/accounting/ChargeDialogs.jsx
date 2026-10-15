"use client";

import { useState } from "react";
import FormDialog from "@/components/admin/FormDialog";
import { DateInput, Field, NumberInput, SelectInput, TextInput } from "@/components/admin/fields";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import useCommand from "@/components/admin/useCommand";
import { addCharge, cancelPayment, refundAdvance, reverseCharge } from "@/lib/admin/domain/ledger";
import { money } from "@/lib/admin/labels";
import { itemLabel } from "./PaymentDialog";

/** Elle kalem: ek konaklama, yaz, diğer ya da indirim. Avans varsa otomatik mahsup edilir. */
export function ChargeDialog({ enrollmentId, advance = 0, onClose }) {
    const { today } = useAdmin();
    const { exec, busy } = useCommand();
    const [form, setForm] = useState({ kind: "extra_stay", amount: "", dueDate: today, note: "" });
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const discount = form.kind === "discount";

    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(addCharge, { enrollmentId, ...form }, discount ? "İndirim uygulandı." : "Kalem eklendi.");
        if (out.ok) onClose();
    };

    return (
        <FormDialog open title="Kalem ekle" description="Borç kalemi ya da indirim. Eklenen kalem düzenlenmez; hata olursa iptal edilip doğrusu girilir." onClose={onClose} onSubmit={submit} busy={busy} saveLabel={discount ? "İndirimi uygula" : "Kalemi ekle"} columns={1}>
            <Field label="Tür" required>
                <SelectInput value={form.kind} onChange={set("kind")}>
                    <option value="extra_stay">Ek konaklama (bütünleme vb.)</option>
                    <option value="summer">Yaz konaklaması</option>
                    <option value="other">Diğer</option>
                    <option value="discount">İndirim</option>
                </SelectInput>
            </Field>
            <Field label="Tutar" required hint={discount ? "Pozitif yazın; açık borçlardan düşülür." : undefined}><NumberInput suffix="₺" min="0" step="0.01" value={form.amount} onChange={set("amount")} /></Field>
            <Field label="Vade tarihi" required><DateInput value={form.dueDate} onChange={set("dueDate")} /></Field>
            <Field label="Açıklama" required={discount}><TextInput value={form.note} onChange={set("note")} placeholder={discount ? "İndirim nedeni (zorunlu)" : "Örn. Haziran bütünleme konaklaması"} /></Field>
            {advance > 0 && !discount && <p className="rounded-xl bg-ad-accent-soft px-3 py-2 text-xs text-ad-brand-dark">Öğrencinin {money(advance)} avansı var; yeni kalem otomatik mahsup edilecek.</p>}
        </FormDialog>
    );
}

/** Kalem iptali (ters kayıt). Ödenmiş kısım varsa avansa döner. */
export function ReverseChargeDialog({ item, onClose }) {
    const { exec, busy } = useCommand();
    const [reason, setReason] = useState("");
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(reverseCharge, { chargeId: item.id, reason }, "Kalem iptal edildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title="Kalemi iptal et" description={`${itemLabel(item)} · ${money(item.net)}`} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="İptal et" danger columns={1}>
            <div className="rounded-2xl bg-ad-warn-soft p-4 text-xs text-ad-warn">
                Kalem silinmez; karşılığında bir ters kayıt yazılır ve geçmişte görünür kalır.
                {item.allocated > 0 && <> Bu kaleme ödenmiş <b>{money(item.allocated)}</b> öğrencinin avansına döner (iade edilebilir ya da başka kaleme mahsup edilir).</>}
            </div>
            <Field label="İptal nedeni" required><TextInput as="textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></Field>
        </FormDialog>
    );
}

/** Avans iadesi: kasa/bankadan çıkış hareketi yazılır */
export function RefundDialog({ enrollmentId, advance, onClose }) {
    const { state, today } = useAdmin();
    const { exec, busy } = useCommand();
    const [form, setForm] = useState({ amount: String(advance), date: today, accountId: "acc-cash", note: "" });
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(refundAdvance, { enrollmentId, ...form }, "Avans iadesi kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title="Avans iadesi" description={`İade edilebilecek en çok ${money(advance)}`} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="İadeyi kaydet" columns={1}>
            <Field label="Tutar" required><NumberInput suffix="₺" min="0" max={advance} step="0.01" value={form.amount} onChange={set("amount")} /></Field>
            <Field label="İade tarihi" required><DateInput value={form.date} onChange={set("date")} /></Field>
            <Field label="Hangi hesaptan ödendi" required>
                <SelectInput value={form.accountId} onChange={set("accountId")}>
                    {state.accounts.filter((a) => a.active).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </SelectInput>
            </Field>
            <Field label="Açıklama"><TextInput value={form.note} onChange={set("note")} /></Field>
        </FormDialog>
    );
}

/** Tahsilat iptali */
export function CancelPaymentDialog({ payment, onClose }) {
    const { exec, busy } = useCommand();
    const [reason, setReason] = useState("");
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(cancelPayment, { paymentId: payment.id, reason }, "Tahsilat iptal edildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title="Tahsilatı iptal et" description={money(payment.amount)} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Tahsilatı iptal et" danger columns={1}>
            <div className="rounded-2xl bg-ad-warn-soft p-4 text-xs text-ad-warn">Tahsilat silinmez. Dağıtımlar geri alınır, kasa/banka hesabına ters hareket yazılır; kayıt “iptal edildi” olarak görünür kalır.</div>
            <Field label="İptal nedeni" required><TextInput as="textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></Field>
        </FormDialog>
    );
}
