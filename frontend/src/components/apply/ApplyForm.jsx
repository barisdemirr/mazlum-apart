"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import Magnetic from "@/components/ui/Magnetic";
import Stepper from "./Stepper";
import SummaryCard, { SummarySheet } from "./SummaryCard";
import SuccessScreen from "./SuccessScreen";
import StepReview from "./StepReview";
import { StepGuardians, StepPersonal, StepRoom, StepSchool } from "./StepsForm";
import { submitApplication } from "@/services";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { buildPaymentPlan, emptyForm, validateStep } from "@/lib/application";
import { formatDate, formatPrice } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";

const TOTAL_STEPS = 5;

const stepVariants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 70 : -70 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -70 : 70 }),
};

/** Gönder butonu: basılınca daireye küçülüp yükleniyor animasyonuna döner */
function SubmitButton({ submitting, label, onClick }) {
    const ref = useRef(null);
    const [width, setWidth] = useState(null);

    useEffect(() => {
        if (!submitting && ref.current) setWidth(ref.current.getBoundingClientRect().width);
    }, [submitting, label]);

    return (
        <motion.button
            ref={ref}
            type="button"
            onClick={onClick}
            disabled={submitting}
            initial={false}
            animate={{ width: submitting ? 60 : (width ?? "auto") }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            style={{ height: 60 }}
            className="aurora-btn flex items-center justify-center rounded-full text-sm font-bold text-white sm:text-base"
        >
            <AnimatePresence mode="wait" initial={false}>
                {submitting ? (
                    <motion.span key="spin" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="block h-7 w-7 rounded-full border-[3px] border-white/35 border-t-white animate-spin" />
                ) : (
                    <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 whitespace-nowrap px-6 sm:px-8">
                        {label}
                        <Icon name="send" className="text-[20px]" />
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );
}

export default function ApplyForm({ rooms, config, initialRoomSlug, bedRequest }) {
    const { t, tpl, locale } = useLanguage();
    const a = t.apply;
    const { period } = config;

    const startRoom = rooms.some((room) => room.slug === initialRoomSlug) ? initialRoomSlug : "";
    const [form, setFormState] = useState(() => emptyForm({ roomSlug: startRoom, period }));
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1);
    const [maxReached, setMaxReached] = useState(1);
    const [errors, setErrors] = useState({});
    const [tick, setTick] = useState(0);
    const [status, setStatus] = useState("idle"); // idle | submitting | done
    const [applicationNo, setApplicationNo] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [sheetOpen, setSheetOpen] = useState(false);
    const topRef = useRef(null);

    const room = rooms.find((item) => item.slug === form.roomSlug) ?? null;
    const plan = useMemo(
        () => buildPaymentPlan({ room, entryDate: form.entryDate, payDay: form.payDay, period, locale }),
        [room, form.entryDate, form.payDay, period, locale]
    );
    const selectedBed = bedRequest?.available && bedRequest.roomSlug === form.roomSlug ? bedRequest : null;

    /* ── durum yardımcıları ── */
    const clearErrors = (keys) =>
        setErrors((current) => {
            if (!keys.some((key) => key in current)) return current;
            const next = { ...current };
            keys.forEach((key) => delete next[key]);
            return next;
        });

    const set = (field, value) => {
        setFormState((f) => ({ ...f, [field]: value }));
        clearErrors([field]);
    };
    const setForm = (updater, clearKeys = []) => {
        setFormState(updater);
        if (clearKeys.length) clearErrors(clearKeys);
    };

    const errText = (field) => {
        const code = errors[field];
        if (!code) return undefined;
        if (code === "dateMin") return tpl(a.errors.dateMin, { date: formatDate(period.start) });
        if (code === "dateMax") return tpl(a.errors.dateMax, { date: formatDate(period.end) });
        return a.errors[code] ?? a.errors.required;
    };

    /* ── gezinme ── */
    const scrollToTop = () => {
        const el = topRef.current;
        if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const showErrors = (errs) => {
        setErrors(errs);
        setTick((n) => n + 1);
        setTimeout(() => {
            const first = Object.keys(errs)[0];
            document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 60);
    };
    const validate = (n) => validateStep(n, form, { period, rooms });

    const next = () => {
        const errs = validate(step);
        if (Object.keys(errs).length) return showErrors(errs);
        setErrors({});
        setDirection(1);
        setStep(step + 1);
        setMaxReached((m) => Math.max(m, step + 1));
        scrollToTop();
    };
    const back = () => {
        setDirection(-1);
        setStep((s) => Math.max(1, s - 1));
        scrollToTop();
    };
    const goTo = (n) => {
        if (n === step || n > maxReached) return;
        setDirection(n > step ? 1 : -1);
        setStep(n);
        scrollToTop();
    };

    const submit = async () => {
        for (let n = 1; n <= TOTAL_STEPS; n += 1) {
            const errs = validate(n);
            if (Object.keys(errs).length) {
                if (n !== step) {
                    setDirection(-1);
                    setStep(n);
                }
                return showErrors(errs);
            }
        }

        setStatus("submitting");
        setSubmitError("");
        try {
            const result = await submitApplication({
                roomSlug: form.roomSlug,
                bedId: selectedBed?.id ?? null,
                term: form.term,
                entryDate: form.entryDate,
                payDay: form.payDay,
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                tc: form.tc,
                birthDate: form.birthDate,
                phone: form.phone,
                address: form.address.trim(),
                provinceId: Number(form.provinceId),
                district: form.district,
                school: form.school.trim(),
                faculty: form.faculty.trim(),
                department: form.department.trim(),
                grade: form.grade,
                guardians: form.guardians.map((g) => ({ name: g.name.trim(), phone: g.phone })),
            });
            setApplicationNo(result.applicationNo);
            setStatus("done");
        } catch {
            setStatus("idle");
            setSubmitError(a.errors.submit);
        }
    };

    if (status === "done") return <SuccessScreen applicationNo={applicationNo} />;

    const price = (n) => formatPrice(n, room?.currency, locale);
    const stepProps = { form, set, err: errText, tick };
    const isLast = step === TOTAL_STEPS;

    return (
        <div className="mx-auto w-full max-w-7xl px-4 pt-28 sm:px-8 sm:pt-32 lg:px-12">
            {/* Başlık */}
            <header ref={topRef} className="mb-8 flex max-w-3xl scroll-mt-24 flex-col gap-3">
                <motion.span initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="glass-card inline-flex items-center gap-2 self-start rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orchid-pink">
                    <span className="h-2 w-2 rounded-full bg-orchid-pink animate-pulse-glow" />
                    {tpl(a.eyebrow, { period: period.name })}
                </motion.span>
                <h1 className="overflow-hidden pb-2 font-display text-5xl font-medium leading-tight tracking-tight text-orchid-dark md:text-6xl">
                    <motion.span initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.6, ease: EASE_OUT }} className="inline-block">
                        {a.title}
                    </motion.span>
                </h1>
                <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.85 }} className="max-w-2xl text-base text-orchid-muted sm:text-lg">
                    {a.intro}
                </motion.p>
            </header>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.95, ease: EASE_OUT }}>
                <Stepper labels={a.steps} current={step} maxReached={maxReached} onGo={goTo} stepOfText={tpl(a.stepOf, { current: step, total: TOTAL_STEPS })} ariaLabel={a.stepsLabel} />
            </motion.div>

            <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
                <div className="flex min-w-0 flex-col gap-6 lg:col-span-8">
                    <section className="glass-card rounded-[32px] p-5 shadow-[0_24px_60px_-20px_rgba(180,57,143,0.2)] sm:p-8">
                        <AnimatePresence mode="wait" custom={direction} initial={false}>
                            <motion.div key={step} custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.38, ease: EASE_OUT }}>
                                <h2 className="mb-6 font-display text-3xl font-medium text-orchid-dark">{a.steps[step - 1]}</h2>
                                {step === 1 && <StepRoom {...stepProps} rooms={rooms} config={config} bedRequest={bedRequest} cameFromDetail={Boolean(startRoom) && form.roomSlug === startRoom} />}
                                {step === 2 && <StepPersonal {...stepProps} />}
                                {step === 3 && <StepSchool {...stepProps} />}
                                {step === 4 && <StepGuardians {...stepProps} setForm={setForm} />}
                                {step === 5 && <StepReview {...stepProps} goTo={goTo} room={room} plan={plan} />}
                            </motion.div>
                        </AnimatePresence>
                    </section>

                    {/* Alt işlem çubuğu: mobilde ekranın altına sabit */}
                    <div data-bottom-bar className="glass-nav fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 lg:static lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
                        <AnimatePresence>
                            {submitError && (
                                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} role="alert" className="mb-2 flex items-center justify-center gap-1.5 overflow-hidden text-center text-xs font-semibold text-orchid-pink">
                                    <Icon name="error" filled className="text-[15px]" />
                                    {submitError}
                                </motion.p>
                            )}
                        </AnimatePresence>
                        <button type="button" onClick={() => setSheetOpen(true)} className="mb-2 flex w-full items-center justify-between gap-3 rounded-2xl bg-orchid-powder/70 px-4 py-2 text-left lg:hidden">
                            <span>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-orchid-muted">{a.summary.dueAtRegistration}</span>
                                <span className="font-display text-xl font-semibold text-orchid-pink">{plan ? price(plan.dueAtRegistration) : "—"}</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs font-bold text-orchid-pink">
                                {a.summary.open}
                                <Icon name="expand_less" className="text-[20px]" />
                            </span>
                        </button>

                        <div className="flex items-center justify-between gap-3">
                            {step > 1 ? (
                                <button type="button" onClick={back} disabled={status === "submitting"} className="glass-card flex h-12 items-center gap-2 rounded-full px-5 text-sm font-bold lg:h-14 lg:px-6 text-orchid-dark transition-colors hover:bg-white">
                                    <Icon name="arrow_back" className="text-[20px]" />
                                    {a.back}
                                </button>
                            ) : (
                                <span className="hidden lg:block" />
                            )}
                            <div className={`flex ${isLast ? "flex-1 justify-center lg:flex-none" : "flex-1 justify-end"}`}>
                                {isLast ? (
                                    <Magnetic>
                                        <SubmitButton submitting={status === "submitting"} label={a.submit} onClick={submit} />
                                    </Magnetic>
                                ) : (
                                    <Magnetic className="inline-flex w-full justify-end">
                                        <button type="button" onClick={next} className="aurora-btn flex h-12 w-full items-center justify-center gap-2 rounded-full px-10 text-sm font-bold text-white transition-transform active:scale-[0.97] sm:w-auto lg:h-14">
                                            {a.next}
                                            <Icon name="arrow_forward" className="text-[20px]" />
                                        </button>
                                    </Magnetic>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <SummaryCard room={room} bed={selectedBed} form={form} plan={plan} />
                </div>
            </div>

            <SummarySheet open={sheetOpen} onClose={() => setSheetOpen(false)} room={room} bed={selectedBed} form={form} plan={plan} />
            {/* mobilde sabit çubuğun altında içerik kalmasın */}
            <div aria-hidden="true" className="h-44 lg:h-24" />
        </div>
    );
}
