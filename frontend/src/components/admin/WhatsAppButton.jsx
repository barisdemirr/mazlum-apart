"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import FormDialog from "@/components/admin/FormDialog";
import { Field } from "@/components/admin/fields";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { useToast } from "@/components/admin/Toast";
import { logContact } from "@/lib/admin/domain/support";
import { CHARGE_KIND, CONTACT_PURPOSE, date, money } from "@/lib/admin/labels";
import { monthLabel } from "@/lib/admin/domain/dates";

/**
 * WhatsApp ile hatırlatma (ücretsiz yöntem, plan 6): şablon seçilir, metin düzenlenir, WhatsApp açılır.
 * Mesaj gönderildi sayılınca "son iletişim" kaydı (ContactLog) otomatik yazılır.
 *
 * row: enrollmentRow(...) | item: ilgili borç kalemi (isteğe bağlı) | purpose: iletişim amacı
 */
export function fillTemplate(text, vars) {
    return text.replace(/\{(\w+)\}/g, (m, key) => (vars[key] !== undefined && vars[key] !== "" ? vars[key] : m));
}

export function whatsappLink(phone, text) {
    const digits = String(phone ?? "").replace(/\D/g, "");
    const full = digits.startsWith("90") ? digits : `90${digits.replace(/^0/, "")}`;
    return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

export default function WhatsAppButton({ row, item, purpose = "payment_reminder", compact = true, label = "WhatsApp", extraVars = {}, defaultTemplate, className = "" }) {
    const { state, run } = useAdmin();
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [lang, setLang] = useState("tr");
    const [templateId, setTemplateId] = useState(null);
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);

    const defaultKey = defaultTemplate ?? (purpose === "payment_overdue" || item?.lateDays > 0 ? "payment_overdue" : purpose);
    const templates = state.messageTemplates;

    const vars = useMemo(() => {
        const student = row.student;
        return {
            ad: student.firstName,
            telefon: student.phone,
            oda: row.room?.label ?? "odanız",
            tutar: item ? money(item.remaining) : money(row.summary.remaining),
            vade: item ? date(item.dueDate) : "",
            kalem: item ? `${CHARGE_KIND[item.kind]}${item.kind === "rent" ? ` (${monthLabel(item.month, { short: true })})` : ""}` : "ödeme",
            ...extraVars,
        };
    }, [row, item, extraVars]);

    const pick = (id, language = lang) => {
        const tpl = templates.find((t) => t.id === id);
        setTemplateId(id);
        setText(tpl ? fillTemplate(tpl[language], vars) : "");
    };

    const openDialog = () => {
        const tpl = templates.find((t) => t.key === defaultKey) ?? templates[0];
        setLang("tr");
        setOpen(true);
        if (tpl) pick(tpl.id, "tr");
    };

    const send = async () => {
        if (!text.trim()) return;
        window.open(whatsappLink(row.student.phone, text), "_blank", "noopener,noreferrer");
        setBusy(true);
        try {
            const tpl = templates.find((t) => t.id === templateId);
            await run(logContact, { enrollmentId: row.enrollment.id, purpose: tpl?.key ?? purpose });
            toast.success("İletişim kaydı eklendi.");
            setOpen(false);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    openDialog();
                }}
                title="WhatsApp ile ulaş"
                aria-label={`${row.student.firstName} ${row.student.lastName} için WhatsApp mesajı`}
                className={`ad-btn ad-btn-wa ad-btn-sm ${compact ? "!px-2.5" : ""} ${className}`}
            >
                <Icon name="chat" className="text-[16px]" />
                {!compact && label}
            </button>

            <FormDialog
                open={open}
                title="WhatsApp mesajı"
                description={`${row.student.firstName} ${row.student.lastName} · +90 ${row.student.phone}`}
                onClose={() => setOpen(false)}
                onSubmit={(e) => {
                    e.preventDefault();
                    send();
                }}
                saveLabel="WhatsApp'ta aç"
                busy={busy}
                columns={1}
            >
                <div className="flex flex-wrap items-center gap-2">
                    {templates.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => pick(t.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                                templateId === t.id ? "border-ad-brand bg-ad-brand text-white" : "border-ad-line-strong text-ad-body hover:bg-ad-sunken"
                            }`}
                        >
                            {t.name}
                        </button>
                    ))}
                    <div className="ms-auto flex rounded-full bg-ad-sunken p-0.5 text-xs font-bold">
                        {["tr", "en"].map((l) => (
                            <button
                                key={l}
                                type="button"
                                onClick={() => {
                                    setLang(l);
                                    if (templateId) pick(templateId, l);
                                }}
                                className={`rounded-full px-3 py-1 uppercase ${lang === l ? "bg-ad-surface text-ad-brand-dark shadow-ad-sm" : "text-ad-muted"}`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </div>
                <Field label="Mesaj" hint="Göndermeden önce metni düzenleyebilirsiniz. Gönderince iletişim geçmişine kaydedilir.">
                    <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} className="ad-field resize-y leading-relaxed" />
                </Field>
                {text.includes("{") && (
                    <p className="flex items-start gap-1.5 text-xs text-ad-warn">
                        <Icon name="info" className="mt-px text-[14px]" />
                        Mesajda doldurulmamış bir değişken kaldı (örn. {"{sifre}"}). Göndermeden önce elle yazın.
                    </p>
                )}
            </FormDialog>
        </>
    );
}

export { CONTACT_PURPOSE };
