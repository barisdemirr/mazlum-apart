"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import FormDialog from "@/components/admin/FormDialog";
import { getReceipt } from "@/lib/admin/commands/finance";
import { monthLabel } from "@/lib/admin/month";
import { CHARGE_KIND, METHOD, date, money } from "@/lib/admin/labels";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Satır açıklaması: "Kira · Ekim 2026", "Depozito" gibi; hangi aya ait olduğu açıkça yazılır */
const lineLabel = (l) => (["rent", "extra_stay", "summer"].includes(l.kind) && l.month ? `${CHARGE_KIND[l.kind]} · ${monthLabel(l.month)}` : CHARGE_KIND[l.kind] ?? l.kind);

/** Yazdırılabilir makbuz sayfası (A4, tek başına çalışan HTML; ekranda önizleme ve yazdırma aynı çıktıyı kullanır) */
export function receiptHtml(r) {
    const rows = [
        ...r.lines.map((l) => `<tr><td>${esc(lineLabel(l))}</td><td class="n">${esc(money(l.amount))}</td></tr>`),
        ...(r.advance > 0 ? [`<tr><td>Avans (ileriki borçlara sayılacak)</td><td class="n">${esc(money(r.advance))}</td></tr>`] : []),
    ].join("");
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Makbuz ${esc(r.no)}</title><style>
*{box-sizing:border-box}body{font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1b1f;margin:0;padding:32px}
.sheet{max-width:640px;margin:0 auto;border:1.5px solid #1c1b1f;border-radius:6px;padding:28px;position:relative}
h1{font-size:20px;margin:0}.muted{color:#6b6870;font-size:12px}.top{display:flex;justify-content:space-between;gap:16px;border-bottom:1.5px solid #1c1b1f;padding-bottom:14px;margin-bottom:16px}
.top .r{text-align:right}.grid{display:grid;grid-template-columns:130px 1fr;gap:6px 12px;margin-bottom:18px}.grid b{color:#6b6870;font-weight:600}
table{width:100%;border-collapse:collapse;margin-bottom:6px}th{text-align:left;font-size:12px;color:#6b6870;border-bottom:1px solid #1c1b1f;padding:6px 0}
td{padding:7px 0;border-bottom:1px solid #ddd}.n{text-align:right;font-variant-numeric:tabular-nums}th.n{text-align:right}
.total td{border-bottom:0;border-top:1.5px solid #1c1b1f;font-weight:700;font-size:16px;padding-top:10px}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:48px;text-align:center;font-size:12px;color:#6b6870}.sign div{border-top:1px solid #1c1b1f;padding-top:6px}
.void{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:84px;font-weight:800;color:rgba(190,30,30,.18);transform:rotate(-18deg);pointer-events:none}
@page{size:A4;margin:14mm}@media print{body{padding:0}}
</style></head><body><div class="sheet">${r.cancelled ? '<div class="void">İPTAL</div>' : ""}
<div class="top"><div><h1>Mazlum Apart</h1><div class="muted">Tahsilat Makbuzu</div></div><div class="r"><b>${esc(r.no)}</b><div class="muted">${esc(date(r.date))}</div></div></div>
<div class="grid"><b>Öğrenci</b><span>${esc(r.studentName)}</span>${r.room ? `<b>Oda</b><span>${esc(r.room)}</span>` : ""}<b>Dönem</b><span>${esc(r.periodName)}</span><b>Ödeme tarihi</b><span>${esc(date(r.date))}</span><b>Ödeme şekli</b><span>${esc(METHOD[r.method] ?? r.method)}${r.accountName ? ` · ${esc(r.accountName)}` : ""}</span>${r.note ? `<b>Not</b><span>${esc(r.note)}</span>` : ""}</div>
<table><thead><tr><th>Ödenen kalem</th><th class="n">Tutar</th></tr></thead><tbody>${rows}<tr class="total"><td>Toplam tahsilat</td><td class="n">${esc(money(r.amount))}</td></tr></tbody></table>
${r.cancelled ? '<p class="muted">Bu tahsilat iptal edilmiştir; makbuz geçersizdir.</p>' : ""}
<div class="sign"><div>Teslim alan${r.receivedBy ? ` · ${esc(r.receivedBy)}` : ""}</div><div>Teslim eden</div></div></div></body></html>`;
}

/** Makbuz penceresi: önizleme + Yazdır. Tahsilat kaydından hemen sonra ve tahsilat listelerinden açılır. */
export default function ReceiptDialog({ paymentId, onClose }) {
    const [receipt, setReceipt] = useState(null);
    const [error, setError] = useState(null);
    const frame = useRef(null);

    useEffect(() => {
        let alive = true;
        getReceipt({ paymentId }).then((r) => alive && setReceipt(r)).catch((e) => alive && setError(e?.detail || e?.message || "Makbuz yüklenemedi."));
        return () => { alive = false; };
    }, [paymentId]);

    const html = useMemo(() => (receipt ? receiptHtml(receipt) : ""), [receipt]);
    const print = () => { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); };

    return (
        <FormDialog open size="lg" columns={1} title="Tahsilat makbuzu" description={receipt?.no} onClose={onClose}
            footer={<button type="button" onClick={print} disabled={!receipt} className="ad-btn ad-btn-primary"><Icon name="print" className="text-[20px]" />Yazdır</button>}>
            {error ? <p className="text-sm text-ad-danger">{error}</p> : !receipt ? <p className="text-sm text-ad-muted">Makbuz hazırlanıyor…</p> : (
                <iframe ref={frame} title="Makbuz" srcDoc={html} sandbox="allow-same-origin allow-modals" className="h-[28rem] w-full rounded-xl border border-ad-line bg-white" />
            )}
        </FormDialog>
    );
}
