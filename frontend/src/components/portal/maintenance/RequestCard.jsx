"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import { AREAS } from "@/lib/maintenance";
import { formatDateTime } from "@/lib/student/labels";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EASE_OUT } from "@/lib/motion";

const TONE = {
    received: "bg-orchid-powder text-orchid-pink",
    in_progress: "bg-orchid-lilac text-orchid-violet",
    done: "bg-emerald-50 text-emerald-700",
};
const STATUS_ICON = { received: "inbox", in_progress: "construction", done: "check_circle" };

export default function RequestCard({ request, fresh = false }) {
    const { t } = useLanguage();
    const copy = t.studentPortal.maintenance;
    const [open, setOpen] = useState(fresh);
    const area = AREAS.find((a) => a.id === request.area);

    return (
        <motion.li
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className={`rounded-[28px] border bg-white/70 p-5 ${fresh ? "border-orchid-pink shadow-[0_18px_44px_-24px_rgba(180,57,143,0.6)]" : "border-orchid-petal/30"}`}
        >
            <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orchid-lilac text-orchid-violet">
                    <Icon name={area?.icon ?? "build"} className="text-[24px]" />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold text-orchid-muted">
                            {copy.areas[request.area]} · #{request.no}
                        </p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${TONE[request.status]}`}>
                            <Icon name={STATUS_ICON[request.status]} filled className="text-[14px]" />
                            {copy.status[request.status]}
                        </span>
                    </div>
                    <h3 className="mt-1.5 font-display text-lg font-semibold text-orchid-dark">{request.title}</h3>
                    <p className={`mt-1 text-sm leading-relaxed text-orchid-muted ${open ? "" : "line-clamp-2"}`}>{request.description}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-orchid-muted">
                        <span className="flex items-center gap-3">
                            <span>{formatDateTime(request.createdAt)}</span>
                            {request.photoCount > 0 && (
                                <span className="flex items-center gap-1">
                                    <Icon name="image" className="text-[15px]" />
                                    {interpolate(copy.photos, { count: request.photoCount })}
                                </span>
                            )}
                        </span>
                        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex items-center gap-1 font-bold text-orchid-pink hover:underline">
                            {open ? copy.hideDetails : copy.details}
                            <Icon name={open ? "expand_less" : "expand_more"} className="text-[18px]" />
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }} className="overflow-hidden">
                        <div className="mt-4 rounded-3xl bg-orchid-powder/50 p-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-orchid-pink">{copy.timeline}</p>
                            <ol className="relative flex flex-col gap-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-orchid-petal/50">
                                {[...request.events].reverse().map((event, i) => (
                                    <li key={`${event.at}-${event.status}`} className="relative pl-7">
                                        <span className={`absolute left-0 top-1 h-[15px] w-[15px] rounded-full border-2 ${i === 0 ? "border-orchid-pink bg-orchid-pink" : "border-orchid-petal bg-white"}`} />
                                        <p className="text-sm font-bold text-orchid-dark">{copy.events[event.status]}</p>
                                        <p className="text-xs text-orchid-muted">{formatDateTime(event.at)}</p>
                                        {event.note && <p className="mt-1 text-xs leading-relaxed text-orchid-dark">{event.note}</p>}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.li>
    );
}
