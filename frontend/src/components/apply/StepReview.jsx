"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import PaymentPlan from "./PaymentPlan";
import KvkkModal from "./KvkkModal";
import { Checkbox, FieldError } from "./fields/Choice";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/application";
import { getProvinceName } from "@/lib/locations";
import { EASE_OUT } from "@/lib/motion";

function Section({ title, onEdit, editLabel, rows, index }) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07, duration: 0.5, ease: EASE_OUT }}
            className="rounded-3xl border border-orchid-petal/30 bg-white/60 p-5"
        >
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-display text-xl font-medium text-orchid-dark">{title}</h3>
                <button type="button" onClick={onEdit} className="flex items-center gap-1 rounded-full bg-orchid-powder px-3.5 py-1.5 text-xs font-bold text-orchid-pink transition-colors hover:bg-orchid-pink hover:text-white">
                    <Icon name="edit" className="text-[15px]" />
                    {editLabel}
                </button>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {rows.map(([label, value, wide]) => (
                    <div key={label} className={wide ? "sm:col-span-2" : ""}>
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-orchid-muted">{label}</dt>
                        <dd className="break-words text-sm font-semibold text-orchid-dark">{value || "—"}</dd>
                    </div>
                ))}
            </dl>
        </motion.section>
    );
}

export default function StepReview({ form, set, err, goTo, room, plan, period }) {
    const { t, tpl, locale } = useLanguage();
    const a = t.apply;
    const r = a.review;
    const [kvkkOpen, setKvkkOpen] = useState(false);
    const grade = a.school.grades[["prep", "1", "2", "3", "4", "5", "6"].indexOf(form.grade)] ?? "";
    const payDay = form.payDay === "early" ? a.room.payDayEarly : form.payDay === "mid" ? a.room.payDayMid : "";
    const stayText = form.stayPlan === "yearly" ? a.room.stay.yearly : form.stayPlan === "summer" ? a.room.stay.summer : a.room.stay.academic;
    const notes = form.stayPlan === "yearly" ? r.notesYearly : form.stayPlan === "summer" ? r.notesSummer : r.notes;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
                <Section
                    index={0}
                    title={r.sections.room}
                    editLabel={a.edit}
                    onEdit={() => goTo(1)}
                    rows={[
                        [a.room.stay.label, stayText],
                        [a.summary.room, room ? localized(room.name, locale) : ""],
                        [r.labels.term, `${form.term === "first" ? a.room.firstTerm : form.term === "second" ? a.room.secondTerm : a.room.fullTerm} (${formatDate(period.start)} – ${formatDate(period.end)})`],
                        [a.summary.entry, formatDate(form.entryDate)],
                        [a.summary.payDay, payDay],
                    ]}
                />
                <Section
                    index={1}
                    title={r.sections.personal}
                    editLabel={a.edit}
                    onEdit={() => goTo(2)}
                    rows={[
                        [r.labels.fullName, `${form.firstName} ${form.lastName}`.trim()],
                        [a.personal.tc, form.tc],
                        [a.personal.birthDate, formatDate(form.birthDate)],
                        [a.personal.phone, form.phone ? `+90 ${formatPhone(form.phone)}` : ""],
                        [r.labels.location, [getProvinceName(form.provinceId), form.district].filter(Boolean).join(" / ")],
                        [r.labels.address, form.address, true],
                    ]}
                />
                <Section
                    index={2}
                    title={r.sections.school}
                    editLabel={a.edit}
                    onEdit={() => goTo(3)}
                    rows={[
                        [a.school.name, form.school],
                        [a.school.faculty, form.faculty],
                        [a.school.department, form.department],
                        [a.school.grade, grade],
                    ]}
                />
                <Section
                    index={3}
                    title={r.sections.guardians}
                    editLabel={a.edit}
                    onEdit={() => goTo(4)}
                    rows={form.guardians.map((g, i) => [tpl(a.guardians.card, { n: i + 1 }), `${g.name} · +90 ${formatPhone(g.phone)}`, true])}
                />
            </div>

            <PaymentPlan plan={plan} room={room} payDay={form.payDay} />

            <div className="flex flex-col gap-3">
                {notes.map((note, i) => (
                    <motion.div
                        key={note}
                        initial={{ opacity: 0, x: -14 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.4 }}
                        transition={{ delay: i * 0.08, duration: 0.45, ease: EASE_OUT }}
                        className="flex items-start gap-3 rounded-2xl bg-orchid-powder/70 px-4 py-3.5 text-sm text-orchid-dark"
                    >
                        <Icon name="info" filled className="mt-0.5 text-[20px] text-orchid-pink" />
                        <p>{note}</p>
                    </motion.div>
                ))}
            </div>

            <div data-field="kvkk" className="flex flex-col gap-2">
                <Checkbox id="kvkk" checked={form.kvkk} onChange={(v) => set("kvkk", v)} invalid={Boolean(err("kvkk"))}>
                    {r.kvkkLabel}
                </Checkbox>
                <button type="button" onClick={() => setKvkkOpen(true)} className="flex items-center gap-1.5 self-start px-2 text-xs font-bold text-orchid-pink underline-offset-4 hover:underline">
                    <Icon name="description" className="text-[16px]" />
                    {r.kvkkLink}
                </button>
                <FieldError id="kvkk-error" message={err("kvkk")} />
            </div>

            <KvkkModal open={kvkkOpen} onClose={() => setKvkkOpen(false)} />
        </div>
    );
}
