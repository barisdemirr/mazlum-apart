"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import FloatingField from "@/components/apply/fields/FloatingField";
import { Checkbox } from "@/components/apply/fields/Choice";
import { formatPhone } from "@/lib/application";
import { normalizePhoneInput, safeReturnPath, validateLogin } from "@/lib/student/auth";
import { waHref } from "@/lib/constants";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT } from "@/lib/motion";

/**
 * Öğrenci giriş formu. Doğrulama istemcide yapılır, kimlik denetimi /api/student/session'da.
 * Hatalı girişte şifre alanı sallanır; demo hesabı ya da ipucu gösterilmez.
 */
export default function LoginForm({ from, expired }) {
    const { t, locale, href } = useLanguage();
    const router = useRouter();
    const copy = t.studentPortal.login;

    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [show, setShow] = useState(false);
    const [errors, setErrors] = useState({});
    const [tick, setTick] = useState(0);
    const [status, setStatus] = useState("idle"); // idle | busy | done

    const busy = status !== "idle";
    const text = (code) => (code ? copy.errors[code] : null);
    const help = waHref(copy.helpMessage);

    async function onSubmit(event) {
        event.preventDefault();
        if (busy) return;

        const found = validateLogin({ phone, password });
        if (Object.keys(found).length) {
            setErrors(found);
            setTick((n) => n + 1);
            return;
        }

        setErrors({});
        setStatus("busy");
        try {
            const res = await fetch("/api/student/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, password, remember }),
            });

            if (res.ok) {
                setStatus("done");
                router.replace(href(safeReturnPath(from)));
                router.refresh();
                return;
            }

            setErrors({ password: res.status === 401 ? "credentials" : "network" });
        } catch {
            setErrors({ password: "network" });
        }
        setStatus("idle");
        setTick((n) => n + 1);
    }

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            <AnimatePresence initial={false}>
                {expired && (
                    <motion.p
                        role="status"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden rounded-2xl bg-orchid-lilac/60 px-4 py-3 text-sm font-semibold text-orchid-violet"
                    >
                        {copy.expired}
                    </motion.p>
                )}
            </AnimatePresence>

            <FloatingField
                id="student-phone"
                name="phone"
                label={copy.phone}
                prefix="+90"
                value={formatPhone(phone)}
                onChange={(value) => {
                    setPhone(normalizePhoneInput(value));
                    if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
                }}
                error={text(errors.phone)}
                tick={tick}
                inputProps={{ inputMode: "tel", autoComplete: "tel-national", maxLength: 16, autoFocus: true }}
            />

            <FloatingField
                id="student-password"
                name="password"
                label={copy.password}
                value={password}
                onChange={(value) => {
                    setPassword(value);
                    if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
                }}
                error={text(errors.password)}
                tick={tick}
                inputProps={{ type: show ? "text" : "password", autoComplete: "current-password" }}
                trailing={
                    <button
                        type="button"
                        onClick={() => setShow((v) => !v)}
                        aria-label={show ? copy.hidePassword : copy.showPassword}
                        aria-pressed={show}
                        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full text-orchid-muted transition-colors hover:bg-orchid-powder hover:text-orchid-pink"
                    >
                        <Icon name={show ? "visibility_off" : "visibility"} className="text-[22px]" />
                    </button>
                }
            />

            <Checkbox id="student-remember" checked={remember} onChange={setRemember}>
                {copy.remember}
            </Checkbox>

            <motion.button
                type="submit"
                disabled={busy}
                whileTap={busy ? undefined : { scale: 0.97 }}
                className="aurora-btn group flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-bold text-white disabled:cursor-wait disabled:opacity-90"
            >
                <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                        key={status}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: EASE_OUT }}
                        className="flex items-center gap-2"
                    >
                        {status === "idle" && (
                            <>
                                {copy.submit}
                                <Icon name="arrow_forward" className="text-[20px] transition-transform duration-300 group-hover:translate-x-1" />
                            </>
                        )}
                        {status === "busy" && (
                            <>
                                <Icon name="progress_activity" className="animate-spin text-[20px]" />
                                {copy.submitting}
                            </>
                        )}
                        {status === "done" && (
                            <>
                                <Icon name="check_circle" filled className="text-[20px]" />
                                {copy.done}
                            </>
                        )}
                    </motion.span>
                </AnimatePresence>
            </motion.button>

            <div className="flex flex-col gap-3 rounded-3xl bg-orchid-lilac/50 p-4">
                <p className="flex items-start gap-2.5 text-sm leading-relaxed text-orchid-dark">
                    <Icon name="mark_chat_unread" className="mt-0.5 text-[20px] text-orchid-pink" />
                    <span>{copy.helpText}</span>
                </p>
                {help && (
                    <a
                        href={help}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-11 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-orchid-pink shadow-sm transition-colors hover:bg-orchid-powder"
                    >
                        <Icon name="support_agent" className="text-[19px]" />
                        {copy.helpButton}
                    </a>
                )}
            </div>
        </form>
    );
}
