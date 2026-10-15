"use client";

import { usePathname } from "next/navigation";
import { LinkTabs } from "@/components/admin/ui";

/** Alt sayfalı bölümlerde (İçerik, Sistem) üstteki sekmeler; aktif sekme adresten bulunur */
export default function SectionTabs({ tabs }) {
    const pathname = usePathname();
    const current = [...tabs].sort((a, b) => b.href.length - a.href.length).find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.href;
    return <LinkTabs tabs={tabs} current={current} />;
}
