"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import FormDialog from "@/components/admin/FormDialog";
import { Field } from "@/components/admin/fields";
import { Badge, StatusBadge } from "@/components/admin/ui";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import useCommand, { errorText } from "@/components/admin/useCommand";
import { applicationDocumentUrl, approveApplication, getApplication, rejectApplication, uploadApplicationDocument } from "@/lib/admin/commands/registration";
import { monthLabel } from "@/lib/admin/month";
import { turkeyDate } from "@/lib/format";
import { APPLICATION_STATUS, PAY_WINDOW, SOURCE, STAY_PLAN, TERM, date, money } from "@/lib/admin/labels";
import { getProvinceName } from "@/lib/locations";
import { GRADE_LABELS } from "./OfficeApplicationDialog";

const Info = ({ label, children }) => (
    <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-wider text-ad-muted">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold">{children || <span className="text-ad-faint">—</span>}</dd>
    </div>
);

const kb = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Öğrenci belgesi: aç / indir; yoksa (ofis kaydı) ya da yanlışsa yükle / değiştir */
function DocumentBox({ application }) {
    const { exec, busy } = useCommand();
    const [doc, setDoc] = useState(application.documentName ? { name: application.documentName, size: application.documentSize } : null);
    const [error, setError] = useState("");

    const upload = async (file) => {
        if (!file) return;
        if (!/\.pdf$/i.test(file.name) || file.size > 4 * 1024 * 1024) {
            setError("Yalnızca PDF, en fazla 4 MB.");
            return;
        }
        setError("");
        const out = await exec(uploadApplicationDocument, { id: application.id, file }, doc ? "Belge değiştirildi." : "Belge eklendi.");
        if (out.ok) setDoc({ name: out.result.documentName, size: out.result.documentSize });
    };

    return (
        <div className={`rounded-2xl border p-4 ${doc ? "border-ad-line" : "border-ad-warn/40 bg-ad-warn-soft"}`}>
            <div className="flex flex-wrap items-center gap-3">
                <Icon name="picture_as_pdf" filled className={`text-[28px] ${doc ? "text-ad-danger" : "text-ad-warn"}`} />
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Öğrenci belgesi</p>
                    {doc ? (
                        <p className="truncate text-sm font-semibold" title={doc.name}>{doc.name} <span className="font-normal text-ad-muted">· {kb(doc.size)}</span></p>
                    ) : (
                        <p className="text-sm font-semibold text-ad-warn">Belge yüklenmemiş</p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {doc && (
                        <>
                            <a href={applicationDocumentUrl(application.id)} target="_blank" rel="noopener noreferrer" className="ad-btn ad-btn-soft ad-btn-sm"><Icon name="visibility" className="text-[16px]" />Aç</a>
                            <a href={applicationDocumentUrl(application.id, true)} className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="download" className="text-[16px]" />İndir</a>
                        </>
                    )}
                    <label className={`ad-btn ad-btn-outline ad-btn-sm cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
                        <Icon name={busy ? "progress_activity" : "upload_file"} className={`text-[16px] ${busy ? "animate-spin" : ""}`} />
                        {doc ? "Değiştir" : "Belge yükle"}
                        <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
                    </label>
                </div>
            </div>
            {error && <p role="alert" className="mt-2 text-xs font-semibold text-ad-danger">{error}</p>}
        </div>
    );
}

/** Başvuru incelemesi: bilgiler + ödeme planı önizlemesi (backend hesaplar) + onay/ret */
export default function ApplicationDialog({ application, onClose }) {
    const { period } = useAdmin();
    const { exec, busy } = useCommand();
    const [mode, setMode] = useState("view"); // view | reject | approved
    const [reason, setReason] = useState("");
    const [approved, setApproved] = useState(null);
    const [detail, setDetail] = useState(null);
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        let alive = true;
        getApplication({ id: application.id })
            .then((d) => alive && setDetail(d))
            .catch((e) => alive && setLoadError(errorText(e)));
        return () => { alive = false; };
    }, [application.id]);

    const readOnlyPeriod = period.status === "closed";

    const approve = async () => {
        const out = await exec(approveApplication, { id: application.id }, "Başvuru onaylandı, ödeme planı oluşturuldu.");
        if (out.ok) {
            setApproved(out.result);
            setMode("approved");
        }
    };

    const reject = async (e) => {
        e.preventDefault();
        const out = await exec(rejectApplication, { id: application.id, reason }, "Başvuru reddedildi.");
        if (out.ok) onClose();
    };

    /* Onay sonrası: şifre + WhatsApp */
    if (mode === "approved" && approved) {
        const a = detail?.applicant;
        const row = {
            enrollment: { id: approved.enrollmentId },
            student: { firstName: a?.firstName ?? application.fullName, lastName: a?.lastName ?? "", phone: approved.phone },
            room: null,
            summary: { remaining: detail?.periodTotal ?? 0 },
        };
        return (
            <FormDialog open title="Kayıt oluşturuldu" description={application.fullName} onClose={onClose} hideFooter columns={1}>
                <div className="rounded-2xl bg-ad-ok-soft p-4 text-sm text-ad-ok">
                    <p className="flex items-center gap-2 font-bold"><Icon name="check_circle" filled className="text-[20px]" /> Ödeme planı {approved.charges} kalemle hazırlandı.</p>
                    <p className="mt-1 text-xs">Öğrenci şimdi "Onaylı kayıt" durumunda. Odaya yerleştirmek için Yerleşim sayfasını kullanın.</p>
                </div>
                <div className="rounded-2xl border border-ad-line p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Öğrenci alanı giriş bilgileri</p>
                    {approved.initialPassword ? (
                        <>
                            <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
                                <Info label="Telefon">+90 {approved.phone}</Info>
                                <Info label="İlk şifre"><code className="rounded bg-ad-sunken px-2 py-0.5 text-base tracking-widest">{approved.initialPassword}</code></Info>
                            </dl>
                            <p className="mt-3 text-xs text-ad-warn">Bu şifre yalnızca şimdi gösterilir. WhatsApp ile öğrenciye iletin.</p>
                        </>
                    ) : (
                        <p className="mt-2 text-sm text-ad-body">Bu öğrencinin portal şifresi daha önce oluşturulmuş: önceki dönemden kayıtlı. Telefonu <b>+90 {approved.phone}</b>; şifresini unuttuysa Öğrenci Hesapları’ndan sıfırlanır.</p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {approved.initialPassword && (
                        <WhatsAppButton row={row} purpose="enrollment_approved" defaultTemplate="enrollment_approved" extraVars={{ sifre: approved.initialPassword }} compact={false} label="Giriş bilgisini WhatsApp ile gönder" className="!h-11 !px-4" />
                    )}
                    <button type="button" onClick={onClose} className="ad-btn ad-btn-outline">Kapat</button>
                </div>
            </FormDialog>
        );
    }

    if (mode === "reject") {
        return (
            <FormDialog open title="Başvuruyu reddet" description={application.fullName} onClose={() => setMode("view")} onSubmit={reject} busy={busy} saveLabel="Reddet" danger columns={1}>
                <Field label="Ret nedeni" required hint="Öğrenciye iletilmez, işlem geçmişinde kayıtlı kalır.">
                    <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="ad-field resize-y" autoFocus />
                </Field>
            </FormDialog>
        );
    }

    const s = detail?.applicant;
    const pending = application.status === "pending" && !readOnlyPeriod;
    const plan = detail?.plan ?? [];

    return (
        <FormDialog
            open
            size="lg"
            title={application.fullName}
            description={`${period.name} · ${SOURCE[application.source]} başvurusu · ${application.no} · ${date(turkeyDate(application.createdAt))}`}
            onClose={onClose}
            hideFooter={!pending || !detail}
            columns={1}
            footer={pending ? <button type="button" onClick={() => setMode("reject")} disabled={busy} className="ad-btn ad-btn-danger-soft me-auto">Reddet</button> : null}
            onSubmit={pending ? (e) => { e.preventDefault(); approve(); } : undefined}
            saveLabel="Onayla ve plan oluştur"
            busy={busy}
        >
            <div className="flex flex-wrap items-center gap-2">
                <StatusBadge map={APPLICATION_STATUS} value={application.status} />
                {application.stayPlan && application.stayPlan !== "academic" && <Badge tone={STAY_PLAN[application.stayPlan].tone} icon={application.stayPlan === "summer" ? "sunny" : "event_available"}>{STAY_PLAN[application.stayPlan].long}</Badge>}
                {readOnlyPeriod && application.status === "pending" && <Badge tone="warn">Kapalı dönem: onaylanamaz</Badge>}
                {application.status === "rejected" && detail?.rejectReason && <span className="text-xs text-ad-muted">Neden: {detail.rejectReason}</span>}
            </div>

            {loadError && <p role="alert" className="rounded-2xl bg-ad-danger-soft p-4 text-sm text-ad-danger">{loadError}</p>}
            {!detail && !loadError && <p className="rounded-2xl bg-ad-sunken p-6 text-center text-sm text-ad-muted">Başvuru bilgileri yükleniyor…</p>}

            {detail && (
                <>
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <Info label="T.C. kimlik no">{s.tc}</Info>
                        <Info label="Doğum tarihi">{s.birthDate ? date(s.birthDate) : "—"}</Info>
                        <Info label="Telefon">+90 {s.phone}</Info>
                        <Info label="İl / İlçe">{s.provinceId ? `${s.province || getProvinceName(s.provinceId)} / ${s.district}` : "—"}</Info>
                        <Info label="İkamet adresi">{s.address || "—"}</Info>
                        <Info label="Sınıf">{GRADE_LABELS[s.grade]}</Info>
                        <Info label="Okul">{s.school}</Info>
                        <Info label="Fakülte">{s.faculty || "—"}</Info>
                        <Info label="Bölüm">{s.department}</Info>
                        <Info label="Oda tipi">{application.roomTypeName}</Info>
                        <Info label="Tercih edilen oda">{application.preferredRoom}</Info>
                        <Info label="Giriş tarihi">{date(application.entryDate)}</Info>
                        <Info label="Ödeme penceresi">{PAY_WINDOW[application.payWindow]}</Info>
                        <Info label="Süre">{TERM[application.term]}</Info>
                        <Info label="Konaklama türü">{STAY_PLAN[application.stayPlan]?.long}</Info>
                    </dl>

                    {detail.note && <p className="rounded-2xl bg-ad-sunken p-4 text-sm"><b>Not:</b> {detail.note}</p>}

                    <div className="rounded-2xl border border-ad-line p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Veli bilgileri</p>
                        <ul className="mt-2 space-y-1 text-sm">
                            {s.guardians?.map((g, i) => <li key={i} className="font-semibold">{g.name} <span className="font-normal text-ad-muted">· +90 {g.phone}</span></li>)}
                        </ul>
                    </div>

                    <DocumentBox application={application} />

                    <div className="rounded-2xl bg-ad-sunken p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Ödeme planı{application.status === "pending" ? " (onayda oluşur)" : ""}</p>
                            <span className="text-xs text-ad-muted">Başvurudaki fiyat sabitlenmiştir</span>
                        </div>
                        {application.discountCode && (
                            <p className="mt-2 flex items-center gap-2 rounded-xl bg-ad-brand-soft px-3 py-2 text-xs font-semibold text-ad-brand">
                                <Icon name="sell" filled className="text-[16px]" />
                                İndirim kodu {application.discountCode}: aylık kira {money(application.listPriceMonthly)} yerine {money(application.priceMonthly)}. Depozito da aynı indirimle hesaplanır.
                            </p>
                        )}
                        <div className={`mt-2 grid gap-3 text-sm ${application.priceSummerMonthly != null ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
                            <Info label="Kayıtta ödenecek">{money(detail.dueAtRegistration)}</Info>
                            <Info label="Aylık kira">{money(application.priceMonthly)}</Info>
                            {application.priceSummerMonthly != null && <Info label="Yaz kirası (Tem–Ağu)">{money(application.priceSummerMonthly)}</Info>}
                            <Info label={application.stayPlan === "yearly" ? "12 ay toplamı" : "Dönem toplamı"}>{money(detail.periodTotal)}</Info>
                        </div>
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                            {plan.slice(0, 14).map((c, i) => (
                                <li key={i} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${c.kind === "summer" ? "bg-ad-warn-soft text-ad-warn ring-ad-line" : "bg-ad-surface text-ad-body ring-ad-line"}`}>
                                    {c.kind === "deposit" ? "Depozito" : monthLabel(c.month, { short: true })}{c.kind === "summer" ? " (yaz)" : ""} · {date(c.dueDate).slice(0, 5)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}
        </FormDialog>
    );
}
