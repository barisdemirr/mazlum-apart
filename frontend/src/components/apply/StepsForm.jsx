"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import SafeImage from "@/components/ui/SafeImage";
import FloatingField from "./fields/FloatingField";
import SearchSelect from "./fields/SearchSelect";
import DatePicker from "./fields/DatePicker";
import { FieldError, GroupLabel, Segmented, SelectionCard } from "./fields/Choice";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { localized } from "@/lib/i18n/localized";
import { formatDate, formatPrice, rangeText } from "@/lib/format";
import { mediaAlt, mediaUrl } from "@/lib/media";
import { EASE_OUT } from "@/lib/motion";
import { GRADES, earliestEntry, formatPhone, newGuardian, onlyDigits, toISO } from "@/lib/application";
import { getDistricts, getProvinces } from "@/lib/locations";

const grid = "grid grid-cols-1 gap-5 sm:grid-cols-2";

/* ───────────────────────── Adım 1: Oda ve konaklama ───────────────────────── */

export function StepRoom({ form, set, err, tick, rooms, terms, period, bedRequest, cameFromDetail }) {
    const { t, tpl, locale } = useLanguage();
    const a = t.apply;
    const selectedRoom = rooms.find((room) => room.slug === form.roomSlug);
    const dateTexts = useDateTexts();
    const showBed = bedRequest && bedRequest.roomSlug === form.roomSlug;

    return (
        <div className="flex flex-col gap-8">
            <AnimatePresence initial={false}>
                {cameFromDetail && selectedRoom && (
                    <motion.div key="pre" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="-mb-3 overflow-hidden">
                        <div className="flex items-center gap-3 rounded-2xl bg-orchid-powder/80 px-4 py-3 text-sm text-orchid-dark">
                            <Icon name="auto_awesome" filled className="text-[22px] text-orchid-pink" />
                            <p>{tpl(a.room.preselected, { room: localized(selectedRoom.name, locale) })}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {showBed && (
                <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${bedRequest.available ? "border-orchid-petal/50 bg-white/80" : "border-orchid-violet/30 bg-orchid-lilac/60"}`}>
                    <Icon name="bed" filled className="text-[22px] text-orchid-pink" />
                    {bedRequest.available ? (
                        <p className="text-orchid-dark">
                            <span className="font-bold">{a.room.bed}: </span>
                            {localized(bedRequest.flatName, locale)} · {localized(bedRequest.roomName, locale)} · {localized(bedRequest.bedLabel, locale)}
                        </p>
                    ) : (
                        <p className="text-orchid-dark">{a.room.bedGone}</p>
                    )}
                </div>
            )}

            {/* Oda tipi */}
            <div data-field="roomSlug" className="flex flex-col gap-3">
                <GroupLabel required id="room-label">{a.room.title}</GroupLabel>
                <div role="radiogroup" aria-labelledby="room-label" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {rooms.map((room) => {
                        const on = room.slug === form.roomSlug;
                        const name = localized(room.name, locale);
                        return (
                            <SelectionCard key={room.slug} selected={on} onClick={() => set("roomSlug", room.slug)} label={name} className="p-3">
                                <span className="flex items-center gap-3 sm:block">
                                    <span className="block h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-orchid-powder sm:aspect-[4/3] sm:h-auto sm:w-full">
                                        <SafeImage
                                            src={mediaUrl(room.image, "md")}
                                            alt={mediaAlt(room.image, locale, name)}
                                            className={`h-full w-full object-cover transition-transform duration-700 ${on ? "scale-110" : ""}`}
                                        />
                                    </span>
                                    <span className="block min-w-0 flex-1 px-1 sm:px-1.5 sm:pb-2 sm:pt-3">
                                        <span className="block font-display text-xl font-medium leading-tight text-orchid-dark">{name}</span>
                                        <span className="mt-0.5 block text-xs text-orchid-muted">{tpl(a.room.inFlat, { count: rangeText(room.peopleInFlat, room.peopleInFlatMax) })}</span>
                                        <span className="mt-1.5 block font-display text-2xl font-semibold text-orchid-pink">
                                            {formatPrice(room.monthlyPrice, room.currency, locale)} <span className="font-sans text-xs font-normal text-orchid-muted">{t.common.perMonth}</span>
                                        </span>
                                    </span>
                                </span>
                            </SelectionCard>
                        );
                    })}
                </div>
                <FieldError id="room-error" message={err("roomSlug")} />

                <AnimatePresence mode="wait" initial={false}>
                    {selectedRoom && (
                        <motion.div
                            key={selectedRoom.slug}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.28, ease: EASE_OUT }}
                            className="flex items-start gap-3 rounded-2xl bg-orchid-lilac/60 px-4 py-3.5 text-sm text-orchid-dark"
                        >
                            <Icon name="info" filled className="mt-0.5 text-[20px] text-orchid-violet" />
                            <p>
                                <span className="font-bold">{a.room.infoTitle}: </span>
                                {tpl(a.room.info, showBed && bedRequest.available && bedRequest.flatPeople ? bedRequest.flatPeople : { flat: rangeText(selectedRoom.peopleInFlat, selectedRoom.peopleInFlatMax), kitchen: rangeText(selectedRoom.peopleSharingKitchen, selectedRoom.peopleSharingKitchenMax), bathroom: rangeText(selectedRoom.peopleSharingBathroom, selectedRoom.peopleSharingBathroomMax) })}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Kayıt süresi: yarım dönem kapalıyken (varsayılan) bu bölüm hiç gösterilmez, form tam dönemdir */}
            {terms.length > 1 && (
                <div data-field="term" className="flex flex-col gap-3">
                    <GroupLabel id="term-label">{a.room.termLabel}</GroupLabel>
                    <div role="radiogroup" aria-labelledby="term-label" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {terms.map((term) => (
                            <SelectionCard key={term.id} selected={form.term === term.id} onClick={() => set("term", term.id)} className="px-5 py-5">
                                <span className="block pr-9 pb-1">
                                    <span className="block font-display text-xl font-medium text-orchid-dark">
                                        {term.id === "full" ? a.room.fullTerm : term.id === "first" ? a.room.firstTerm : a.room.secondTerm}
                                    </span>
                                    <span className="mt-0.5 block text-sm text-orchid-muted">
                                        {formatDate(term.start)} – {formatDate(term.end)}
                                    </span>
                                </span>
                            </SelectionCard>
                        ))}
                    </div>
                    <FieldError id="term-error" message={err("term")} />
                </div>
            )}

            {/* Giriş tarihi */}
            <div className="flex flex-col gap-1.5">
                <DatePicker
                    id="entryDate"
                    name="entryDate"
                    label={a.room.entryLabel}
                    required
                    value={form.entryDate}
                    onChange={(v) => set("entryDate", v)}
                    min={earliestEntry(period)}
                    max={period.end}
                    openAt={earliestEntry(period)}
                    error={err("entryDate")}
                    tick={tick}
                    texts={dateTexts}
                />
                <p className="px-1 text-xs text-orchid-muted">{tpl(a.room.entryHint, { date: formatDate(earliestEntry(period)) })}</p>
            </div>

            {/* Ödeme günü */}
            <div data-field="payDay" className="flex flex-col gap-3">
                <GroupLabel required id="payday-label">{a.room.payDayLabel}</GroupLabel>
                <div role="radiogroup" aria-labelledby="payday-label" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                        { id: "early", title: a.room.payDayEarly },
                        { id: "mid", title: a.room.payDayMid },
                    ].map((option) => (
                        <SelectionCard key={option.id} selected={form.payDay === option.id} onClick={() => set("payDay", option.id)} className="px-5 py-5">
                            <span className="flex items-center gap-4 pr-9">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orchid-powder text-orchid-pink">
                                    <Icon name="event_repeat" className="text-[26px]" />
                                </span>
                                <span className="font-display text-xl font-medium leading-tight text-orchid-dark">{option.title}</span>
                            </span>
                        </SelectionCard>
                    ))}
                </div>
                <p className="px-1 text-xs text-orchid-muted">{a.room.payDayHint}</p>
                <FieldError id="payday-error" message={err("payDay")} />
            </div>
        </div>
    );
}

function useDateTexts() {
    const { t } = useLanguage();
    return { ...t.apply.date, invalid: t.apply.errors.dateInvalid };
}

/* ───────────────────────── Adım 2: Kişisel bilgiler ───────────────────────── */

export function StepPersonal({ form, set, err, tick }) {
    const { t, locale } = useLanguage();
    const p = t.apply.personal;
    const dateTexts = useDateTexts();

    const provinces = useMemo(
        () =>
            getProvinces()
                .map((item) => ({ value: String(item.id), label: item.name }))
                .sort((x, y) => x.label.localeCompare(y.label, "tr")),
        []
    );
    const districts = useMemo(() => getDistricts(form.provinceId).map((name) => ({ value: name, label: name })), [form.provinceId]);

    return (
        <div className="flex flex-col gap-5">
            <div className={grid}>
                <FloatingField id="firstName" name="firstName" label={p.firstName} required value={form.firstName} onChange={(v) => set("firstName", v)} error={err("firstName")} tick={tick} inputProps={{ autoComplete: "given-name" }} />
                <FloatingField id="lastName" name="lastName" label={p.lastName} required value={form.lastName} onChange={(v) => set("lastName", v)} error={err("lastName")} tick={tick} inputProps={{ autoComplete: "family-name" }} />
            </div>
            <div className={grid}>
                <FloatingField id="tc" name="tc" label={p.tc} required value={form.tc} onChange={(v) => set("tc", onlyDigits(v, 11))} error={err("tc")} tick={tick} inputProps={{ inputMode: "numeric", maxLength: 11, autoComplete: "off" }} />
                <DatePicker
                    id="birthDate"
                    name="birthDate"
                    label={p.birthDate}
                    required
                    value={form.birthDate}
                    onChange={(v) => set("birthDate", v)}
                    min="1940-01-01"
                    max={toISO(new Date())}
                    openAt="2006-01-01"
                    error={err("birthDate")}
                    tick={tick}
                    texts={dateTexts}
                />
            </div>
            <FloatingField
                id="phone"
                name="phone"
                label={p.phone}
                required
                prefix="+90"
                value={formatPhone(form.phone)}
                onChange={(v) => set("phone", onlyDigits(v, 10))}
                error={err("phone")}
                tick={tick}
                inputProps={{ inputMode: "tel", autoComplete: "tel-national", maxLength: 13 }}
            />
            <FloatingField id="address" name="address" label={p.address} required multiline value={form.address} onChange={(v) => set("address", v)} error={err("address")} tick={tick} inputProps={{ autoComplete: "street-address" }} />
            <div className={grid}>
                <SearchSelect
                    id="provinceId"
                    name="provinceId"
                    label={p.province}
                    required
                    options={provinces}
                    value={form.provinceId}
                    onChange={(v) => {
                        set("provinceId", v);
                        set("district", "");
                    }}
                    error={err("provinceId")}
                    tick={tick}
                    noResult={p.noResult}
                />
                <SearchSelect
                    id="district"
                    name="district"
                    label={p.district}
                    required
                    options={districts}
                    value={form.district}
                    onChange={(v) => set("district", v)}
                    error={err("district")}
                    tick={tick}
                    noResult={p.noResult}
                    disabled={!form.provinceId}
                    placeholder={p.pickProvince}
                />
            </div>
        </div>
    );
}

/* ───────────────────────── Adım 3: Okul bilgileri ───────────────────────── */

export function StepSchool({ form, set, err, tick }) {
    const { t } = useLanguage();
    const s = t.apply.school;
    const options = GRADES.map((id, index) => ({ id, label: s.grades[index] }));

    return (
        <div className="flex flex-col gap-5">
            <FloatingField id="school" name="school" label={s.name} required value={form.school} onChange={(v) => set("school", v)} error={err("school")} tick={tick} inputProps={{ autoComplete: "organization" }} />
            <div className={grid}>
                <FloatingField id="faculty" name="faculty" label={s.faculty} required value={form.faculty} onChange={(v) => set("faculty", v)} error={err("faculty")} tick={tick} inputProps={{ autoComplete: "off" }} />
                <FloatingField id="department" name="department" label={s.department} required value={form.department} onChange={(v) => set("department", v)} error={err("department")} tick={tick} inputProps={{ autoComplete: "off" }} />
            </div>
            <div data-field="grade" className="flex flex-col gap-3">
                <GroupLabel required id="grade-label">{s.grade}</GroupLabel>
                <Segmented options={options} value={form.grade} onChange={(v) => set("grade", v)} ariaLabelledBy="grade-label" invalid={Boolean(err("grade"))} />
                <FieldError id="grade-error" message={err("grade")} />
            </div>
        </div>
    );
}

/* ───────────────────────── Adım 4: Veli bilgileri ───────────────────────── */

export function StepGuardians({ form, setForm, err, tick }) {
    const { t, tpl } = useLanguage();
    const g = t.apply.guardians;

    const update = (id, field, value) =>
        setForm((f) => ({ ...f, guardians: f.guardians.map((item) => (item.id === id ? { ...item, [field]: value } : item)) }), [`guardian-${id}-${field}`]);
    const add = () => setForm((f) => ({ ...f, guardians: [...f.guardians, newGuardian()] }));
    const remove = (id) => setForm((f) => ({ ...f, guardians: f.guardians.filter((item) => item.id !== id) }));

    return (
        <div className="flex flex-col gap-5">
            <p className="text-sm text-orchid-muted">{g.hint}</p>
            <div className="flex flex-col gap-4">
                <AnimatePresence initial={false}>
                    {form.guardians.map((guardian, index) => (
                        <motion.div
                            key={guardian.id}
                            layout
                            initial={{ opacity: 0, height: 0, y: -24, rotateX: -35 }}
                            animate={{ opacity: 1, height: "auto", y: 0, rotateX: 0 }}
                            exit={{ opacity: 0, height: 0, scale: 0.9, y: -10 }}
                            transition={{ duration: 0.45, ease: EASE_OUT }}
                            style={{ transformPerspective: 900, transformOrigin: "top center" }}
                            className="-m-2.5 overflow-hidden p-2.5"
                        >
                            <div className="rounded-3xl border border-orchid-petal/40 bg-white/60 p-4 sm:p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-sm font-bold text-orchid-dark">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink">
                                            <Icon name="family_restroom" className="text-[18px]" />
                                        </span>
                                        {tpl(g.card, { n: index + 1 })}
                                    </span>
                                    {form.guardians.length > 1 && (
                                        <button type="button" onClick={() => remove(guardian.id)} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-orchid-pink transition-colors hover:bg-orchid-powder">
                                            <Icon name="delete" className="text-[16px]" />
                                            {g.remove}
                                        </button>
                                    )}
                                </div>
                                <div className={grid}>
                                    <FloatingField
                                        id={`g-${guardian.id}-name`}
                                        name={`guardian-${guardian.id}-name`}
                                        label={g.name}
                                        required
                                        value={guardian.name}
                                        onChange={(v) => update(guardian.id, "name", v)}
                                        error={err(`guardian-${guardian.id}-name`)}
                                        tick={tick}
                                        inputProps={{ autoComplete: "off" }}
                                    />
                                    <FloatingField
                                        id={`g-${guardian.id}-phone`}
                                        name={`guardian-${guardian.id}-phone`}
                                        label={g.phone}
                                        required
                                        prefix="+90"
                                        value={formatPhone(guardian.phone)}
                                        onChange={(v) => update(guardian.id, "phone", onlyDigits(v, 10))}
                                        error={err(`guardian-${guardian.id}-phone`)}
                                        tick={tick}
                                        inputProps={{ inputMode: "tel", autoComplete: "off", maxLength: 13 }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            <motion.button
                type="button"
                onClick={add}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex h-14 items-center justify-center gap-2 rounded-full border-2 border-dashed border-orchid-petal text-sm font-bold text-orchid-pink transition-colors hover:bg-orchid-powder/60"
            >
                <Icon name="add" className="text-[22px]" />
                {g.add}
            </motion.button>
        </div>
    );
}
