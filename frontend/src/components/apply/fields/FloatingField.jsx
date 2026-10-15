"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { FieldError, useShake } from "./Choice";

/**
 * Yüzen etiketli giriş alanı.
 * - Odaklanınca/dolunca etiket yukarı süzülür, çevresinde pembe ışıltılı halka belirir.
 * - Hatada hafifçe sallanır; hata metni aşağı kayarak açılır. Hata tonu kırmızı değil gül pembesidir.
 * - prefix: sabit önek (örn. "+90"); trailing: sağ taraftaki ikon/düğme alanı.
 */
const FloatingField = forwardRef(function FloatingField(
    { id, name, label, value, onChange, error, required, multiline, rows = 3, prefix, trailing, tick, inputProps = {}, className = "" },
    ref
) {
    const controls = useShake(error, tick);
    const Tag = multiline ? "textarea" : "input";
    const errorId = `${id}-error`;

    const floated = multiline ? "peer-focus:top-[17px] peer-[:not(:placeholder-shown)]:top-[17px]" : "peer-focus:top-[17px] peer-[:not(:placeholder-shown)]:top-[17px]";

    return (
        <motion.div animate={controls} data-field={name} className={className}>
            <div className="group relative">
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-1 rounded-[26px] bg-gradient-to-r from-orchid-petal/70 via-orchid-pink/40 to-orchid-violet/50 opacity-0 blur-md transition-opacity duration-300 group-focus-within:opacity-100"
                />
                <div
                    className={`relative flex rounded-[22px] border transition-colors duration-200 ${
                        error ? "border-orchid-pink bg-orchid-powder/60" : "border-orchid-petal/40 bg-orchid-white group-focus-within:border-orchid-pink"
                    }`}
                >
                    {prefix && <span className="flex select-none items-center pl-4 pr-0.5 pt-[18px] text-base font-bold text-orchid-muted">{prefix}</span>}
                    <div className="relative min-w-0 flex-1">
                        <Tag
                            ref={ref}
                            id={id}
                            name={name}
                            value={value}
                            placeholder=" "
                            rows={multiline ? rows : undefined}
                            onChange={(e) => onChange?.(e.target.value)}
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? errorId : undefined}
                            aria-required={required || undefined}
                            className={`peer w-full min-w-0 rounded-[22px] bg-transparent px-4 pb-1.5 pt-6 text-base text-orchid-dark outline-none placeholder-transparent ${
                                multiline ? "min-h-[116px] resize-none pt-7 leading-relaxed" : "h-14"
                            } ${trailing ? "pr-12" : ""}`}
                            {...inputProps}
                        />
                        <label
                            htmlFor={id}
                            className={`pointer-events-none absolute left-4 origin-left -translate-y-1/2 select-none text-base text-orchid-muted transition-all duration-200 peer-focus:scale-[0.78] peer-focus:text-orchid-pink peer-[:not(:placeholder-shown)]:scale-[0.78] ${
                                multiline ? "top-7" : "top-1/2"
                            } ${floated}`}
                        >
                            {label}
                            {required && <span className="ml-0.5 text-orchid-pink">*</span>}
                        </label>
                        {trailing && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>}
                    </div>
                </div>
            </div>
            <FieldError id={errorId} message={error} />
        </motion.div>
    );
});

export default FloatingField;
