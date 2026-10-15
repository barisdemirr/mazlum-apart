"use client";

import { useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import DataTable from "@/components/admin/DataTable";
import FormDialog from "@/components/admin/FormDialog";
import { Badge } from "@/components/admin/ui";
import { SelectInput } from "@/components/admin/fields";
import { AUDIT_ACTION } from "@/lib/admin/labels";
import DateRange, { inRange } from "./DateRange";

const GROUPS = { payment: "Tahsilat / iade", charge: "Borç kalemleri", account: "Kasa & banka", transfer: "Kasa & banka", expense: "Gider", bill: "Fatura", application: "Başvuru", enrollment: "Kayıt", placement: "Yerleşim", maintenance: "Arıza", roomtype: "Yapı", apartment: "Yapı", room: "Yapı", period: "Dönem & fiyat", price: "Dönem & fiyat", settings: "Sistem", admin: "Sistem" };
const stamp = (iso) => new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Değiştirilemez işlem geçmişi: kim, ne zaman, ne yaptı; önce/sonra değerleriyle */
export default function AuditView() {
    const { state, period } = useAdmin();
    const [group, setGroup] = useState("");
    const [range, setRange] = useState({ from: "", to: "" });
    const [open, setOpen] = useState(null);

    const rows = useMemo(
        () => state.audit.filter((a) => (!a.periodId || a.periodId === period.id) && (!group || GROUPS[a.entity] === group) && inRange(a.at.slice(0, 10), range)),
        [state.audit, period.id, group, range]
    );

    const columns = [
        { key: "at", header: "Zaman", sort: (a) => a.at, render: (a) => <span className="ad-num whitespace-nowrap">{stamp(a.at)}</span>, export: { value: (a) => stamp(a.at), width: 18 } },
        { key: "by", header: "Kim", render: (a) => a.by, export: { value: (a) => a.by } },
        { key: "action", header: "İşlem", sort: (a) => a.action, render: (a) => <span className="font-semibold">{AUDIT_ACTION[a.action] ?? a.action}</span>, export: { value: (a) => AUDIT_ACTION[a.action] ?? a.action, width: 26 } },
        { key: "group", header: "Alan", render: (a) => <Badge tone="neutral">{GROUPS[a.entity] ?? a.entity}</Badge>, export: { value: (a) => GROUPS[a.entity] ?? a.entity } },
        { key: "note", header: "Not", render: (a) => <span className="block max-w-72 truncate text-xs text-ad-muted">{a.note}</span>, export: { value: (a) => a.note, width: 30 } },
    ];

    return (
        <div>
            <p className="mb-5 max-w-2xl text-sm text-ad-muted">Panelde yapılan önemli işlemlerin değiştirilemez kaydı. Bir satıra tıklayarak önce/sonra değerlerini görün.</p>
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(a) => a.id}
                searchText={(a) => `${a.by} ${AUDIT_ACTION[a.action] ?? a.action} ${a.note}`}
                searchPlaceholder="İşlem, kişi veya not ara"
                filters={<><div className="w-full sm:w-48"><SelectInput value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Tüm alanlar</option>{[...new Set(Object.values(GROUPS))].map((g) => <option key={g} value={g}>{g}</option>)}</SelectInput></div><DateRange {...range} onChange={setRange} /></>}
                onRowClick={setOpen}
                initialSort={{ key: "at", dir: "desc" }}
                exportName="islem-gecmisi"
                empty={{ icon: "history", title: "Kayıt yok", description: "Bu filtrelerle işlem bulunamadı." }}
            />
            {open && (
                <FormDialog open size="lg" title={AUDIT_ACTION[open.action] ?? open.action} description={`${stamp(open.at)} · ${open.by}`} onClose={() => setOpen(null)} hideFooter columns={1}>
                    {open.note && <p className="rounded-2xl bg-ad-sunken p-3 text-sm">{open.note}</p>}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {[["Önce", open.before], ["Sonra", open.after]].map(([label, value]) => (
                            <div key={label} className="min-w-0 rounded-2xl border border-ad-line p-3">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-ad-muted">{label}</p>
                                <pre className="ad-scroll mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs text-ad-body">{value ? JSON.stringify(value, null, 2) : "—"}</pre>
                            </div>
                        ))}
                    </div>
                </FormDialog>
            )}
        </div>
    );
}
