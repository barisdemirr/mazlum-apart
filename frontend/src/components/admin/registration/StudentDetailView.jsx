"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import FormDialog from "@/components/admin/FormDialog";
import WhatsAppButton from "@/components/admin/WhatsAppButton";
import useCommand from "@/components/admin/useCommand";
import { DateInput, Field, SelectInput } from "@/components/admin/fields";
import { Avatar, Badge, Card, EmptyState, PageHeader, StatusBadge } from "@/components/admin/ui";
import { describeCovered } from "@/lib/admin/domain/accounting";
import { endEnrollment } from "@/lib/admin/domain/registration";
import { enrollmentRow } from "@/lib/admin/domain/selectors";
import { CONTACT_PURPOSE, ENROLLMENT_STATUS, MAINT_STATUS, PAY_STATUS, PAY_WINDOW, TERM, date, money } from "@/lib/admin/labels";
import { getProvinceName } from "@/lib/locations";
import { GRADE_LABELS } from "./OfficeApplicationDialog";
import PlacementDialog from "./PlacementDialog";

const Info = ({ label, children }) => (
    <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-wider text-ad-muted">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold">{children || <span className="text-ad-faint">—</span>}</dd>
    </div>
);

export default function StudentDetailView({ enrollmentId }) {
    const { state, today, periodId, selectPeriod, periods } = useAdmin();
    const enrollment = state.enrollments.find((e) => e.id === enrollmentId);

    // Başka dönemin kaydı açıldıysa panelin dönemi de o döneme geçer
    useEffect(() => {
        if (enrollment && enrollment.periodId !== periodId) selectPeriod(enrollment.periodId);
    }, [enrollment, periodId, selectPeriod]);

    if (!enrollment) {
        return (
            <div>
                <PageHeader title="Öğrenci bulunamadı" back={{ href: "/admin/ogrenciler", label: "Öğrenciler" }} />
                <EmptyState icon="person_search" title="Bu kayıt yok" description="Bağlantı eski olabilir ya da kayıt silinmiş olabilir." />
            </div>
        );
    }
    return <Detail enrollment={enrollment} state={state} today={today} periods={periods} selectPeriod={selectPeriod} />;
}

function Detail({ enrollment, state, today, periods, selectPeriod }) {
    const { exec, busy } = useCommand();
    const [dialog, setDialog] = useState(null); // place | move | end
    const [endForm, setEndForm] = useState({ status: "left", date: today, reason: "" });

    const row = useMemo(() => enrollmentRow(state, enrollment, today), [state, enrollment, today]);
    const { student, summary, room, roomType } = row;
    const period = periods.find((p) => p.id === enrollment.periodId);
    const closedPeriod = period.status === "closed";
    const ended = ["cancelled", "left"].includes(enrollment.status);
    const canAct = !closedPeriod && !ended;
    const fullName = `${student.firstName} ${student.lastName}`;

    const placements = state.placements
        .filter((p) => p.enrollmentId === enrollment.id)
        .sort((a, b) => b.start.localeCompare(a.start))
        .map((p) => {
            const r = state.rooms.find((x) => x.id === p.roomId);
            const a = state.apartments.find((x) => x.id === r?.apartmentId);
            return { ...p, label: `${a?.name ?? ""} · ${r?.name ?? ""}`, current: p.start <= today && p.end >= today };
        });
    const contacts = state.contacts.filter((c) => c.enrollmentId === enrollment.id).sort((a, b) => b.at.localeCompare(a.at));
    const maintenance = state.maintenance.filter((m) => m.enrollmentId === enrollment.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const others = state.enrollments.filter((e) => e.studentId === student.id && e.id !== enrollment.id);
    const currentRoomId = placements.find((p) => p.current)?.roomId ?? null;

    const submitEnd = async (e) => {
        e.preventDefault();
        const out = await exec(endEnrollment, { enrollmentId: enrollment.id, status: endForm.status, effectiveDate: endForm.date, reason: endForm.reason }, "Kayıt kapatıldı.");
        if (out.ok) setDialog(null);
    };

    return (
        <div>
            <PageHeader
                back={{ href: "/admin/ogrenciler", label: "Öğrenciler" }}
                eyebrow={period.name}
                title={fullName}
                description={`${student.department || "Bölüm belirtilmemiş"} · ${student.school || "Okul belirtilmemiş"}`}
                actions={
                    <>
                        <WhatsAppButton row={row} item={summary.next} purpose={summary.status === "overdue" ? "payment_overdue" : "payment_reminder"} compact={false} label="WhatsApp" className="!h-10 !px-4" />
                        <Link href={`/admin/hesaplar/${enrollment.id}`} className="ad-btn ad-btn-primary">
                            <Icon name="account_balance_wallet" className="text-[20px]" />
                            Hesabı aç
                        </Link>
                    </>
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <StatusBadge map={ENROLLMENT_STATUS} value={enrollment.status} />
                {!ended && <StatusBadge map={PAY_STATUS} value={summary.status} />}
                {closedPeriod && <Badge tone="warn">Kapalı dönem: salt okunur</Badge>}
                {ended && <span className="text-xs text-ad-muted">{date(enrollment.endedAt)} · {enrollment.endReason}</span>}
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
                <div className="space-y-5 xl:col-span-2">
                    <Card title="Kişisel bilgiler">
                        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                            <Info label="T.C. kimlik no"><span className="ad-num">{student.tc}</span></Info>
                            <Info label="Doğum tarihi">{student.birthDate ? date(student.birthDate) : "—"}</Info>
                            <Info label="Telefon"><span className="ad-num">+90 {student.phone}</span></Info>
                            <Info label="İl / İlçe">{student.provinceId ? `${getProvinceName(student.provinceId)} / ${student.district}` : "—"}</Info>
                            <Info label="İkamet adresi">{student.address || "—"}</Info>
                            <Info label="Sınıf">{GRADE_LABELS[student.grade]}</Info>
                            <Info label="Okul">{student.school}</Info>
                            <Info label="Fakülte">{student.faculty || "—"}</Info>
                            <Info label="Bölüm">{student.department}</Info>
                        </dl>
                        <div className="mt-5 rounded-2xl border border-ad-line p-4">
                            <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Veli bilgileri</p>
                            <ul className="mt-2 space-y-1.5 text-sm">
                                {(student.guardians ?? []).map((g, i) => (
                                    <li key={i} className="flex flex-wrap items-center gap-x-2">
                                        <span className="font-bold">{g.name}</span>
                                        <span className="text-ad-muted">· <span className="ad-num">+90 {g.phone}</span>{g.relation ? ` · ${g.relation}` : ""}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Card>

                    <Card
                        title="Oda ve yerleşim"
                        description={room ? `Şu an: ${room.label}` : "Henüz bir odaya yerleştirilmedi."}
                        actions={canAct && (
                            placements.length === 0 ? (
                                <button type="button" onClick={() => setDialog("place")} className="ad-btn ad-btn-primary ad-btn-sm"><Icon name="bed" className="text-[18px]" />Odaya yerleştir</button>
                            ) : (
                                <button type="button" onClick={() => setDialog("move")} className="ad-btn ad-btn-outline ad-btn-sm"><Icon name="swap_horiz" className="text-[18px]" />Odayı değiştir</button>
                            )
                        )}
                    >
                        {placements.length === 0 ? (
                            <p className="mt-4 rounded-2xl bg-ad-warn-soft p-4 text-sm text-ad-warn">
                                Yerleştirilmedi. Onaylı kayıtlar yerleşim yapılana kadar “Onaylı kayıt” durumunda kalır; doluluğa sayılmaz.
                            </p>
                        ) : (
                            <ol className="mt-4 space-y-2">
                                {placements.map((p) => (
                                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ad-sunken px-4 py-3 text-sm">
                                        <span className="font-bold">{p.label}</span>
                                        <span className="flex items-center gap-2 text-xs text-ad-muted">
                                            <span className="ad-num">{date(p.start)} – {date(p.end)}</span>
                                            {p.current && <Badge tone="ok">Şu an</Badge>}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Card>

                    <div className="grid gap-5 md:grid-cols-2">
                        <Card title="İletişim geçmişi">
                            {contacts.length === 0 ? (
                                <p className="mt-4 text-sm text-ad-muted">Bu öğrenciyle kayıtlı iletişim yok. WhatsApp ile gönderilen mesajlar burada görünür.</p>
                            ) : (
                                <ul className="mt-4 space-y-2">
                                    {contacts.slice(0, 6).map((c) => (
                                        <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                                            <span className="flex items-center gap-2 font-semibold"><Icon name="chat" className="text-[16px] text-ad-accent" />{CONTACT_PURPOSE[c.purpose] ?? "Diğer"}</span>
                                            <span className="ad-num text-xs text-ad-muted">{date(c.at.slice(0, 10))}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                        <Card title="Arıza bildirimleri">
                            {maintenance.length === 0 ? (
                                <p className="mt-4 text-sm text-ad-muted">Bu öğrencinin arıza bildirimi yok.</p>
                            ) : (
                                <ul className="mt-4 space-y-2">
                                    {maintenance.slice(0, 6).map((m) => (
                                        <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                                            <span className="min-w-0 truncate font-semibold">{m.title}</span>
                                            <StatusBadge map={MAINT_STATUS} value={m.status} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>
                </div>

                <div className="space-y-5">
                    <Card title="Kayıt bilgileri">
                        <dl className="mt-4 grid grid-cols-2 gap-4">
                            <Info label="Oda tipi">{roomType?.name.tr}</Info>
                            <Info label="Süre">{TERM[enrollment.term]}</Info>
                            <Info label="Giriş">{date(enrollment.entryDate)}</Info>
                            <Info label="Ödeme günü">{PAY_WINDOW[enrollment.payWindow]}</Info>
                            <Info label="Aylık kira"><span className="ad-num">{money(enrollment.price.monthly)}</span></Info>
                            <Info label="Depozito"><span className="ad-num">{money(enrollment.price.deposit ?? 0)}</span></Info>
                        </dl>
                        <p className="mt-4 text-[11px] text-ad-muted">Fiyatlar kayıt anında sabitlenmiştir; sonradan fiyat listesi değişse de bu kaydı etkilemez.</p>
                    </Card>

                    <Card title="Ödeme özeti" actions={<Link href={`/admin/hesaplar/${enrollment.id}`} className="text-xs font-bold text-ad-brand hover:underline">Ayrıntı</Link>}>
                        <dl className="mt-4 space-y-2.5 text-sm">
                            <div className="flex justify-between"><dt className="text-ad-muted">Toplam borç</dt><dd className="ad-num font-bold">{money(summary.charged)}</dd></div>
                            <div className="flex justify-between"><dt className="text-ad-muted">Ödenen</dt><dd className="ad-num font-bold text-ad-ok">{money(summary.allocated)}</dd></div>
                            <div className="flex justify-between border-t border-ad-line pt-2.5"><dt className="font-bold">Kalan</dt><dd className={`ad-num text-base font-extrabold ${summary.overdue > 0 ? "text-ad-danger" : ""}`}>{money(summary.remaining)}</dd></div>
                            {summary.advance > 0 && <div className="flex justify-between"><dt className="text-ad-muted">Avans</dt><dd className="ad-num font-bold text-ad-accent">{money(summary.advance)}</dd></div>}
                        </dl>
                        <p className="mt-3 rounded-xl bg-ad-sunken px-3 py-2 text-xs text-ad-body">{describeCovered(summary.covered, money)}</p>
                    </Card>

                    {others.length > 0 && (
                        <Card title="Diğer dönem kayıtları">
                            <ul className="mt-4 space-y-2">
                                {others.map((o) => {
                                    const p = periods.find((x) => x.id === o.periodId);
                                    return (
                                        <li key={o.id}>
                                            <Link href={`/admin/ogrenciler/${o.id}`} onClick={() => selectPeriod(o.periodId)} className="flex items-center justify-between gap-2 rounded-xl bg-ad-sunken px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-ad-brand-soft">
                                                {p?.name}
                                                <StatusBadge map={ENROLLMENT_STATUS} value={o.status} />
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Card>
                    )}

                    {canAct && (
                        <button type="button" onClick={() => setDialog("end")} className="ad-btn ad-btn-danger-soft w-full">
                            <Icon name="logout" className="text-[20px]" />
                            Kaydı kapat (iptal / ayrılış)
                        </button>
                    )}
                </div>
            </div>

            {(dialog === "place" || dialog === "move") && (
                <PlacementDialog enrollment={enrollment} mode={dialog} currentRoomId={currentRoomId} onClose={() => setDialog(null)} />
            )}

            {dialog === "end" && (
                <FormDialog open title="Kaydı kapat" description={fullName} onClose={() => setDialog(null)} onSubmit={submitEnd} busy={busy} saveLabel="Kaydı kapat" danger columns={1}>
                    <div className="rounded-2xl bg-ad-warn-soft p-4 text-xs text-ad-warn">
                        Ayrılış tarihinden sonraki aylık kiralar ters kayıtla kapatılır (silinmez). Bu aylar için ödeme yapıldıysa tutar öğrencinin avansına döner; iade işlemi Hesaplar sayfasından yapılır. Depozito bu işlemle değişmez.
                    </div>
                    <Field label="Durum" required>
                        <SelectInput value={endForm.status} onChange={(e) => setEndForm({ ...endForm, status: e.target.value })}>
                            <option value="left">Ayrıldı (konaklamış, erken ayrıldı)</option>
                            <option value="cancelled">İptal (hiç gelmedi / vazgeçti)</option>
                        </SelectInput>
                    </Field>
                    <Field label="Geçerlilik tarihi" required>
                        <DateInput value={endForm.date} onChange={(e) => setEndForm({ ...endForm, date: e.target.value })} />
                    </Field>
                    <Field label="Neden" required>
                        <textarea rows={3} value={endForm.reason} onChange={(e) => setEndForm({ ...endForm, reason: e.target.value })} className="ad-field resize-y" />
                    </Field>
                </FormDialog>
            )}
        </div>
    );
}
