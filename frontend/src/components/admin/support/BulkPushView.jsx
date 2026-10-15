"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import LocalizedField, { TranslateAllButton } from "@/components/admin/LocalizedField";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import { useToast } from "@/components/admin/Toast";
import { Avatar, Card, Chips, EmptyState } from "@/components/admin/ui";
import { Field, SelectInput } from "@/components/admin/fields";
import { sendPush } from "@/lib/admin/domain/support";
import { fillTemplate, messageVars } from "@/lib/admin/messaging";

const AUDIENCES = [
    { value: "all", label: "Tüm öğrenciler" },
    { value: "overdue", label: "Gecikmiş ödemesi olanlar" },
    { value: "upcoming", label: "Vadesi yaklaşanlar (7 gün)" },
];

const LINKS = [
    { value: "/ogrenci", label: "Özet" },
    { value: "/ogrenci/odemeler", label: "Ödemeler" },
    { value: "/ogrenci/ariza", label: "Arıza talepleri" },
    { value: "/ogrenci/bilgilerim", label: "Bilgilerim" },
];

const TITLE_MAX = 65;
const BODY_MAX = 240;

const PURPOSE_FOR = { overdue: "payment_overdue", upcoming: "payment_reminder", all: "announcement" };

/**
 * Toplu bildirim: öğrenci uygulamasını yükleyip bildirimi açmış öğrencilerin telefonuna anlık bildirim.
 * Metin TR + EN yazılır; her öğrenciye kendi dilinde gider. {ad} {tutar} {vade} gibi değişkenler kişiye göre dolar.
 * Bildirimi kapalı öğrencilere ulaşılamaz: bu kişiler ayrı gösterilir, SMS önerilir.
 * Gönderim şimdilik MOCK (iletişim geçmişine "Bildirim" olarak yazılır); gerçek gönderimi backend yapar.
 */
export default function BulkPushView() {
    const { state, view, run } = useAdmin();
    const toast = useToast();
    const [audience, setAudience] = useState("all");
    const [title, setTitle] = useState({ tr: "Mazlum Apart", en: "Mazlum Apart" });
    const [body, setBody] = useState({ tr: "", en: "" });
    const [url, setUrl] = useState("/ogrenci");
    const [previewLang, setPreviewLang] = useState("tr");
    const [excluded, setExcluded] = useState(() => new Set());
    const [confirm, setConfirm] = useState(false);

    const templates = state.messageTemplates;

    const pickTemplate = (t) => {
        setBody({ tr: t.tr, en: t.en ?? "" });
        if (t.key === "payment_overdue" || t.key === "payment_reminder") setUrl("/ogrenci/odemeler");
        else if (t.key === "maintenance_update") setUrl("/ogrenci/ariza");
        else setUrl("/ogrenci");
    };

    const people = useMemo(() => {
        const seen = new Set();
        const source = audience === "overdue" ? view.overdue : audience === "upcoming" ? view.upcoming : view.live;
        return source.filter((r) => !seen.has(r.enrollment.id) && seen.add(r.enrollment.id));
    }, [audience, view]);

    const recipients = useMemo(
        () =>
            people.map((r) => {
                const vars = messageVars(r, r.item);
                const out = { title: { tr: fillTemplate(title.tr, vars), en: fillTemplate(title.en || title.tr, vars) }, body: { tr: fillTemplate(body.tr, vars), en: fillTemplate(body.en || body.tr, vars) } };
                const unfilled = /\{\w+\}/.test(out.title.tr + out.body.tr + out.title.en + out.body.en);
                const problem = !r.student.pushEnabled ? "off" : !body.tr.trim() || !title.tr.trim() ? "empty" : unfilled ? "vars" : null;
                return { r, out, problem };
            }),
        [people, title, body]
    );

    const reachable = recipients.filter((x) => x.r.student.pushEnabled);
    const offCount = recipients.length - reachable.length;
    const selected = recipients.filter((x) => !x.problem && !excluded.has(x.r.enrollment.id));
    const toggle = (id) => setExcluded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const first = selected[0] ?? recipients.find((x) => !x.problem) ?? recipients[0];
    const shown = first?.out ?? { title, body };
    const invalidLength = title.tr.length > TITLE_MAX || title.en.length > TITLE_MAX || body.tr.length > BODY_MAX || body.en.length > BODY_MAX;

    const send = async () => {
        try {
            const out = await run(sendPush, { messages: selected.map((x) => ({ enrollmentId: x.r.enrollment.id, title: x.out.title, body: x.out.body })), url, purpose: PURPOSE_FOR[audience] });
            toast.success(`${out.sent.length} kişiye bildirim gönderime alındı.`);
            setConfirm(false);
        } catch (e) {
            toast.error(e.message);
        }
    };

    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
            <div className="space-y-5">
                <Card title="1 · Kime?">
                    <div className="mt-3"><Chips items={AUDIENCES} value={audience} onChange={(v) => { setAudience(v); setExcluded(new Set()); }} /></div>
                </Card>

                <Card title="2 · Bildirim" description="Başlık ve mesajı Türkçe yazın; İngilizcesi için “Eksikleri çevir”i kullanın. Öğrenciye kendi dilinde gider.">
                    <div className="mt-3 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-ad-muted">Hazır mesajdan başla:</span>
                            {templates.map((t) => (
                                <button key={t.id} type="button" onClick={() => pickTemplate(t)} className="rounded-full border border-ad-line-strong px-3 py-1.5 text-xs font-bold text-ad-body transition-colors hover:bg-ad-sunken">{t.name}</button>
                            ))}
                        </div>
                        <LocalizedField label="Başlık" name="title" required maxLength={TITLE_MAX} value={title} onChange={setTitle} />
                        <LocalizedField label="Mesaj" name="body" required multiline rows={4} maxLength={BODY_MAX} value={body} onChange={setBody} hint="{ad}, {tutar}, {vade} gibi değişkenler her öğrenci için kendi bilgisiyle dolar." />
                        <Field label="Dokununca açılacak sayfa">
                            <SelectInput value={url} onChange={(e) => setUrl(e.target.value)}>{LINKS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</SelectInput>
                        </Field>
                        <div className="flex justify-end"><TranslateAllButton fields={[{ name: "title", label: "Başlık", value: title, set: setTitle }, { name: "body", label: "Mesaj", value: body, set: setBody }]} /></div>
                    </div>
                </Card>

                <Card title="Önizleme" description="Telefonda böyle görünür.">
                    <div className="mt-3 flex items-center gap-2">
                        <div className="flex rounded-full bg-ad-sunken p-0.5 text-xs font-bold">
                            {["tr", "en"].map((l) => <button key={l} type="button" onClick={() => setPreviewLang(l)} className={`rounded-full px-3 py-1 uppercase ${previewLang === l ? "bg-ad-surface text-ad-brand-dark shadow-ad-sm" : "text-ad-muted"}`}>{l}</button>)}
                        </div>
                        {first && <span className="text-xs text-ad-muted">Örnek: {first.r.student.firstName}</span>}
                    </div>
                    <div className="mt-3 flex items-start gap-3 rounded-2xl bg-ad-ink/90 p-3.5 text-white shadow-ad" aria-label="Bildirim önizlemesi">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 font-display text-lg font-bold italic">M</span>
                        <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/60">Mazlum Apart · şimdi</p>
                            <p className="truncate text-sm font-bold">{shown.title[previewLang] || shown.title.tr || "Başlık"}</p>
                            <p className="line-clamp-3 text-sm text-white/85">{shown.body[previewLang] || shown.body.tr || "Mesajınız burada görünür."}</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card title="3 · Alıcılar" description={`${selected.length} kişi seçili · ${reachable.length} / ${recipients.length} kişinin bildirimi açık`}
                actions={<button type="button" disabled={selected.length === 0 || invalidLength} onClick={() => setConfirm(true)} className="ad-btn ad-btn-primary"><Icon name="notifications_active" className="text-[17px]" />Bildirim gönder</button>}>
                {invalidLength && <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ad-danger"><Icon name="error" className="text-[15px]" />Başlık en fazla {TITLE_MAX}, mesaj en fazla {BODY_MAX} karakter olabilir.</p>}
                {offCount > 0 && (
                    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-ad-warn-soft px-3 py-2 text-xs text-ad-warn">
                        <Icon name="notifications_off" className="text-[16px]" />
                        <span><b>{offCount} kişinin bildirimi kapalı</b>, bildirim ulaşmaz.</span>
                        <Link href="/admin/iletisim/toplu-sms" className="font-bold underline underline-offset-2 hover:no-underline">SMS ile ulaş</Link>
                    </p>
                )}
                {recipients.length === 0 ? (
                    <EmptyState icon="notifications" title="Bu kitlede kimse yok" description="Başka bir kitle seçin." />
                ) : (
                    <div className="ad-scroll mt-3 max-h-[640px] overflow-auto rounded-xl border border-ad-line">
                        <table className="ad-table">
                            <thead><tr><th className="w-10" /><th>Öğrenci</th><th className="!text-end">Bildirim</th></tr></thead>
                            <tbody>
                                {recipients.map(({ r, problem }) => {
                                    const id = r.enrollment.id;
                                    const on = !problem && !excluded.has(id);
                                    return (
                                        <tr key={id} className={problem === "off" ? "opacity-60" : ""}>
                                            <td><input type="checkbox" checked={on} disabled={Boolean(problem)} onChange={() => toggle(id)} aria-label={`${r.student.firstName} ${r.student.lastName}`} className="h-4 w-4 accent-[var(--color-ad-brand)]" /></td>
                                            <td><div className="flex items-center gap-2.5"><Avatar name={`${r.student.firstName} ${r.student.lastName}`} /><div><div className="font-bold">{r.student.firstName} {r.student.lastName}</div><div className="text-[11px] text-ad-muted">{r.room?.label ?? "Yerleşmedi"}</div></div></div></td>
                                            <td className="text-end whitespace-nowrap">
                                                {problem === "off" ? <span className="text-ad-muted">Kapalı</span> : problem === "vars" ? <span className="text-ad-warn">Değişken eksik</span> : problem === "empty" ? <span className="text-ad-warn">Mesaj boş</span> : <span className="inline-flex items-center gap-1 font-semibold text-ad-ok"><Icon name="notifications_active" className="text-[15px]" />Açık</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <ConfirmDialog open={confirm} danger={false} title="Bildirim gönderilsin mi?" message={`${selected.length} kişiye anlık bildirim gönderilecek. Gönderilen bildirim geri alınamaz.`} confirmLabel="Gönder" onConfirm={send} onCancel={() => setConfirm(false)} />
        </div>
    );
}
