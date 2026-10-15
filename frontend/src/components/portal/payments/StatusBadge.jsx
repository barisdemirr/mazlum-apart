import Icon from "@/components/ui/Icon";

const STYLE = {
    paid: { icon: "check_circle", cls: "bg-emerald-50 text-emerald-700" },
    partial: { icon: "pie_chart", cls: "bg-orchid-lilac text-orchid-violet" },
    upcoming: { icon: "schedule", cls: "bg-orchid-powder/80 text-orchid-muted" },
    overdue: { icon: "error", cls: "bg-orchid-pink text-white" },
};

/** Kalem durumu rozeti: Ödendi · Kısmi · Bekliyor · Gecikmiş */
export default function StatusBadge({ status, label }) {
    const { icon, cls } = STYLE[status] ?? STYLE.upcoming;
    return (
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${cls}`}>
            <Icon name={icon} filled className="text-[14px]" />
            {label}
        </span>
    );
}
