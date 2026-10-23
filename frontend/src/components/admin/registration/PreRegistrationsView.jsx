"use client";

import { useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import ActionDialog from "@/components/admin/ActionDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import DataTable from "@/components/admin/DataTable";
import FormDialog from "@/components/admin/FormDialog";
import useCommand from "@/components/admin/useCommand";
import { Badge, Card, Chips, PageHeader, StatusBadge } from "@/components/admin/ui";
import { DateInput, Field, SelectInput, Switch, TextInput } from "@/components/admin/fields";
import { deletePreRegistration, savePreRegistrationSettings, updatePreRegistration } from "@/lib/admin/commands/preRegistrations";
import { previewSms, sendSms } from "@/lib/admin/commands/support";
import { newIdempotencyKey } from "@/lib/api/bff";
import { fillTemplate, smsInfo, whatsappLink } from "@/lib/admin/messaging";
import { PRE_REGISTRATION_STATUS, date } from "@/lib/admin/labels";
import { turkeyDate } from "@/lib/format";

const phoneText = (p) => (p?.length === 10 ? `0${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6, 8)} ${p.slice(8)}` : p ?? "");
const firstName = (name) => String(name ?? "").trim().split(/\s+/)[0] ?? "";
const roomName = (r) => r.roomTypeName?.tr || "";

/** "2027-05-15" -> "15 Mayıs 2027" */
const longDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(y, m - 1, d));
};

const WHATSAPP_TEXT = "Merhaba {ad}, Mazlum Apart'tan yazıyoruz. Yeni dönem fiyatlarımız açıklandı. {oda} için bilgi vermek isteriz.";

/**
 * Ön başvurular: dolu oda sayfasında "fiyatlar açıklanınca haber ver" diyen ziyaretçiler.
 * Üstte sitedeki alanın ayarı (aç/kapa + fiyat açıklama tarihi), altta liste. Fiyatlar açıklanınca listedekilere toplu SMS ya da
 * tek tek WhatsApp ile dönülür; SMS/WhatsApp giden kişi otomatik "Bilgilendirildi" olur.
 */
export default function PreRegistrationsView({ items, settings, roomTypes, smsStatus }) {
    const { exec } = useCommand();
    const [tab, setTab] = useState("open");
    const [roomType, setRoomType] = useState("");
    const [edit, setEdit] = useState(null);
    const [removing, setRemoving] = useState(null);
    const [smsOpen, setSmsOpen] = useState(false);

    const count = (s) => items.filter((x) => x.status === s).length;
    const open = (x) => x.status === "new" || x.status === "contacted";
    const rows = useMemo(
        () => items.filter((x) => (tab === "all" ? true : tab === "open" ? open(x) : x.status === tab) && (!roomType || x.roomTypeId === roomType)),
        [items, tab, roomType]
    );
    // Toplu SMS adayları: ekrandaki liste, kayıt olan / vazgeçen hariç
    const smsCandidates = rows.filter(open);

    const openWhatsapp = (r, e) => {
        e.stopPropagation();
        window.open(whatsappLink(r.phone, fillTemplate(WHATSAPP_TEXT, { ad: firstName(r.fullName), oda: roomName(r) || "odalarımız" })), "_blank", "noopener");
        if (r.status === "new") exec(updatePreRegistration, { id: r.id, status: "contacted" }, null);
    };

    const columns = [
        {
            key: "name",
            header: "Kişi",
            sort: (r) => r.fullName,
            render: (r) => (
                <div className="min-w-0 max-w-xs">
                    <div className="truncate font-bold">{r.fullName}</div>
                    {(r.note || r.adminNote) && (
                        <div className="truncate text-[11px] text-ad-muted" title={[r.note, r.adminNote].filter(Boolean).join(" · ")}>
                            {r.note && <span>“{r.note}”</span>}
                            {r.note && r.adminNote && " · "}
                            {r.adminNote && <span className="text-ad-brand">Not: {r.adminNote}</span>}
                        </div>
                    )}
                </div>
            ),
            export: { value: (r) => r.fullName, width: 24 },
        },
        {
            key: "phone",
            header: "Telefon",
            render: (r) => (
                <a href={`tel:+90${r.phone}`} onClick={(e) => e.stopPropagation()} className="ad-num whitespace-nowrap hover:text-ad-brand">
                    {phoneText(r.phone)}
                </a>
            ),
            export: { value: (r) => phoneText(r.phone) },
        },
        {
            key: "room",
            header: "Oda tipi",
            sort: (r) => roomName(r),
            render: (r) => (roomName(r) ? <span className="whitespace-nowrap">{roomName(r)}</span> : <span className="text-xs text-ad-muted">Fark etmez</span>),
            export: { value: (r) => roomName(r) || "Fark etmez" },
        },
        { key: "note", header: "Ziyaretçi notu", hidden: true, export: { value: (r) => r.note ?? "", width: 30 } },
        {
            key: "created",
            header: "Tarih",
            sort: (r) => r.createdAt,
            render: (r) => <span className="ad-num whitespace-nowrap">{date(turkeyDate(r.createdAt))}</span>,
            export: { type: "date", value: (r) => turkeyDate(r.createdAt) },
        },
        {
            key: "status",
            header: "Durum",
            render: (r) => (
                <div className="flex flex-col items-start gap-0.5">
                    <StatusBadge map={PRE_REGISTRATION_STATUS} value={r.status} />
                    {r.contactedAt && <span className="text-[10px] text-ad-muted">{date(turkeyDate(r.contactedAt))}</span>}
                </div>
            ),
            export: { value: (r) => PRE_REGISTRATION_STATUS[r.status]?.label ?? r.status },
        },
        { key: "adminNote", header: "Yönetici notu", hidden: true, export: { value: (r) => r.adminNote ?? "", width: 30 } },
        {
            key: "act",
            header: "",
            align: "end",
            render: (r) => (
                <div className="flex justify-end gap-1">
                    <button type="button" onClick={(e) => openWhatsapp(r, e)} title="WhatsApp'tan yaz" aria-label="WhatsApp'tan yaz" className="ad-btn ad-btn-icon ad-btn-soft !h-8 !w-8">
                        <Icon name="chat" filled className="text-[17px] text-[#25d366]" />
                    </button>
                    <a href={`tel:+90${r.phone}`} onClick={(e) => e.stopPropagation()} title="Ara" aria-label="Ara" className="ad-btn ad-btn-icon ad-btn-soft !h-8 !w-8">
                        <Icon name="call" className="text-[17px]" />
                    </a>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setRemoving(r);
                        }}
                        title="Sil"
                        aria-label="Sil"
                        className="ad-btn ad-btn-icon ad-btn-soft !h-8 !w-8 text-ad-danger"
                    >
                        <Icon name="delete" className="text-[17px]" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Ön Başvurular"
                description="Dolu oda sayfalarından “fiyatlar açıklanınca bana haber verin” diyenler. Fiyatlar açıklanınca SMS ya da WhatsApp ile dönüş yapın; mesaj giden kişi otomatik “Bilgilendirildi” olur."
                actions={
                    <button
                        type="button"
                        onClick={() => setSmsOpen(true)}
                        disabled={!smsCandidates.length}
                        title={smsCandidates.length ? "" : "Listede bilgilendirilecek kişi yok"}
                        className="ad-btn ad-btn-primary"
                    >
                        <Icon name="sms" className="text-[20px]" />
                        SMS gönder{smsCandidates.length ? ` (${smsCandidates.length})` : ""}
                    </button>
                }
            />

            <SettingsCard settings={settings} />

            <div className="mb-4 mt-6 flex flex-wrap items-center gap-3">
                <Chips
                    value={tab}
                    onChange={setTab}
                    items={[
                        { value: "open", label: "Dönüş bekleyen", count: items.filter(open).length },
                        { value: "new", label: "Yeni", count: count("new") },
                        { value: "contacted", label: "Bilgilendirildi", count: count("contacted") },
                        { value: "registered", label: "Kayıt oldu", count: count("registered") },
                        { value: "cancelled", label: "Vazgeçti", count: count("cancelled") },
                        { value: "all", label: "Tümü", count: items.length },
                    ]}
                />
            </div>

            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(r) => r.id}
                searchText={(r) => `${r.fullName} ${r.phone} ${phoneText(r.phone)} ${roomName(r)} ${r.note ?? ""}`}
                searchPlaceholder="Ad, telefon ya da not ara"
                filters={
                    <div className="w-full sm:w-52">
                        <SelectInput value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                            <option value="">Tüm oda tipleri</option>
                            {roomTypes.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name.tr}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                }
                onRowClick={(r) => setEdit(r)}
                exportName="on-basvurular"
                initialSort={{ key: "created", dir: "desc" }}
                empty={{
                    icon: "notifications_active",
                    title: items.length ? "Bu görünümde ön başvuru yok" : "Henüz ön başvuru yok",
                    description: items.length
                        ? "Sekmeyi ya da oda tipi süzgecini değiştirin."
                        : settings.enabled
                          ? "Boş yatağı kalmayan oda sayfalarından gelen ön başvurular burada listelenir."
                          : "Yukarıdaki ayarı açınca dolu oda sayfalarında ön başvuru alanı görünür.",
                }}
            />

            {edit && (
                <ActionDialog
                    title={edit.fullName}
                    description={`${phoneText(edit.phone)} · ${roomName(edit) || "Oda tipi fark etmez"} · ${date(turkeyDate(edit.createdAt))}`}
                    note={edit.note ? `Ziyaretçinin notu: “${edit.note}”` : undefined}
                    command={updatePreRegistration}
                    extra={{ id: edit.id }}
                    initial={{ status: edit.status, adminNote: edit.adminNote ?? "" }}
                    success="Ön başvuru güncellendi."
                    onClose={() => setEdit(null)}
                    fields={[
                        { name: "status", label: "Durum", type: "select", options: Object.entries(PRE_REGISTRATION_STATUS).map(([k, v]) => [k, v.label]) },
                        { name: "adminNote", label: "Yönetici notu", type: "textarea", hint: "Yalnızca panelde görünür. Örn. “Haziran'da tekrar aranacak”." },
                    ]}
                />
            )}

            <ConfirmDialog
                open={Boolean(removing)}
                title="Ön başvuru silinsin mi?"
                message={removing ? `${removing.fullName} (${phoneText(removing.phone)}) listeden kaldırılacak.` : ""}
                confirmLabel="Sil"
                onCancel={() => setRemoving(null)}
                onConfirm={async () => {
                    const out = await exec(deletePreRegistration, { id: removing.id }, "Ön başvuru silindi.");
                    if (out.ok) setRemoving(null);
                }}
            />

            {smsOpen && <SmsDialog candidates={smsCandidates} status={smsStatus} onClose={() => setSmsOpen(false)} />}
        </div>
    );
}

/** Sitedeki ön başvuru alanının ayarı + sitede görünecek metnin önizlemesi */
function SettingsCard({ settings }) {
    const { exec, busy } = useCommand();
    const [enabled, setEnabled] = useState(Boolean(settings.enabled));
    const [announceDate, setAnnounceDate] = useState(settings.announceDate ?? "");
    const dirty = enabled !== Boolean(settings.enabled) || (announceDate || null) !== (settings.announceDate ?? null);
    const title = announceDate ? `Yeni dönem fiyatları ${longDate(announceDate)} tarihinde açıklanacak` : "Yeni dönem fiyatları yakında açıklanacak";

    const save = () => exec(savePreRegistrationSettings, { enabled, announceDate }, enabled ? "Ön başvuru alanı sitede açık." : "Ön başvuru alanı kapatıldı.");

    return (
        <Card
            title="Sitedeki ön başvuru alanı"
            description="Açıkken yalnızca boş yatağı kalmamış oda tiplerinin sayfasında görünür. Boş yatağı olan odalarda normal başvuru devam eder."
            actions={enabled ? <Badge tone="ok" icon="visibility">Sitede açık</Badge> : <Badge tone="neutral" icon="visibility_off">Kapalı</Badge>}
        >
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-4">
                    <Switch
                        checked={enabled}
                        onChange={setEnabled}
                        label="Dolu odalarda ön başvuru al"
                        hint="Kapalıyken dolu odalarda eskisi gibi “Yine de başvur” görünür."
                    />
                    <Field label="Yeni fiyatların açıklanacağı tarih" hint="Boş bırakırsanız ya da tarih geçerse sitede “yakında açıklanacak” yazar.">
                        <div className="flex gap-2">
                            <div className="min-w-0 flex-1">
                                <DateInput value={announceDate} onChange={(e) => setAnnounceDate(e.target.value)} />
                            </div>
                            {announceDate && (
                                <button type="button" onClick={() => setAnnounceDate("")} className="ad-btn ad-btn-outline" title="Tarihi temizle">
                                    Temizle
                                </button>
                            )}
                        </div>
                    </Field>
                </div>

                <div className="flex flex-col justify-between gap-4 rounded-2xl bg-ad-sunken p-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ad-muted">Sitede görünecek</p>
                        <div className={`mt-2 rounded-2xl bg-ad-surface p-4 shadow-ad-sm ${enabled ? "" : "opacity-50"}`}>
                            <p className="flex items-start gap-2 text-sm font-bold text-ad-ink">
                                <Icon name="campaign" filled className="mt-px text-[18px] text-ad-brand" />
                                {title}
                            </p>
                            <p className="mt-1 text-xs text-ad-muted">Bu oda tipi şu an dolu. Ön başvuru yap, fiyatlar açıklandığında ilk senin haberin olsun.</p>
                            <span className="mt-3 inline-flex rounded-full bg-ad-brand px-3 py-1.5 text-xs font-bold text-white">Ön Başvuru Yap</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        {dirty && <span className="text-xs text-ad-warn">Kaydedilmemiş değişiklik var</span>}
                        <button type="button" onClick={save} disabled={busy || !dirty} className="ad-btn ad-btn-primary">
                            {busy && <Icon name="progress_activity" className="animate-spin text-[17px]" />}
                            Kaydet
                        </button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

/** Toplu SMS: alıcılar ekrandaki listeden gelir (hepsi seçili başlar). Önce önizleme, sonra gönderim. */
function SmsDialog({ candidates, status, onClose }) {
    const { exec, busy } = useCommand();
    const [picked, setPicked] = useState(() => new Set(candidates.map((c) => c.id)));
    const [text, setText] = useState(() => {
        const host = typeof window === "undefined" ? "mazlumapart.com" : window.location.host.replace(/^www\./, "");
        return `Merhaba {ad}, Mazlum Apart yeni dönem fiyatları açıklandı! {oda} için başvurunu ${host}/basvuru adresinden yapabilirsin.`;
    });
    const [preview, setPreview] = useState(null);
    const key = useRef(newIdempotencyKey());
    const info = smsInfo(text);

    const toggle = (id) => {
        setPreview(null);
        setPicked((s) => {
            const n = new Set(s);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };
    const input = () => ({ purpose: "announcement", text, lang: "tr", recipients: [...picked].map((preRegistrationId) => ({ preRegistrationId })) });

    const doPreview = async () => {
        const out = await exec(previewSms, input(), null, { refresh: false });
        if (out.ok) setPreview(out.result);
    };
    const doSend = async () => {
        const out = await exec(sendSms, { ...input(), key: key.current }, (r) => `${r.sent.length} kişiye SMS gönderime alındı.`);
        if (out.ok) {
            key.current = newIdempotencyKey();
            onClose();
        }
    };

    return (
        <FormDialog open title="Ön başvurulara SMS" description="Fiyatlar açıklandığında listedekilere haber verin. Gönderilenler “Bilgilendirildi” olur." onClose={onClose} busy={busy} size="lg" columns={1} hideFooter>
            {status && !status.enabled && (
                <p className="rounded-2xl bg-ad-warn-soft p-3 text-xs text-ad-warn">SMS sağlayıcısı kapalı (Sms:Enabled). Gönderim gerçek SMS olarak gitmez, simülasyon olarak kaydedilir.</p>
            )}

            <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ad-body">Alıcılar ({picked.size} / {candidates.length})</span>
                    <span className="flex gap-3 text-xs font-bold">
                        <button type="button" className="text-ad-brand" onClick={() => { setPreview(null); setPicked(new Set(candidates.map((c) => c.id))); }}>
                            Tümünü seç
                        </button>
                        <button type="button" className="text-ad-muted" onClick={() => { setPreview(null); setPicked(new Set()); }}>
                            Temizle
                        </button>
                    </span>
                </div>
                <ul className="ad-scroll max-h-56 divide-y divide-ad-line overflow-y-auto rounded-2xl border border-ad-line px-3">
                    {candidates.map((c) => (
                        <li key={c.id}>
                            <label className="flex cursor-pointer items-center gap-3 py-2 text-sm">
                                <input type="checkbox" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
                                <span className="min-w-0 flex-1 truncate font-semibold">{c.fullName}</span>
                                <span className="hidden truncate text-xs text-ad-muted sm:inline">{roomName(c) || "Fark etmez"}</span>
                                {c.status === "contacted" && <Badge tone="accent">Bilgilendirildi</Badge>}
                            </label>
                        </li>
                    ))}
                </ul>
            </div>

            <Field label="Mesaj" hint="Değişkenler: {ad} kişinin adı, {oda} ilgilendiği oda tipi">
                <TextInput as="textarea" rows={4} value={text} onChange={(e) => { setText(e.target.value); setPreview(null); }} />
            </Field>
            <p className="-mt-2 text-xs text-ad-muted">
                {info.length} karakter · kişi başı {info.parts} SMS{info.unicode && " · Türkçe karakter olduğu için SMS boyu kısa"}
            </p>

            {preview && (
                <div className="rounded-2xl bg-ad-sunken p-4 text-sm">
                    <b>
                        {preview.messages.length} kişiye toplam {preview.totalParts} SMS
                    </b>{" "}
                    · bugün kullanılan {preview.usedToday}/{preview.dailyLimit}
                    {preview.messages[0] && <p className="mt-2 whitespace-pre-wrap text-xs text-ad-body">Örnek: {preview.messages[0].text}</p>}
                    {preview.skipped.length > 0 && (
                        <p className="mt-2 text-xs text-ad-warn">
                            Atlanan {preview.skipped.length}: {preview.skipped.slice(0, 3).map((s) => `${s.name} (${s.reason})`).join(", ")}
                        </p>
                    )}
                </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-ad-line pt-4">
                <button type="button" onClick={onClose} disabled={busy} className="ad-btn ad-btn-outline">
                    Vazgeç
                </button>
                <button type="button" onClick={doPreview} disabled={busy || !picked.size || !text.trim()} className="ad-btn ad-btn-outline">
                    Önizle
                </button>
                <button type="button" onClick={doSend} disabled={busy || !preview || preview.messages.length === 0} className="ad-btn ad-btn-primary">
                    {busy && <Icon name="progress_activity" className="animate-spin text-[17px]" />}
                    Gönder
                </button>
            </div>
        </FormDialog>
    );
}
