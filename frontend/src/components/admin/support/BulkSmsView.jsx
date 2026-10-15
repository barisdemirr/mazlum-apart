"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { useToast } from "@/components/admin/Toast";
import { Avatar, Card, Chips, EmptyState } from "@/components/admin/ui";
import { Field } from "@/components/admin/fields";
import { sendSms } from "@/lib/admin/domain/support";
import { fillTemplate, hasUnfilled, messageVars, smsInfo } from "@/lib/admin/messaging";

const AUDIENCES = [
    { value: "overdue", label: "Gecikmiş ödemesi olanlar" },
    { value: "upcoming", label: "Vadesi yaklaşanlar (7 gün)" },
    { value: "all", label: "Tüm öğrenciler" },
];

/**
 * Toplu SMS (Verimor): kitle seç, şablon seç, alıcıları işaretle, onayla.
 * Her alıcı için mesaj kendi bilgileriyle ayrı doldurulur ({ad}, {tutar}, {vade}…).
 * Gönderim şimdilik MOCK (iletişim geçmişine "sms" olarak yazılır); gerçek gönderimi backend yapar.
 */
export default function BulkSmsView() {
    const { state, view, run } = useAdmin();
    const toast = useToast();
    const [audience, setAudience] = useState("overdue");
    const [templateId, setTemplateId] = useState(() => state.messageTemplates.find((t) => t.key === "payment_overdue")?.id ?? state.messageTemplates[0]?.id);
    const [lang, setLang] = useState("tr");
    const [text, setText] = useState(() => state.messageTemplates.find((t) => t.key === "payment_overdue")?.tr ?? "");
    const [excluded, setExcluded] = useState(() => new Set());
    const [confirm, setConfirm] = useState(false);

    const templates = state.messageTemplates;
    const template = templates.find((t) => t.id === templateId);

    const pickTemplate = (id, language = lang) => {
        const t = templates.find((x) => x.id === id);
        setTemplateId(id);
        setText(t?.[language] ?? "");
    };

    /* Kitle: öğrenci başına tek satır (ilgili borç kalemiyle) */
    const people = useMemo(() => {
        const seen = new Set();
        const source = audience === "overdue" ? view.overdue : audience === "upcoming" ? view.upcoming : view.live;
        return source.filter((r) => !seen.has(r.enrollment.id) && seen.add(r.enrollment.id));
    }, [audience, view]);

    const recipients = useMemo(
        () =>
            people.map((r) => {
                const message = fillTemplate(text, messageVars(r, r.item));
                const phoneOk = /^5\d{9}$/.test(r.student.phone ?? "");
                const problem = !phoneOk ? "Telefon geçersiz" : hasUnfilled(message) ? "Değişken eksik" : !message.trim() ? "Mesaj boş" : null;
                return { r, message, problem, parts: smsInfo(message).parts };
            }),
        [people, text]
    );

    const selected = recipients.filter((x) => !x.problem && !excluded.has(x.r.enrollment.id));
    const totalParts = selected.reduce((a, x) => a + x.parts, 0);
    const toggle = (id) => setExcluded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const send = async () => {
        try {
            const out = await run(sendSms, { messages: selected.map((x) => ({ enrollmentId: x.r.enrollment.id, text: x.message, purpose: template?.key ?? "other" })) });
            toast.success(`${out.sent.length} kişiye SMS gönderime alındı (${totalParts} SMS).`);
            setConfirm(false);
        } catch (e) {
            toast.error(e.message);
        }
    };

    const first = selected[0] ?? recipients[0];
    const info = smsInfo(text);

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="space-y-5">
                <Card title="1 · Kime?">
                    <div className="mt-3">
                        <Chips items={AUDIENCES.map((a) => ({ ...a, count: undefined }))} value={audience} onChange={(v) => { setAudience(v); setExcluded(new Set()); }} />
                    </div>
                </Card>
                <Card title="2 · Mesaj" description="Değişkenler her alıcı için kendi bilgisiyle dolar.">
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {templates.map((t) => (
                            <button key={t.id} type="button" onClick={() => pickTemplate(t.id)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${templateId === t.id ? "border-ad-brand bg-ad-brand text-white" : "border-ad-line-strong text-ad-body hover:bg-ad-sunken"}`}>{t.name}</button>
                        ))}
                        <div className="ms-auto flex rounded-full bg-ad-sunken p-0.5 text-xs font-bold">
                            {["tr", "en"].map((l) => (
                                <button key={l} type="button" onClick={() => { setLang(l); if (templateId) pickTemplate(templateId, l); }} className={`rounded-full px-3 py-1 uppercase ${lang === l ? "bg-ad-surface text-ad-brand-dark shadow-ad-sm" : "text-ad-muted"}`}>{l}</button>
                            ))}
                        </div>
                    </div>
                    <div className="mt-3">
                        <Field label="Metin" hint={`${info.length} karakter · ${info.parts} SMS${info.unicode ? " (Türkçe karakter: kısa SMS)" : ""}`}>
                            <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} className="ad-field resize-y leading-relaxed" />
                        </Field>
                    </div>
                    {first && (
                        <div className="mt-4 rounded-2xl bg-ad-sunken p-4">
                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ad-muted">Örnek: {first.r.student.firstName}</p>
                            <p className="text-sm leading-relaxed">{first.message || "—"}</p>
                        </div>
                    )}
                </Card>
            </div>

            <Card title="3 · Alıcılar" description={`${selected.length} / ${recipients.length} kişi seçili · tahmini ${totalParts} SMS`}
                actions={<button type="button" disabled={selected.length === 0} onClick={() => setConfirm(true)} className="ad-btn ad-btn-primary"><Icon name="send" className="text-[17px]" />SMS gönder</button>}>
                {recipients.length === 0 ? (
                    <EmptyState icon="sms" title="Bu kitlede kimse yok" description="Başka bir kitle seçin." />
                ) : (
                    <div className="ad-scroll mt-3 max-h-[560px] overflow-auto rounded-xl border border-ad-line">
                        <table className="ad-table">
                            <thead><tr><th className="w-10" /><th>Öğrenci</th><th>Telefon</th><th className="!text-end">SMS</th></tr></thead>
                            <tbody>
                                {recipients.map(({ r, problem, parts }) => {
                                    const id = r.enrollment.id;
                                    const on = !problem && !excluded.has(id);
                                    return (
                                        <tr key={id} className={problem ? "opacity-60" : ""}>
                                            <td><input type="checkbox" checked={on} disabled={Boolean(problem)} onChange={() => toggle(id)} aria-label={`${r.student.firstName} ${r.student.lastName}`} className="h-4 w-4 accent-[var(--color-ad-brand)]" /></td>
                                            <td><div className="flex items-center gap-2.5"><Avatar name={`${r.student.firstName} ${r.student.lastName}`} /><div><div className="font-bold">{r.student.firstName} {r.student.lastName}</div><div className="text-[11px] text-ad-muted">{r.room?.label ?? "Yerleşmedi"}</div></div></div></td>
                                            <td className="ad-num whitespace-nowrap">{problem ? <span className="text-ad-warn">{problem}</span> : `+90 ${r.student.phone}`}</td>
                                            <td className="ad-num text-end">{problem ? "—" : parts}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <ConfirmDialog
                open={confirm}
                danger={false}
                title="SMS gönderilsin mi?"
                message={`${selected.length} kişiye, toplam yaklaşık ${totalParts} SMS gönderilecek. Gönderilen SMS geri alınamaz ve SMS kredinizden düşer.`}
                confirmLabel="Gönder"
                onConfirm={send}
                onCancel={() => setConfirm(false)}
            />
        </div>
    );
}
