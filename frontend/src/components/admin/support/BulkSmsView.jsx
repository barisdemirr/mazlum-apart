"use client";

import { useMemo, useRef, useState } from "react";
import { Card, PageHeader } from "@/components/admin/ui";
import { Field, SelectInput, TextInput } from "@/components/admin/fields";
import useCommand from "@/components/admin/useCommand";
import { previewSms, sendSms } from "@/lib/admin/commands/support";
import { newIdempotencyKey } from "@/lib/api/bff";
import { adaptRow } from "@/lib/admin/adapters";
import { CONTACT_PURPOSE, money } from "@/lib/admin/labels";
import { smsInfo } from "@/lib/admin/messaging";

/** Toplu SMS: alıcıları seçin, metni yazın ({ad}, {tutar}, {vade}… sunucuda kişiye göre dolar), önizleyin, gönderin. */
export default function BulkSmsView({ enrollments, status }) {
    const { exec, busy } = useCommand();
    const rows = useMemo(() => enrollments.map(adaptRow).filter((r) => !["cancelled", "left"].includes(r.enrollment.status)), [enrollments]);
    const [picked, setPicked] = useState(() => new Set());
    const [q, setQ] = useState("");
    const [only, setOnly] = useState("all");
    const [purpose, setPurpose] = useState("announcement");
    const [text, setText] = useState("");
    const [preview, setPreview] = useState(null);
    const key = useRef(newIdempotencyKey());

    const shown = rows.filter((r) => (only === "all" || r.summary.remaining > 0) && `${r.student.firstName} ${r.student.lastName} ${r.student.phone}`.toLowerCase().includes(q.toLowerCase()));
    const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const input = () => ({ purpose, text, lang: "tr", recipients: [...picked].map((enrollmentId) => ({ enrollmentId })) });
    const info = smsInfo(text);

    const doPreview = async () => { const out = await exec(previewSms, input(), null, { refresh: false }); if (out.ok) setPreview(out.result); };
    const doSend = async () => {
        const out = await exec(sendSms, { ...input(), key: key.current }, (r) => `${r.sent.length} kişiye SMS gönderime alındı.`);
        if (out.ok) { key.current = newIdempotencyKey(); setPreview(null); setPicked(new Set()); setText(""); }
    };

    return (
        <div>
            <PageHeader title="Toplu SMS" description="Maliyetli işlem: önce önizleyin. Aynı numaraya iki kez gönderilmez, günlük boy sınırı vardır." />
            {!status.enabled && <p className="mb-4 rounded-2xl bg-ad-warn-soft p-4 text-sm text-ad-warn">SMS sağlayıcısı kapalı (Sms:Enabled). Gönderimler gerçek SMS olarak gitmez, simülasyon olarak kaydedilir.</p>}
            <div className="grid gap-5 lg:grid-cols-2">
                <Card title={`Alıcılar (${picked.size})`} actions={<div className="flex gap-2 text-xs font-bold"><button type="button" className="text-ad-brand" onClick={() => setPicked(new Set(shown.map((r) => r.enrollment.id)))}>Görünenleri seç</button><button type="button" className="text-ad-muted" onClick={() => setPicked(new Set())}>Temizle</button></div>}>
                    <div className="mt-3 flex gap-2"><TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad veya telefon ara" /><SelectInput value={only} onChange={(e) => setOnly(e.target.value)}><option value="all">Tümü</option><option value="debt">Borcu olanlar</option></SelectInput></div>
                    <ul className="ad-scroll mt-3 max-h-96 divide-y divide-ad-line overflow-y-auto">{shown.map((r) => (
                        <li key={r.enrollment.id}><label className="flex cursor-pointer items-center gap-3 py-2 text-sm"><input type="checkbox" checked={picked.has(r.enrollment.id)} onChange={() => toggle(r.enrollment.id)} /><span className="min-w-0 flex-1 truncate font-semibold">{r.student.firstName} {r.student.lastName}</span><span className="ad-num text-xs text-ad-muted">{r.summary.remaining > 0 ? money(r.summary.remaining) : ""}</span></label></li>
                    ))}</ul>
                </Card>
                <Card title="Mesaj">
                    <div className="mt-3 space-y-3">
                        <Field label="Amaç"><SelectInput value={purpose} onChange={(e) => setPurpose(e.target.value)}>{Object.entries(CONTACT_PURPOSE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</SelectInput></Field>
                        <Field label="Metin" hint="Değişkenler: {ad} {tutar} {vade} {kalem} {oda}"><TextInput as="textarea" rows={6} value={text} onChange={(e) => { setText(e.target.value); setPreview(null); }} /></Field>
                        <p className="text-xs text-ad-muted">{info.length} karakter · {info.parts} SMS (kişi başı){info.unicode && " · Türkçe karakter: kısa SMS"}</p>
                        {preview && (
                            <div className="rounded-2xl bg-ad-sunken p-4 text-sm"><b>{preview.messages.length} kişiye {preview.totalParts} SMS</b> · bugün {preview.usedToday}/{preview.dailyLimit}
                                {preview.messages[0] && <p className="mt-2 whitespace-pre-wrap text-xs text-ad-body">Örnek: {preview.messages[0].text}</p>}
                                {preview.skipped.length > 0 && <p className="mt-2 text-xs text-ad-warn">Atlanan {preview.skipped.length}: {preview.skipped.slice(0, 3).map((s) => `${s.name} (${s.reason})`).join(", ")}</p>}</div>
                        )}
                        <div className="flex gap-2">
                            <button type="button" disabled={busy || !picked.size || !text.trim()} onClick={doPreview} className="ad-btn ad-btn-outline">Önizle</button>
                            <button type="button" disabled={busy || !preview || preview.messages.length === 0} onClick={doSend} className="ad-btn ad-btn-primary">Gönder</button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
