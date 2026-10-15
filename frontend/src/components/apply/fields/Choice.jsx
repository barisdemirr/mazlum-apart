"use client";

import { useEffect, useId } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import Icon from "@/components/ui/Icon";
import { SPRING_BOUNCY, SPRING_SOFT } from "@/lib/motion";

/** Kendini çizen onay işareti (daire + tik) */
export function DrawnCheck({ size = 24, className = "" }) {
    return (
        <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={SPRING_BOUNCY}
            className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-orchid-pink to-orchid-violet text-white shadow-[0_4px_12px_rgba(180,57,143,0.4)] ${className}`}
            style={{ width: size, height: size }}
        >
            <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <motion.path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
                />
            </svg>
        </motion.span>
    );
}

/** Hatalı alan için hafif sallanma: errorTick her "Devam" denemesinde artar */
export function useShake(error, tick) {
    const controls = useAnimationControls();
    useEffect(() => {
        if (error && tick) controls.start({ x: [0, -9, 9, -6, 6, -3, 0], transition: { duration: 0.45 } });
        // yalnızca yeni bir deneme olduğunda sallanır
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick]);
    return controls;
}

/** Hata metni: aşağı kayarak açılır */
export function FieldError({ id, message }) {
    return (
        <AnimatePresence initial={false}>
            {message && (
                <motion.div
                    key="error"
                    id={id}
                    role="alert"
                    initial={{ height: 0, opacity: 0, y: -6 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                >
                    <span className="flex items-start gap-1.5 px-1 pt-1.5 text-xs font-semibold text-orchid-pink">
                        <Icon name="error" filled className="mt-px text-[15px]" />
                        {message}
                    </span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/** Alan grubu başlığı (kart ve segment seçiciler için), zorunlu alanlarda pembe yıldız */
export function GroupLabel({ children, required, id }) {
    return (
        <span id={id} className="flex items-center gap-1 text-sm font-bold text-orchid-dark">
            {children}
            {required && <span className="text-orchid-pink">*</span>}
        </span>
    );
}

/**
 * Seçim kartı: seçilince yaylanarak büyür, kenarında aurora çerçeve döner, köşede onay ikonu kendini çizer.
 * Kilitli (disabled) hâli soluktur ve küçük bir not gösterir.
 */
export function SelectionCard({ selected, disabled, onClick, children, className = "", note, label }) {
    return (
        <motion.button
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            onClick={onClick}
            animate={{ scale: selected ? 1.025 : 1 }}
            whileTap={disabled ? undefined : { scale: 0.975 }}
            transition={SPRING_BOUNCY}
            className={`group relative isolate rounded-3xl text-left outline-none focus-visible:ring-2 focus-visible:ring-orchid-pink focus-visible:ring-offset-2 focus-visible:ring-offset-orchid-white ${
                disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"
            } ${className}`}
        >
            {/* dönen aurora çerçeve */}
            <AnimatePresence initial={false}>
                {selected && (
                    <motion.span
                        key="frame"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-[2.5px] -z-20 overflow-hidden rounded-[inherit]"
                    >
                        <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
                            className="absolute left-1/2 top-1/2 aspect-square w-[220%] -translate-x-1/2 -translate-y-1/2"
                            style={{ background: "conic-gradient(from 0deg, #f59ac4, #b4398f, #7b46c7, #f59ac4)" }}
                        />
                    </motion.span>
                )}
            </AnimatePresence>
            <span
                className={`absolute inset-0 -z-10 rounded-[inherit] border transition-colors duration-300 ${
                    selected
                        ? "border-transparent bg-orchid-white shadow-[0_16px_40px_-12px_rgba(180,57,143,0.35)]"
                        : "glass-card group-hover:border-orchid-petal/70 group-hover:bg-white/80"
                }`}
            />
            <span className="absolute right-4 top-4 z-10">
                <AnimatePresence initial={false} mode="wait">
                    {selected ? (
                        <DrawnCheck key="on" size={26} />
                    ) : (
                        <motion.span key="off" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="block h-[26px] w-[26px] rounded-full border-2 border-orchid-petal bg-white/70" />
                    )}
                </AnimatePresence>
            </span>
            {children}
            {note && (
                <span className="absolute bottom-3 right-4 rounded-full bg-orchid-powder px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orchid-muted">{note}</span>
            )}
        </motion.button>
    );
}

/** Kayan aktif hap'lı segment seçici */
export function Segmented({ options, value, onChange, ariaLabelledBy, invalid }) {
    const pillId = useId();
    return (
        <div
            role="radiogroup"
            aria-labelledby={ariaLabelledBy}
            className={`inline-flex max-w-full flex-wrap gap-1 rounded-[26px] bg-orchid-powder/70 p-1.5 transition-shadow ${invalid ? "ring-2 ring-orchid-pink/60" : ""}`}
        >
            {options.map((option) => {
                const on = option.id === value;
                return (
                    <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(option.id)}
                        className={`relative h-11 min-w-[3rem] rounded-full px-4 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-orchid-pink ${
                            on ? "text-white" : "text-orchid-muted hover:text-orchid-dark"
                        }`}
                    >
                        {on && (
                            <motion.span layoutId={`seg-${pillId}`} transition={SPRING_SOFT} className="aurora-btn absolute inset-0 rounded-full" />
                        )}
                        <span className="relative">{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

/** Özel onay kutusu: işaretlenince onay ikonu kendini çizer */
export function Checkbox({ checked, onChange, children, invalid, id }) {
    return (
        <label
            htmlFor={id}
            className={`flex cursor-pointer items-start gap-3 rounded-3xl border p-4 transition-colors ${
                invalid ? "border-orchid-pink bg-orchid-powder/60" : checked ? "border-orchid-petal/60 bg-orchid-powder/40" : "border-orchid-petal/30 bg-white/60 hover:bg-white/80"
            }`}
        >
            <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border-2 border-orchid-petal/60 bg-white transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-orchid-pink peer-focus-visible:ring-offset-2">
                <AnimatePresence initial={false}>{checked && <DrawnCheck key="c" size={28} className="!rounded-xl" />}</AnimatePresence>
            </span>
            <span className="text-sm leading-relaxed text-orchid-dark">{children}</span>
        </label>
    );
}
