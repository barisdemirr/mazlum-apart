"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/portal/PageHeader";
import RequestCard from "./RequestCard";
import RequestForm from "./RequestForm";
import { STATUSES } from "@/lib/maintenance";
import { useSite } from "@/lib/site/SiteProvider";
import { interpolate } from "@/lib/i18n/dictionaries";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { SPRING_SOFT } from "@/lib/motion";

export default function MaintenanceView({ initial }) {
    const { t } = useLanguage();
    const copy = t.studentPortal.maintenance;
    const [requests, setRequests] = useState(initial);
    const [filter, setFilter] = useState("all");
    const [formOpen, setFormOpen] = useState(false);
    const [freshId, setFreshId] = useState(null);
    const [toast, setToast] = useState("");
    const site = useSite();
    const emergency = site.waHref(copy.emergencyMessage);

    const sorted = useMemo(() => [...requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [requests]);
    const shown = filter === "all" ? sorted : sorted.filter((r) => r.status === filter);
    const count = (status) => (status === "all" ? requests.length : requests.filter((r) => r.status === status).length);

    function created(request) {
        setRequests((prev) => [request, ...prev]);
        setFilter("all");
        setFreshId(request.id);
        setFormOpen(false);
        setToast(interpolate(copy.created, { no: request.no }));
        setTimeout(() => setToast(""), 5000);
    }

    return (
        <>
            <PageHeader title={t.studentPortal.nav.maintenance} text={copy.text}>
                <button type="button" onClick={() => setFormOpen(true)} className="aurora-btn flex h-12 items-center gap-2 rounded-full px-6 text-sm font-bold text-white">
                    <Icon name="add" className="text-[22px]" />
                    {copy.newRequest}
                </button>
            </PageHeader>

            <AnimatePresence>
                {toast && (
                    <motion.div role="status" initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
                        <p className="flex items-center gap-2.5 rounded-3xl bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
                            <Icon name="check_circle" filled className="text-[20px]" />
                            {toast}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {requests.length > 0 && (
                <div role="tablist" aria-label={t.studentPortal.nav.maintenance} className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto rounded-full bg-orchid-powder/70 p-1.5">
                    {["all", ...STATUSES].map((key) => {
                        const on = filter === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={on}
                                onClick={() => setFilter(key)}
                                className={`relative h-10 shrink-0 rounded-full px-4 text-sm font-bold transition-colors ${on ? "text-white" : "text-orchid-muted hover:text-orchid-dark"}`}
                            >
                                {on && <motion.span layoutId="mr-filter" transition={SPRING_SOFT} className="aurora-btn absolute inset-0 rounded-full" />}
                                <span className="relative">
                                    {copy.filters[key]} ({count(key)})
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {requests.length === 0 ? (
                <div className="glass-card flex flex-col items-center rounded-[32px] px-6 py-16 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orchid-powder text-orchid-pink">
                        <Icon name="check_circle" filled className="text-[32px]" />
                    </span>
                    <h2 className="mt-5 font-display text-2xl font-semibold text-orchid-dark">{copy.emptyTitle}</h2>
                    <p className="mt-2 max-w-sm text-sm text-orchid-muted">{copy.emptyText}</p>
                </div>
            ) : shown.length === 0 ? (
                <p className="rounded-3xl bg-orchid-powder/50 px-5 py-12 text-center text-sm text-orchid-muted">{copy.filterEmpty}</p>
            ) : (
                <ul className="flex flex-col gap-4">
                    <AnimatePresence initial={false}>
                        {shown.map((request) => (
                            <RequestCard key={request.id} request={request} fresh={request.id === freshId} />
                        ))}
                    </AnimatePresence>
                </ul>
            )}

            {emergency && (
                <div className="mt-8 flex flex-col items-start gap-3 rounded-3xl bg-orchid-lilac/50 p-5 text-sm leading-relaxed text-orchid-dark sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-start gap-2.5">
                        <Icon name="support_agent" className="mt-0.5 text-[20px] text-orchid-pink" />
                        {copy.emergency}
                    </p>
                    <a href={emergency} target="_blank" rel="noopener noreferrer" className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-orchid-pink shadow-sm hover:bg-orchid-powder">
                        {copy.emergencyButton}
                    </a>
                </div>
            )}

            <RequestForm open={formOpen} onClose={() => setFormOpen(false)} onCreated={created} />
        </>
    );
}
