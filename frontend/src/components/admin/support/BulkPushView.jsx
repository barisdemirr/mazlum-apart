"use client";

import { useMemo, useRef, useState } from "react";
import { Card, PageHeader } from "@/components/admin/ui";
import { Field, TextInput } from "@/components/admin/fields";
import useCommand from "@/components/admin/useCommand";
import { previewPush, sendPush } from "@/lib/admin/commands/support";
import { newIdempotencyKey } from "@/lib/api/bff";
import { adaptRow } from "@/lib/admin/adapters";

/** Toplu uygulama bildirimi: yalnızca bildirimi açmış cihazlara gider (önizlemede kaç cihaz olduğu görünür). */
export default function BulkPushView({ enrollments }) {
    const { exec, busy } = useCommand();
    const rows = useMemo(() => enrollments.map(adaptRow).filter((r) => !["cancelled", "left"].includes(r.enrollment.status)), [enrollments]);
    const [picked, setPicked] = useState(() => new Set());
    const [f, setF] = useState({ titleTr: "", titleEn: "", bodyTr: "", bodyEn: "" });
    const [preview, setPreview] = useState(null);
    const key = useRef(newIdempotencyKey());
    const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setPreview(null); };
    const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const input = () => ({ purpose: "announcement", title: { tr: f.titleTr, en: f.titleEn }, body: { tr: f.bodyTr, en: f.bodyEn }, recipients: [...picked].map((enrollmentId) => ({ enrollmentId })) });

    const doPreview = async () => { const out = await exec(previewPush, input(), null, { refresh: false }); if (out.ok) setPreview(out.result); };
    const doSend = async () => {
        const out = await exec(sendPush, { ...input(), key: key.current }, (r) => `${r.delivered} cihaza bildirim gönderildi.`);
        if (out.ok) { key.current = newIdempotencyKey(); setPreview(null); setPicked(new Set()); }
    };

    return (
        <div>
            <PageHeader title="Toplu Bildirim" description="Ücretsiz. Öğrenci uygulamayı yükleyip bildirime izin vermişse telefonuna düşer." />
            <div className="grid gap-5 lg:grid-cols-2">
                <Card title={`Alıcılar (${picked.size})`} actions={<div className="flex gap-2 text-xs font-bold"><button type="button" className="text-ad-brand" onClick={() => setPicked(new Set(rows.map((r) => r.enrollment.id)))}>Hepsini seç</button><button type="button" className="text-ad-muted" onClick={() => setPicked(new Set())}>Temizle</button></div>}>
                    <ul className="ad-scroll mt-3 max-h-96 divide-y divide-ad-line overflow-y-auto">{rows.map((r) => (
                        <li key={r.enrollment.id}><label className="flex cursor-pointer items-center gap-3 py-2 text-sm"><input type="checkbox" checked={picked.has(r.enrollment.id)} onChange={() => toggle(r.enrollment.id)} /><span className="truncate font-semibold">{r.student.firstName} {r.student.lastName}</span></label></li>
                    ))}</ul>
                </Card>
                <Card title="Bildirim"><div className="mt-3 space-y-3">
                    <Field label="Başlık (TR)" required><TextInput value={f.titleTr} onChange={set("titleTr")} /></Field>
                    <Field label="Başlık (EN)"><TextInput value={f.titleEn} onChange={set("titleEn")} /></Field>
                    <Field label="Metin (TR)" required hint="Değişkenler: {ad} {tutar} {vade}"><TextInput as="textarea" rows={3} value={f.bodyTr} onChange={set("bodyTr")} /></Field>
                    <Field label="Metin (EN)"><TextInput as="textarea" rows={3} value={f.bodyEn} onChange={set("bodyEn")} /></Field>
                    {preview && <div className="rounded-2xl bg-ad-sunken p-4 text-sm"><b>{preview.messages.length} kişi, {preview.messages.reduce((s, m) => s + m.devices, 0)} cihaz</b>{preview.skipped.length > 0 && <p className="mt-1 text-xs text-ad-warn">Atlanan {preview.skipped.length}: {preview.skipped.slice(0, 3).map((s) => `${s.name} (${s.reason})`).join(", ")}</p>}</div>}
                    <div className="flex gap-2">
                        <button type="button" disabled={busy || !picked.size || !f.titleTr.trim() || !f.bodyTr.trim()} onClick={doPreview} className="ad-btn ad-btn-outline">Önizle</button>
                        <button type="button" disabled={busy || !preview || preview.messages.length === 0} onClick={doSend} className="ad-btn ad-btn-primary">Gönder</button>
                    </div>
                </div></Card>
            </div>
        </div>
    );
}
