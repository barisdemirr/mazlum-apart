"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import FormDialog from "@/components/admin/FormDialog";
import { Field } from "@/components/admin/fields";
import { Badge, StatusBadge } from "@/components/admin/ui";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import useCommand from "@/components/admin/useCommand";
import { approveApplication, rejectApplication } from "@/lib/admin/domain/registration";
import { generateCharges } from "@/lib/admin/domain/plan";
import { monthLabel } from "@/lib/admin/domain/dates";
import { APPLICATION_STATUS, PAY_WINDOW, SOURCE, TERM, date, money } from "@/lib/admin/labels";
import { enrollmentRow } from "@/lib/admin/domain/selectors";
import { GRADE_LABELS } from "./OfficeApplicationDialog";

const Info = ({ label, children }) => (
    <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-wider text-ad-muted">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold">{children || <span className="text-ad-faint">—</span>}</dd>
    </div>
);

/** Başvuru incelemesi: bilgiler + ödeme planı önizlemesi + onay/ret */
export default function ApplicationDialog({ application, onClose }) {
    const { state, period, today } = useAdmin();
    const { exec, busy } = useCommand();
    const [mode, setMode] = useState("view"); // view | reject | approved
    const [reason, setReason] = useState("");
    const [approved, setApproved] = useState(null);

    const app = application;
    const roomType = state.roomTypes.find((r) => r.id === app?.roomTypeId);
    const periodOfApp = state.periods.find((p) => p.id === app?.periodId);
    const readOnlyPeriod = periodOfApp?.status === "closed";

    const plan = useMemo(() => {
        if (!app) return [];
        return generateCharges({ entryDate: app.entryDate, payWindow: app.payWindow, price: app.priceSnapshot, periodEnd: periodOfApp.end });
    }, [app, periodOfApp]);

    if (!app) return null;

    const total = plan.reduce((s, c) => s + c.amount, 0);
    const atRegistration = plan.filter((c) => c.dueDate === app.entryDate).reduce((s, c) => s + c.amount, 0);

    const approve = async () => {
        const out = await exec(approveApplication, { applicationId: app.id }, "Başvuru onaylandı, ödeme planı oluşturuldu.");
        if (out.ok) {
            setApproved(out.result);
            setMode("approved");
        }
    };

    const reject = async (e) => {
        e.preventDefault();
        const out = await exec(rejectApplication, { applicationId: app.id, reason }, "Başvuru reddedildi.");
        if (out.ok) onClose();
    };

    /* Onay sonrası: şifre + WhatsApp */
    if (mode === "approved" && approved) {
        const row = enrollmentRow(state, state.enrollments.find((e) => e.id === approved.enrollment.id) ?? approved.enrollment, today);
        row.student = approved.student;
        return (
            <FormDialog open title="Kayıt oluşturuldu" description={`${approved.student.firstName} ${approved.student.lastName}`} onClose={onClose} hideFooter columns={1}>
                <div className="rounded-2xl bg-ad-ok-soft p-4 text-sm text-ad-ok">
                    <p className="flex items-center gap-2 font-bold"><Icon name="check_circle" filled className="text-[20px]" /> Ödeme planı {plan.length} kalemle hazırlandı.</p>
                    <p className="mt-1 text-xs">Öğrenci şimdi "Onaylı kayıt" durumunda. Odaya yerleştirmek için Yerleşim sayfasını kullanın.</p>
                </div>
                <div className="rounded-2xl border border-ad-line p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Öğrenci alanı giriş bilgileri</p>
                    <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
                        <Info label="Telefon">+90 {approved.student.phone}</Info>
                        <Info label="İlk şifre"><code className="rounded bg-ad-sunken px-2 py-0.5 text-base tracking-widest">{approved.initialPassword}</code></Info>
                    </dl>
                    <p className="mt-3 text-xs text-ad-warn">Bu şifre yalnızca şimdi gösterilir. WhatsApp ile öğrenciye iletin.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <WhatsAppButton row={row} purpose="enrollment_approved" defaultTemplate="enrollment_approved" extraVars={{ sifre: approved.initialPassword }} compact={false} label="Giriş bilgisini WhatsApp ile gönder" className="!h-11 !px-4" />
                    <button type="button" onClick={onClose} className="ad-btn ad-btn-outline">Kapat</button>
                </div>
            </FormDialog>
        );
    }

    if (mode === "reject") {
        return (
            <FormDialog open title="Başvuruyu reddet" description={`${app.student.firstName} ${app.student.lastName}`} onClose={() => setMode("view")} onSubmit={reject} busy={busy} saveLabel="Reddet" danger columns={1}>
                <Field label="Ret nedeni" required hint="Öğrenciye iletilmez, işlem geçmişinde kayıtlı kalır.">
                    <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="ad-field resize-y" autoFocus />
                </Field>
            </FormDialog>
        );
    }

    const s = app.student;
    return (
        <FormDialog
            open
            size="lg"
            title={`${s.firstName} ${s.lastName}`}
            description={`${periodOfApp.name} · ${SOURCE[app.source]} başvurusu · ${date(app.createdAt.slice(0, 10))}`}
            onClose={onClose}
            hideFooter={app.status !== "pending" || readOnlyPeriod}
            columns={1}
            footer={
                app.status === "pending" && !readOnlyPeriod ? (
                    <>
                        <button type="button" onClick={() => setMode("reject")} disabled={busy} className="ad-btn ad-btn-danger-soft me-auto">Reddet</button>
                    </>
                ) : null
            }
            onSubmit={app.status === "pending" && !readOnlyPeriod ? (e) => { e.preventDefault(); approve(); } : undefined}
            saveLabel="Onayla ve plan oluştur"
            busy={busy}
        >
            <div className="flex flex-wrap items-center gap-2">
                <StatusBadge map={APPLICATION_STATUS} value={app.status} />
                {readOnlyPeriod && app.status === "pending" && <Badge tone="warn">Kapalı dönem: onaylanamaz</Badge>}
                {app.status === "rejected" && <span className="text-xs text-ad-muted">Neden: {app.rejectReason}</span>}
            </div>

            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Info label="T.C. kimlik no">{s.tc}</Info>
                <Info label="Telefon">+90 {s.phone}</Info>
                <Info label="Sınıf">{GRADE_LABELS[s.grade]}</Info>
                <Info label="Okul">{s.school}</Info>
                <Info label="Bölüm">{s.department}</Info>
                <Info label="Oda tipi">{roomType?.name.tr}</Info>
                <Info label="Giriş tarihi">{date(app.entryDate)}</Info>
                <Info label="Ödeme penceresi">{PAY_WINDOW[app.payWindow]}</Info>
                <Info label="Süre">{TERM[app.term]}</Info>
            </dl>

            <div className="rounded-2xl border border-ad-line p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Veli</p>
                <ul className="mt-2 space-y-1 text-sm">
                    {s.guardians?.map((g, i) => <li key={i} className="font-semibold">{g.name} <span className="font-normal text-ad-muted">· {g.relation} · +90 {g.phone}</span></li>)}
                </ul>
            </div>

            <div className="rounded-2xl bg-ad-sunken p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Ödeme planı{app.status === "pending" ? " (onayda oluşur)" : ""}</p>
                    <span className="text-xs text-ad-muted">Başvurudaki fiyat sabitlenmiştir</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                    <Info label="Kayıtta ödenecek">{money(atRegistration)}</Info>
                    <Info label="Aylık kira">{money(app.priceSnapshot.monthly)}</Info>
                    <Info label="Dönem toplamı">{money(total)}</Info>
                </div>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                    {plan.slice(0, 14).map((c, i) => (
                        <li key={i} className="rounded-full bg-ad-surface px-2.5 py-1 text-[11px] font-semibold text-ad-body ring-1 ring-ad-line">
                            {c.kind === "deposit" ? "Depozito" : monthLabel(c.month, { short: true })} · {date(c.dueDate).slice(0, 5)}
                        </li>
                    ))}
                </ul>
            </div>
        </FormDialog>
    );
}
