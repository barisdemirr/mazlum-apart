"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { DateInput, Field, NumberInput, SelectInput, Switch, TextInput } from "@/components/admin/fields";
import { closePeriod, createPeriod, savePrice, updatePeriod } from "@/lib/admin/commands/periods";
import { date, money } from "@/lib/admin/labels";

const TYPE = { academic: "Akademik", summer: "Yaz" };

export default function PeriodsView({ overview, roomTypes }) {
    const { period, periods, selectPeriod } = useAdmin();
    const { exec } = useCommand();
    const [dialog, setDialog] = useState(null); // "new" | {edit} | {price}
    const [closing, setClosing] = useState(null);
    const closed = period.status === "closed";

    const sorted = [...periods].sort((a, b) => b.start.localeCompare(a.start));
    const counts = (id) => {
        const item = overview.find((o) => o.period.id === id);
        return { enrollments: item?.enrollments ?? 0, apps: item?.pendingApplications ?? 0 };
    };

    const confirmClose = async () => {
        const out = await exec(closePeriod, { id: closing.id }, "Dönem kapatıldı.");
        if (out.ok) setClosing(null);
    };

    return (
        <div>
            <PageHeader
                title="Dönemler & Fiyatlar"
                description="Her dönemin muhasebesi ayrıdır; yeni dönem sıfırdan başlar. Fiyatlar yalnızca o dönemdeki YENİ başvuruları etkiler, mevcut kayıtlar kayıt anındaki fiyatı korur."
                actions={<button type="button" onClick={() => setDialog("new")} className="ad-btn ad-btn-primary"><Icon name="rocket_launch" className="text-[20px]" />Yeni dönem başlat</button>}
            />

            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sorted.map((p) => {
                    const c = counts(p.id);
                    const selected = p.id === period.id;
                    return (
                        <Card key={p.id} className={selected ? "ring-2 ring-ad-brand" : ""}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0"><h2 className="ad-display truncate text-lg font-semibold">{p.name}</h2><p className="text-xs text-ad-muted">{TYPE[p.type]} · {date(p.start)} – {date(p.end)}</p></div>
                                <Badge tone={p.status === "active" ? "ok" : "neutral"}>{p.status === "active" ? "Aktif" : "Kapalı"}</Badge>
                            </div>
                            <p className="mt-3 text-xs text-ad-body">{c.enrollments} kayıt{c.apps ? ` · ${c.apps} bekleyen başvuru` : ""}{p.status === "active" ? (p.applicationsOpen ? " · başvuruya açık" : " · başvuruya kapalı") : ""}{p.halfTerm?.enabled ? " · yarım dönem açık" : ""}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {!selected && <button type="button" onClick={() => selectPeriod(p.id)} className="ad-btn ad-btn-soft ad-btn-sm">Bu dönemi seç</button>}
                                {selected && <Badge tone="brand">Seçili dönem</Badge>}
                                {p.status === "active" && <button type="button" onClick={() => setDialog({ edit: p })} className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="edit" className="text-[16px]" />Düzenle</button>}
                                {p.status === "active" && <button type="button" onClick={() => setClosing(p)} className="ad-btn ad-btn-danger-soft ad-btn-sm">Dönemi kapat</button>}
                            </div>
                        </Card>
                    );
                })}
            </div>

            <Card title={`Fiyatlar · ${period.name}`} description={closed ? "Kapalı dönemin fiyatları değiştirilemez." : "Aylık kira ve depozito. Depozito 1 aylık kiradır ve dönemin son ayının (haziran) kirası yerine sayılır; son ay için ayrıca kira istenmez."}>
                <div className="ad-scroll mt-4 overflow-x-auto">
                    <table className="ad-table">
                        <thead><tr><th>Oda tipi</th><th className="!text-end">Aylık kira</th><th className="!text-end">Depozito</th><th /></tr></thead>
                        <tbody>
                            {roomTypes.map((rt) => {
                                const price = rt.monthly != null ? { monthly: rt.monthly, deposit: rt.deposit } : null;
                                return (
                                    <tr key={rt.id}>
                                        <td className="font-bold">{rt.name.tr}</td>
                                        <td className="ad-num text-end">{price ? money(price.monthly) : <Badge tone="warn">Fiyat girilmedi</Badge>}</td>
                                        <td className="ad-num text-end">{price ? money(price.deposit) : "—"}</td>
                                        <td className="text-end">{!closed && <button type="button" onClick={() => setDialog({ price: rt, row: price })} className="text-xs font-bold text-ad-brand hover:underline">{price ? "Düzenle" : "Fiyat gir"}</button>}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {dialog === "new" && <NewPeriodDialog onClose={() => setDialog(null)} />}
            {dialog?.edit && <EditPeriodDialog period={dialog.edit} onClose={() => setDialog(null)} />}
            {dialog?.price && <PriceDialog roomType={dialog.price} row={dialog.row} onClose={() => setDialog(null)} />}
            <ConfirmDialog open={!!closing} title="Dönem kapatılsın mı?" message={closing ? `${closing.name} kapatılınca yeni başvuru, kayıt ve yerleşim alınamaz; yalnızca açık borçların tahsilatı, açık faturaların ödenmesi ve düzeltme kayıtları yapılabilir. Geri alınamaz.` : ""} confirmLabel="Dönemi kapat" onConfirm={confirmClose} onCancel={() => setClosing(null)} />
        </div>
    );
}

function NewPeriodDialog({ onClose }) {
    const { period, periods, selectPeriod } = useAdmin();
    const { exec, busy } = useCommand();
    const latest = [...periods].filter((p) => p.type === "academic").sort((a, b) => b.start.localeCompare(a.start))[0];
    const nextYear = latest ? Number(latest.start.slice(0, 4)) + 1 : new Date().getFullYear();
    const [f, setF] = useState({ type: "academic", name: `${nextYear}–${nextYear + 1} Akademik`, start: `${nextYear}-09-01`, end: `${nextYear + 1}-06-30`, copyFromPeriodId: period?.id ?? "" });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const active = periods.filter((p) => p.status === "active");

    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(createPeriod, f, "Yeni dönem başlatıldı.", { refresh: false });
        if (out.ok) {
            selectPeriod(out.result.id); // çerezi yazar ve sayfayı yeni dönemle yeniler
            onClose();
        }
    };
    return (
        <FormDialog open title="Yeni dönem başlat" description="Yeni dönem sıfırdan başlar: kayıt, borç ve hesap hareketi kopyalanmaz." onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Dönemi başlat">
            <Field label="Tip" required><SelectInput value={f.type} onChange={set("type")}><option value="academic">Akademik dönem</option><option value="summer">Yaz dönemi</option></SelectInput></Field>
            <Field label="Dönem adı" required><TextInput value={f.name} onChange={set("name")} /></Field>
            <Field label="Başlangıç" required><DateInput value={f.start} onChange={set("start")} /></Field>
            <Field label="Bitiş" required><DateInput value={f.end} onChange={set("end")} /></Field>
            <Field label="Fiyatlar" hint="Seçilen dönemin oda tipi fiyatları kopyalanır; sonra düzenlenir." className="sm:col-span-2">
                <SelectInput value={f.copyFromPeriodId} onChange={set("copyFromPeriodId")}><option value="">Fiyatları kopyalama (boş başla)</option>{periods.map((p) => <option key={p.id} value={p.id}>{p.name} fiyatlarını kopyala</option>)}</SelectInput>
            </Field>
            {active.length > 0 && <p className="rounded-xl bg-ad-warn-soft px-3 py-2 text-xs text-ad-warn sm:col-span-2">Şu an aktif olan <b>{active.map((p) => p.name).join(", ")}</b> kapanacak. Kapanan dönemin açık borçları ve faturaları ana panelde “Önceki dönemlerden açık kalanlar” olarak görünmeye devam eder.</p>}
        </FormDialog>
    );
}

function EditPeriodDialog({ period, onClose }) {
    const { exec, busy } = useCommand();
    const [f, setF] = useState({ name: period.name, start: period.start, end: period.end, applicationsOpen: period.applicationsOpen, half: { ...period.halfTerm } });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const half = (k) => (e) => setF((x) => ({ ...x, half: { ...x.half, [k]: e.target.value } }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(updatePeriod, { id: period.id, name: f.name, start: f.start, end: f.end, applicationsOpen: f.applicationsOpen, halfTerm: f.half }, "Dönem güncellendi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title="Dönemi düzenle" description={period.name} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet">
            <Field label="Dönem adı" required className="sm:col-span-2"><TextInput value={f.name} onChange={set("name")} /></Field>
            <Field label="Başlangıç" required><DateInput value={f.start} onChange={set("start")} /></Field>
            <Field label="Bitiş" required><DateInput value={f.end} onChange={set("end")} /></Field>
            <div className="sm:col-span-2"><Switch checked={f.applicationsOpen} onChange={(v) => setF((x) => ({ ...x, applicationsOpen: v }))} label="Yeni başvuruya açık" hint="Kapalıysa sitedeki başvuru formu bu dönem için başvuru almaz." /></div>
            <div className="sm:col-span-2"><Switch checked={!!f.half.enabled} onChange={(v) => setF((x) => ({ ...x, half: { ...x.half, enabled: v } }))} label="Yarım dönem kaydı" hint="Varsayılan kapalı. Tarihler müşteriden gelince açılır." /></div>
            {f.half.enabled && (<><Field label="1. yarı bitişi" required><DateInput value={f.half.firstEnd ?? ""} onChange={half("firstEnd")} /></Field><Field label="2. yarı başlangıcı" required><DateInput value={f.half.secondStart ?? ""} onChange={half("secondStart")} /></Field></>)}
        </FormDialog>
    );
}

function PriceDialog({ roomType, row, onClose }) {
    const { period } = useAdmin();
    const { exec, busy } = useCommand();
    const [f, setF] = useState({ monthly: row?.monthly ?? "", deposit: row?.deposit ?? "" });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(savePrice, { periodId: period.id, roomTypeId: roomType.id, ...f }, "Fiyat kaydedildi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title={`${roomType.name.tr} fiyatı`} description={period.name} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet" columns={1}>
            <Field label="Aylık kira" required><NumberInput suffix="₺" min="0" step="0.01" value={f.monthly} onChange={set("monthly")} autoFocus /></Field>
            <Field label="Depozito" required hint="Kayıtta bir kez alınır. 1 aylık kiradır ve son ay kirası yerine sayılır."><NumberInput suffix="₺" min="0" step="0.01" value={f.deposit} onChange={set("deposit")} /></Field>
            <p className="rounded-xl bg-ad-warn-soft px-3 py-2 text-xs text-ad-warn">Bu değişiklik yalnızca bundan sonraki başvuruları etkiler. Mevcut kayıtların ödeme planı değişmez. İşlem geçmişine yazılır.</p>
        </FormDialog>
    );
}
