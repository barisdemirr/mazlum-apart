"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import FormDialog from "@/components/admin/FormDialog";
import { Field } from "@/components/admin/fields";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { useToast } from "@/components/admin/Toast";
import { logContact, sendSms } from "@/lib/admin/domain/support";
import { fillTemplate, hasUnfilled, messageVars, smsInfo, whatsappLink } from "@/lib/admin/messaging";
import { CONTACT_PURPOSE } from "@/lib/admin/labels";

/**
 * Öğrenciye mesaj: şablon seçilir, metin düzenlenir, WhatsApp açılır (ücretsiz, bağlantı ile) ya da SMS gönderilir (Verimor).
 * Her iki yolda da "son iletişim" kaydı (ContactLog) otomatik yazılır.
 *
 * row: enrollmentRow(...) | item: ilgili borç kalemi (isteğe bağlı) | purpose: iletişim amacı
 */
export default function WhatsAppButton({ row, item, purpose = "payment_reminder", compact = true, label = "WhatsApp", extraVars = {}, defaultTemplate, className = "" }) {
    const { state, run } = useAdmin();
    const toast = useToast();
    const [open, setOpen] = useState(false);
    const [lang, setLang] = useState("tr");
    const [templateId, setTemplateId] = useState(null);
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [channel, setChannel] = useState("whatsapp");

    const defaultKey = defaultTemplate ?? (purpose === "payment_overdue" || item?.lateDays > 0 ? "payment_overdue" : purpose);
    const templates = state.messageTemplates;

    const vars = useMemo(() => messageVars(row, item, extraVars), [row, item, extraVars]);

    const pick = (id, language = lang) => {
        const tpl = templates.find((t) => t.id === id);
        setTemplateId(id);
        setText(tpl ? fillTemplate(tpl[language], vars) : "");
    };

    const openDialog = () => {
        const tpl = templates.find((t) => t.key === defaultKey) ?? templates[0];
        setLang("tr");
        setChannel("whatsapp");
        setOpen(true);
        if (tpl) pick(tpl.id, "tr");
    };

    const sms = smsInfo(text);
    const unfilled = hasUnfilled(text);
    const phoneOk = /^5\d{9}$/.test(row.student.phone ?? "");

    const send = async () => {
        if (!text.trim()) return;
        const tpl = templates.find((t) => t.id === templateId);
        const key = tpl?.key ?? purpose;
        setBusy(true);
        try {
            if (channel === "sms") {
                if (unfilled) throw new Error("Mesajda doldurulmamış değişken var.");
                if (!phoneOk) throw new Error("Öğrencinin telefon numarası geçersiz.");
                await run(sendSms, { messages: [{ enrollmentId: row.enrollment.id, text, purpose: key }] });
                toast.success(`SMS gönderime alındı (${sms.parts} SMS).`);
            } else {
                window.open(whatsappLink(row.student.phone, text), "_blank", "noopener,noreferrer");
                await run(logContact, { enrollmentId: row.enrollment.id, purpose: key });
                toast.success("İletişim kaydı eklendi.");
            }
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
                title="Mesaj gönder (WhatsApp / SMS)"
                aria-label={`${row.student.firstName} ${row.student.lastName} için mesaj`}
                className={`ad-btn ad-btn-wa ad-btn-sm ${compact ? "!px-2.5" : ""} ${className}`}
            >
                <Icon name="chat" className="text-[16px]" />
                {!compact && label}
            </button>

            <FormDialog
                open={open}
                title="Öğrenciye mesaj"
                description={`${row.student.firstName} ${row.student.lastName} · +90 ${row.student.phone}`}
                onClose={() => setOpen(false)}
                onSubmit={(e) => {
                    e.preventDefault();
                    send();
                }}
                saveLabel={channel === "sms" ? "SMS gönder" : "WhatsApp'ta aç"}
                busy={busy}
                columns={1}
            >
                <div className="flex rounded-full bg-ad-sunken p-0.5 text-xs font-bold self-start" role="tablist" aria-label="Kanal">
                    {[["whatsapp", "WhatsApp", "chat"], ["sms", "SMS", "sms"]].map(([k, label, icon]) => (
                        <button key={k} type="button" role="tab" aria-selected={channel === k} onClick={() => setChannel(k)} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 ${channel === k ? "bg-ad-surface text-ad-brand-dark shadow-ad-sm" : "text-ad-muted"}`}>
                            <Icon name={icon} className="text-[15px]" />{label}
                        </button>
                    ))}
                </div>
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
                <Field label="Mesaj" hint="Göndermeden önce metni düzenleyebilirsiniz. Gönderilince iletişim geçmişine kaydedilir.">
                    <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} className="ad-field resize-y leading-relaxed" />
                </Field>
                {channel === "sms" && (
                    <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-ad-muted">
                        <span>{sms.length} karakter · <b className="text-ad-body">{sms.parts} SMS</b>{sms.unicode && " (Türkçe karakter: kısa SMS)"}</span>
                        <span>+90 {row.student.phone}{!phoneOk && " · geçersiz numara"}</span>
                    </p>
                )}
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
