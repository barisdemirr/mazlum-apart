"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import DataTable from "@/components/admin/DataTable";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import { Badge, Chips, PageHeader } from "@/components/admin/ui";
import { DateInput, Field, NumberInput, SelectInput, Switch, TextInput } from "@/components/admin/fields";
import { createDiscountCode, deleteDiscountCode, updateDiscountCode } from "@/lib/admin/commands/discountCodes";
import { date, money } from "@/lib/admin/labels";
import { onlyDigits } from "@/lib/application";
import { turkeyDate } from "@/lib/format";

const today = () => turkeyDate(new Date().toISOString());
const amountText = (c) => (c.kind === "percent" ? `%${c.value}` : `${money(c.value)} / ay`);

/** Kullanılabilir mi: aktif, süresi dolmamış, hakkı kalmış (backend DiscountCodeRules.IsUsable ile aynı) */
const state = (c) => {
    if (!c.isActive) return { key: "off", label: "Pasif", tone: "neutral" };
    if (c.validUntil && c.validUntil < today()) return { key: "expired", label: "Süresi doldu", tone: "warn" };
    if (c.maxUses != null && c.usedCount >= c.maxUses) return { key: "used", label: "Hakkı bitti", tone: "warn" };
    return { key: "active", label: "Aktif", tone: "ok" };
};

/**
 * İndirim kodları: kayıt yenileyen eski öğrencilere verilir. Öğrenci başvuru formunda kodu yazar, aylık kira indirimli görünür.
 * Kod herkese açık olabilir (sınırsız ya da kullanım hakkı sayılı) ya da belirli bir T.C.'ye özel tanımlanabilir.
 */
export default function DiscountCodesView({ items }) {
    const { exec } = useCommand();
    const [tab, setTab] = useState("active");
    const [creating, setCreating] = useState(false);
    const [edit, setEdit] = useState(null);
    const [removing, setRemoving] = useState(null);
    const [copied, setCopied] = useState("");

    const count = (key) => items.filter((c) => state(c).key === key).length;
    const rows = useMemo(() => items.filter((c) => (tab === "all" ? true : tab === "active" ? state(c).key === "active" : state(c).key !== "active")), [items, tab]);

    const copy = async (code, e) => {
        e?.stopPropagation();
        try {
            await navigator.clipboard.writeText(code);
            setCopied(code);
            setTimeout(() => setCopied(""), 1500);
        } catch {
            /* pano erişimi yoksa kod ekranda zaten görünür */
        }
    };

    const columns = [
        {
            key: "code",
            header: "Kod",
            sort: (c) => c.code,
            render: (c) => (
                <div className="flex items-center gap-2">
                    <code className="rounded-lg bg-ad-sunken px-2 py-1 text-sm font-bold tracking-wide">{c.code}</code>
                    <button type="button" onClick={(e) => copy(c.code, e)} title="Kodu kopyala" aria-label="Kodu kopyala" className="ad-btn ad-btn-icon ad-btn-soft !h-7 !w-7">
                        <Icon name={copied === c.code ? "check" : "content_copy"} className="text-[15px]" />
                    </button>
                </div>
            ),
            export: { value: (c) => c.code, width: 18 },
        },
        { key: "label", header: "Açıklama", render: (c) => <span className="block max-w-xs truncate">{c.label || "—"}</span>, export: { value: (c) => c.label, width: 28 } },
        { key: "amount", header: "İndirim", align: "end", sort: (c) => c.value, render: (c) => <span className="ad-num font-bold">{amountText(c)}</span>, export: { value: (c) => amountText(c) } },
        {
            key: "usage",
            header: "Kullanım",
            align: "end",
            sort: (c) => c.usedCount,
            render: (c) => (
                <span className="ad-num whitespace-nowrap">
                    {c.usedCount}
                    <span className="text-ad-muted"> / {c.maxUses ?? "∞"}</span>
                </span>
            ),
            export: { type: "number", value: (c) => c.usedCount },
        },
        { key: "maxUses", header: "Hak", hidden: true, export: { value: (c) => c.maxUses ?? "Sınırsız" } },
        {
            key: "until",
            header: "Son gün",
            sort: (c) => c.validUntil ?? "9999",
            render: (c) => (c.validUntil ? <span className="ad-num whitespace-nowrap">{date(c.validUntil)}</span> : <span className="text-xs text-ad-muted">Süresiz</span>),
            export: { value: (c) => c.validUntil ?? "Süresiz" },
        },
        {
            key: "scope",
            header: "Kapsam",
            render: (c) => (c.tc ? <Badge tone="accent" icon="lock">T.C.'ye özel</Badge> : <span className="text-xs text-ad-muted">Herkese açık</span>),
            export: { value: (c) => (c.tc ? "T.C.'ye özel" : "Herkese açık") },
        },
        { key: "tc", header: "T.C.", hidden: true, export: { value: (c) => c.tc ?? "" } },
        {
            key: "status",
            header: "Durum",
            render: (c) => <Badge tone={state(c).tone}>{state(c).label}</Badge>,
            export: { value: (c) => state(c).label },
        },
        {
            key: "act",
            header: "",
            align: "end",
            render: (c) => (
                <div className="flex justify-end gap-1">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setRemoving(c); }} title="Sil" aria-label="Sil" className="ad-btn ad-btn-icon ad-btn-soft !h-8 !w-8 text-ad-danger">
                        <Icon name="delete" className="text-[17px]" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="İndirim Kodları"
                description="Kayıt yenileyen eski öğrencilerimize verdiğiniz kodlar. Öğrenci başvuru formunda kodu yazınca aylık kira indirimli görünür; depozito değişmez. Kod belirli bir T.C.'ye özel de olabilir."
                actions={
                    <button type="button" onClick={() => setCreating(true)} className="ad-btn ad-btn-primary">
                        <Icon name="add" className="text-[20px]" />
                        Yeni kod
                    </button>
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Chips
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: "active", label: "Aktif", count: count("active") },
                        { value: "inactive", label: "Pasif / bitmiş", count: items.length - count("active") },
                        { value: "all", label: "Tümü", count: items.length },
                    ]}
                />
            </div>

            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(c) => c.id}
                searchText={(c) => `${c.code} ${c.label} ${c.tc ?? ""}`}
                searchPlaceholder="Kod ya da açıklama ara"
                onRowClick={(c) => setEdit(c)}
                exportName="indirim-kodlari"
                initialSort={{ key: "code", dir: "asc" }}
                empty={{
                    icon: "sell",
                    title: items.length ? "Bu görünümde kod yok" : "Henüz indirim kodu yok",
                    description: items.length ? "Sekmeyi değiştirin." : "“Yeni kod” ile eski öğrencileriniz için bir kod oluşturun.",
                }}
            />

            {creating && <CreateDialog onClose={() => setCreating(false)} />}

            {edit && <EditDialog code={edit} onClose={() => setEdit(null)} />}

            <ConfirmDialog
                open={Boolean(removing)}
                title="Kod silinsin mi?"
                message={removing ? `${removing.code} artık kullanılamaz. Bu kodla açılmış başvurular indirimli fiyatını korur.` : ""}
                confirmLabel="Sil"
                onCancel={() => setRemoving(null)}
                onConfirm={async () => {
                    const out = await exec(deleteDiscountCode, { id: removing.id }, "Kod silindi.");
                    if (out.ok) setRemoving(null);
                }}
            />
        </div>
    );
}

/** Rastgele okunaklı kod (0/O, 1/I yok): YENILE-7KQ4M — backend de boş bırakılınca aynısını üretir */
function randomCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    return `YENILE-${[...bytes].map((b) => alphabet[b % alphabet.length]).join("")}`;
}

function CreateDialog({ onClose }) {
    const { exec, busy } = useCommand();
    const [f, setF] = useState({ code: randomCode(), label: "", kind: "percent", value: "", validUntil: "", maxUses: "", tc: "" });
    const [errors, setErrors] = useState({});
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const percent = f.kind === "percent";

    const submit = async (e) => {
        e.preventDefault();
        const found = {};
        if (!(Number(f.value) > 0)) found.value = "İndirim değerini girin.";
        else if (percent && Number(f.value) > 90) found.value = "Yüzde en fazla 90 olabilir.";
        setErrors(found);
        if (Object.keys(found).length) return;
        const out = await exec(createDiscountCode, f, "İndirim kodu oluşturuldu.");
        if (out.ok) onClose();
    };

    return (
        <FormDialog open title="Yeni indirim kodu" description="Kayıt yenileyen eski öğrenciler için. Oluşturduktan sonra kodu öğrenciye iletin." onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Oluştur">
            <Field label="Kod" required hint="Harf, rakam ve tire. Boş bırakırsanız otomatik üretilir." className="sm:col-span-2">
                <div className="flex gap-2">
                    <TextInput value={f.code} onChange={(e) => setF((x) => ({ ...x, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20) }))} />
                    <button type="button" onClick={() => setF((x) => ({ ...x, code: randomCode() }))} className="ad-btn ad-btn-outline shrink-0">
                        <Icon name="autorenew" className="text-[18px]" />
                        Üret
                    </button>
                </div>
            </Field>
            <Field label="Açıklama" hint="Yalnızca panelde görünür. Örn. “2025-26 öğrencileri”." className="sm:col-span-2">
                <TextInput value={f.label} onChange={set("label")} maxLength={120} />
            </Field>
            <Field label="İndirim türü" required>
                <SelectInput value={f.kind} onChange={set("kind")}>
                    <option value="percent">Yüzde (aylık kiradan)</option>
                    <option value="fixed">Sabit tutar (aylık kiradan)</option>
                </SelectInput>
            </Field>
            <Field label={percent ? "Yüzde" : "Aylık indirim"} required error={errors.value} hint={percent ? "En fazla 90." : "Her ay kiradan düşülür."}>
                <NumberInput suffix={percent ? "%" : "₺"} min="0" step={percent ? "1" : "0.01"} value={f.value} error={errors.value} onChange={set("value")} />
            </Field>
            <Field label="Son kullanma günü" hint="Boşsa süresiz."><DateInput value={f.validUntil} onChange={set("validUntil")} /></Field>
            <Field label="Kullanım hakkı" hint="Boşsa sınırsız. Tek öğrenciye veriyorsanız 1."><NumberInput min="1" step="1" value={f.maxUses} onChange={set("maxUses")} /></Field>
            <Field label="T.C.'ye özel (isteğe bağlı)" hint="Doluysa yalnızca bu T.C. kullanabilir; başka birinin kodu kullanmasını engeller." className="sm:col-span-2">
                <TextInput inputMode="numeric" value={f.tc} onChange={(e) => setF((x) => ({ ...x, tc: onlyDigits(e.target.value, 11) }))} />
            </Field>
            <p className="rounded-xl bg-ad-sunken px-3 py-2 text-xs text-ad-body sm:col-span-2">İndirim aylık kiraya (12 aylık kayıtta yaz kirasına da) uygulanır; depozito indirimsizdir. Kod başvuru anında fiyata işlenir, sonradan kodu silmek ya da pasife almak mevcut başvuruları etkilemez.</p>
        </FormDialog>
    );
}

function EditDialog({ code, onClose }) {
    const { exec, busy } = useCommand();
    const [f, setF] = useState({ label: code.label, validUntil: code.validUntil ?? "", maxUses: code.maxUses ?? "", isActive: code.isActive, tc: code.tc ?? "" });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(updateDiscountCode, { id: code.id, ...f }, "Kod güncellendi.");
        if (out.ok) onClose();
    };
    return (
        <FormDialog open title={code.code} description={`${amountText(code)} · ${code.usedCount} kullanım · tür ve değer sonradan değişmez, gerekirse yeni kod açın.`} onClose={onClose} onSubmit={submit} busy={busy} saveLabel="Kaydet">
            <div className="sm:col-span-2"><Switch checked={f.isActive} onChange={(v) => setF((x) => ({ ...x, isActive: v }))} label="Aktif" hint="Kapalıysa kod kullanılamaz; mevcut başvurular etkilenmez." /></div>
            <Field label="Açıklama" hint="Yalnızca panelde görünür." className="sm:col-span-2"><TextInput value={f.label} onChange={set("label")} maxLength={120} /></Field>
            <Field label="Son kullanma günü" hint="Boşsa süresiz."><DateInput value={f.validUntil} onChange={set("validUntil")} /></Field>
            <Field label="Kullanım hakkı" hint={`Boşsa sınırsız. En az ${Math.max(1, code.usedCount)}.`}><NumberInput min={Math.max(1, code.usedCount)} step="1" value={f.maxUses} onChange={set("maxUses")} /></Field>
            <Field label="T.C.'ye özel" hint="Doluysa yalnızca bu T.C. kullanabilir. Herkese açık için boş bırakın." className="sm:col-span-2">
                <TextInput inputMode="numeric" value={f.tc} onChange={(e) => setF((x) => ({ ...x, tc: onlyDigits(e.target.value, 11) }))} />
            </Field>
        </FormDialog>
    );
}
