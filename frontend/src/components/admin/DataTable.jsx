"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import ExportButton from "./ExportButton";
import { EmptyState, SearchInput } from "./ui";

const PAGE_SIZE = 15;

/**
 * Standart liste tablosu: arama, sıralama, sayfalama, Excel'e aktar (plan 8).
 *
 * columns: [{
 *   key, header, render?(row), align?: "end", sort?(row) -> değer, className?,
 *   export?: { type: "text"|"number"|"money"|"date", value(row) }   // Excel sütunu; yoksa dışa aktarılmaz
 * }]
 * searchText(row) verilirse arama kutusu çıkar. `filters` arama kutusunun yanına konur.
 * Dışa aktarma, ekrandaki FİLTRELENMİŞ satırları (tüm sayfalar) indirir.
 */
export default function DataTable({
    columns,
    rows,
    rowKey,
    searchText,
    searchPlaceholder,
    filters,
    toolbar,
    onRowClick,
    exportName,
    empty = { title: "Kayıt bulunamadı", description: "Arama ya da filtreleri değiştirmeyi deneyin." },
    pageSize = PAGE_SIZE,
    initialSort,
    footer,
}) {
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState(initialSort ?? null); // { key, dir }
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        if (!searchText || !query.trim()) return rows;
        const q = query.trim().toLocaleLowerCase("tr");
        return rows.filter((r) => searchText(r).toLocaleLowerCase("tr").includes(q));
    }, [rows, query, searchText]);

    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const col = columns.find((c) => c.key === sort.key);
        if (!col?.sort) return filtered;
        const dir = sort.dir === "desc" ? -1 : 1;
        return [...filtered].sort((a, b) => {
            const x = col.sort(a);
            const y = col.sort(b);
            if (x === y) return 0;
            if (x == null) return 1;
            if (y == null) return -1;
            return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "tr")) * dir;
        });
    }, [filtered, sort, columns]);

    const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const current = Math.min(page, pages - 1);
    const visible = sorted.slice(current * pageSize, current * pageSize + pageSize);

    const toggleSort = (col) => {
        if (!col.sort) return;
        setSort((s) => (s?.key === col.key ? (s.dir === "asc" ? { key: col.key, dir: "desc" } : null) : { key: col.key, dir: "asc" }));
        setPage(0);
    };

    return (
        <div className="ad-card overflow-hidden">
            {(searchText || filters || exportName || toolbar) && (
                <div className="flex flex-col gap-3 border-b border-ad-line p-4 sm:flex-row sm:flex-wrap sm:items-center">
                    {searchText && (
                        <SearchInput
                            value={query}
                            onChange={(v) => {
                                setQuery(v);
                                setPage(0);
                            }}
                            placeholder={searchPlaceholder}
                        />
                    )}
                    {filters}
                    <div className="flex items-center gap-2 sm:ms-auto">
                        {toolbar}
                        {exportName && <ExportButton name={exportName} columns={columns} rows={sorted} />}
                    </div>
                </div>
            )}

            {sorted.length === 0 ? (
                <EmptyState icon="search_off" {...empty} />
            ) : (
                <div className="ad-scroll overflow-x-auto">
                    <table className="ad-table">
                        <thead>
                            <tr>
                                {columns.map((col) => (
                                    <th key={col.key} className={col.align === "end" ? "!text-end" : ""} aria-sort={sort?.key === col.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                                        {col.sort ? (
                                            <button type="button" onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 uppercase tracking-[0.06em] hover:text-ad-ink">
                                                {col.header}
                                                <Icon name={sort?.key === col.key ? (sort.dir === "asc" ? "arrow_upward" : "arrow_downward") : "unfold_more"} className="text-[14px]" />
                                            </button>
                                        ) : (
                                            col.header
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((row) => (
                                <tr
                                    key={rowKey(row)}
                                    data-click={onRowClick ? "1" : undefined}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key} className={`${col.align === "end" ? "text-end" : ""} ${col.className ?? ""}`}>
                                            {col.render ? col.render(row) : (row[col.key] ?? "")}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ad-line px-4 py-3 text-xs text-ad-muted">
                <span>
                    {sorted.length === rows.length ? `${rows.length} kayıt` : `${sorted.length} / ${rows.length} kayıt`}
                </span>
                {footer}
                {pages > 1 && (
                    <div className="flex items-center gap-1">
                        <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Önceki sayfa" className="ad-btn ad-btn-outline ad-btn-icon !h-8 !w-8 disabled:opacity-40">
                            <Icon name="chevron_left" className="text-[18px]" />
                        </button>
                        <span className="px-2 font-semibold text-ad-body">
                            {current + 1} / {pages}
                        </span>
                        <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Sonraki sayfa" className="ad-btn ad-btn-outline ad-btn-icon !h-8 !w-8 disabled:opacity-40">
                            <Icon name="chevron_right" className="text-[18px]" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
