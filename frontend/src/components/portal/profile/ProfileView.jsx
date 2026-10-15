"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/portal/PageHeader";
import LogoutDialog from "@/components/portal/LogoutDialog";
import { formatPhone, GRADES } from "@/lib/application";
import { formatDate } from "@/lib/format";
import { maskTc } from "@/lib/student/labels";
import { waHref } from "@/lib/constants";
import { localized } from "@/lib/i18n/localized";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT } from "@/lib/motion";

const rise = (i) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay: 0.08 + i * 0.07, ease: EASE_OUT },
});

function Section({ icon, title, index, children, badge }) {
    return (
        <motion.section {...rise(index)} className="glass-card rounded-[32px] p-6 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-orchid-dark">
                    <Icon name={icon} className="text-[22px] text-orchid-pink" />
                    {title}
                </h2>
                {badge}
            </div>
            {children}
        </motion.section>
    );
}

function Field({ label, children, wide }) {
    if (children == null || children === "") return null;
    return (
        <div className={wide ? "sm:col-span-2" : ""}>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-orchid-muted">{label}</dt>
            <dd className="mt-1 text-sm font-bold text-orchid-dark">{children}</dd>
        </div>
    );
}

const phoneText = (digits) => (digits ? `+90 ${formatPhone(digits)}` : "");

export default function ProfileView({ student, period, provinceName }) {
    const { t, locale } = useLanguage();
    const copy = t.studentPortal.profile;
    const f = copy.fields;
    const [logoutOpen, setLogoutOpen] = useState(false);
    const help = waHref(copy.changeMessage);
    const room = student.room;
    const gradeIndex = GRADES.indexOf(student.grade);
    const grade = gradeIndex >= 0 ? t.apply.school.grades[gradeIndex] : student.grade;

    const lock = (
        <span className="flex items-center gap-1 rounded-full bg-orchid-powder px-3 py-1 text-[11px] font-bold text-orchid-pink">
            <Icon name="lock" className="text-[14px]" />
            {copy.readOnly}
        </span>
    );

    return (
        <>
            <PageHeader title={t.studentPortal.nav.profile} text={copy.text}>
                <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                    <Icon name="verified_user" filled className="text-[18px]" />
                    {copy.status[student.status] ?? copy.status.active}
                </span>
            </PageHeader>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Section icon="badge" title={copy.personal} index={0} badge={lock}>
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <Field label={f.fullName} wide>{`${student.firstName} ${student.lastName}`}</Field>
                        <Field label={f.tc}><span className="font-mono tracking-wider">{maskTc(student.tc)}</span></Field>
                        <Field label={f.phone}>{phoneText(student.phone)}</Field>
                        <Field label={f.birthDate}>{formatDate(student.birthDate)}</Field>
                        <Field label={f.residence}>{[provinceName, student.district].filter(Boolean).join(" / ")}</Field>
                    </dl>
                </Section>

                <Section icon="school" title={copy.school} index={1} badge={lock}>
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <Field label={f.school} wide>{student.school}</Field>
                        <Field label={f.faculty}>{student.faculty}</Field>
                        <Field label={f.department}>{student.department}</Field>
                        <Field label={f.grade}>{grade}</Field>
                    </dl>
                </Section>

                <Section icon="family_restroom" title={copy.guardians} index={2} badge={lock}>
                    <ul className="flex flex-col gap-3">
                        {student.guardians.map((guardian) => (
                            <li key={guardian.id} className="flex items-center justify-between gap-3 rounded-2xl bg-orchid-powder/50 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-orchid-dark">{guardian.name}</p>
                                    <p className="text-xs text-orchid-muted">{phoneText(guardian.phone)}</p>
                                </div>
                                <a href={`tel:+90${guardian.phone}`} aria-label={`${guardian.name} · ${f.guardianPhone}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-orchid-pink shadow-sm hover:bg-orchid-lilac">
                                    <Icon name="call" className="text-[19px]" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </Section>

                <Section icon="apartment" title={copy.stay} index={3} badge={lock}>
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <Field label={f.roomType}>{localized(room.typeName, locale)}</Field>
                        <Field label={f.placement}>{`${room.flat} · ${room.roomName} · ${room.bed}`}</Field>
                        <Field label={f.term}>{student.term === "full" ? f.termFull : student.term}</Field>
                        <Field label={f.period}>{`${formatDate(period.start)} – ${formatDate(period.end)}`}</Field>
                        <Field label={f.entryDate}>{formatDate(student.entryDate)}</Field>
                        <Field label={f.registeredAt}>{formatDate(student.registeredAt)}</Field>
                    </dl>
                </Section>
            </div>

            <motion.div {...rise(4)} className="mt-5 grid grid-cols-1 gap-5">
                <div className="flex flex-col gap-4 rounded-[32px] bg-gradient-to-br from-orchid-powder to-orchid-lilac p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                    <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-orchid-pink shadow-sm">
                            <Icon name="contact_support" className="text-[24px]" />
                        </span>
                        <div>
                            <p className="font-display text-xl font-semibold text-orchid-dark">{copy.changeTitle}</p>
                            <p className="mt-1 text-sm leading-relaxed text-orchid-muted">{copy.changeText}</p>
                        </div>
                    </div>
                    {help && (
                        <a href={help} target="_blank" rel="noopener noreferrer" className="aurora-btn flex h-12 shrink-0 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold text-white">
                            <Icon name="chat" className="text-[20px]" />
                            {copy.changeButton}
                        </a>
                    )}
                </div>

                <button type="button" onClick={() => setLogoutOpen(true)} className="glass-card flex items-center gap-4 rounded-[32px] p-6 text-left transition-colors hover:bg-orchid-powder/60 sm:p-7 lg:hidden">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink">
                        <Icon name="logout" className="text-[24px]" />
                    </span>
                    <span>
                        <span className="block font-display text-lg font-semibold text-orchid-dark">{copy.logout}</span>
                        <span className="block text-xs text-orchid-muted">{copy.logoutText}</span>
                    </span>
                </button>
            </motion.div>

            <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
        </>
    );
}
