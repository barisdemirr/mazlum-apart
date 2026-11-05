"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DataTable from "@/components/admin/DataTable";
import { Chips, StatusBadge } from "@/components/admin/ui";
import { SMS_MESSAGE_STATUS } from "@/lib/admin/labels";

const FORMAT = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const stamp = (iso) => (iso ? FORMAT.format(new Date(iso)) : "—");

/**
 * Otomatik gönderilen SMS'lerin kaydı (ödeme hatırlatma + "ödemeniz alındı") (sistem günlük çalışır; hangi öğrenciye, ne zaman, ne gitti).
 * Sıralama: sütun başlıklarına tıklayın (varsayılan en yeni önce). Süzme: öğrenci seçimi, durum, arama kutusu.
 */
export default function AutoSmsView({ items }) {
    const [student, setStudent] = useState("");
    const [status, setStatus] = useState("all");

    const students = useMemo(() => {
        const map = new Map();
        for (const row of items) if (row.enrollmentId && !map.has(row.enrollmentId)) map.set(row.enrollmentId, row.name);
        return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "tr"));
    }, [items]);

    const counts = useMemo(() => {
        const result = { all: items.length };
        for (const row of items) result[row.status] = (result[row.status] ?? 0) + 1;
        return result;
    }, [items]);

    const rows = useMemo(
        () => items.filter((row) => (!student || row.enrollmentId === student) && (status === "all" || row.status === status)),
        [items, student, status]
    );

    const statusChips = [
        { value: "all", label: "Tümü", count: counts.all },
        ...Object.entries(SMS_MESSAGE_STATUS)
            .filter(([key]) => counts[key])
            .map(([key, item]) => ({ value: key, label: item.label, count: counts[key] })),
    ];

    const columns = [
        { key: "at", header: "Gönderim", sort: (r) => r.at, render: (r) => <span className="ad-num whitespace-nowrap">{stamp(r.at)}</span>, export: { value: (r) => stamp(r.at) } },
        {
            key: "student",
            header: "Öğrenci",
            sort: (r) => r.name,
            render: (r) =>
                r.enrollmentId ? (
                    <Link href={`/admin/ogrenciler/${r.enrollmentId}`} className="font-bold hover:text-ad-brand">
                        {r.name}
                    </Link>
                ) : (
                    r.name
                ),
            export: { value: (r) => r.name },
        },
        { key: "phone", header: "Telefon", render: (r) => <span className="ad-num">{r.phone}</span>, export: { value: (r) => r.phone } },
        { key: "body", header: "Mesaj", render: (r) => <span className="line-clamp-2 max-w-md text-sm text-ad-body" title={r.body}>{r.body}</span>, export: { value: (r) => r.body } },
        { key: "parts", header: "Boy", align: "end", sort: (r) => r.parts, render: (r) => <span className="ad-num">{r.parts}</span>, export: { type: "number", value: (r) => r.parts } },
        { key: "status", header: "Durum", sort: (r) => SMS_MESSAGE_STATUS[r.status]?.label ?? r.status, render: (r) => <StatusBadge map={SMS_MESSAGE_STATUS} value={r.status} />, export: { value: (r) => SMS_MESSAGE_STATUS[r.status]?.label ?? r.status } },
    ];

    return (
        <div className="flex flex-col gap-4">
            <p className="max-w-3xl text-sm text-ad-muted">
                Sistemin kendiliğinden gönderdiği SMS'ler: vadesi geçen ödeme hatırlatmaları ve tahsilat girilince giden “ödemeniz alındı” mesajları.
                Hatırlatma, kısmi ödeme yapan öğrenciye ödediği oran kadar süre dolmadan gitmez; aynı öğrenciye art arda günlerde gönderilmez.
                “Ödemeniz alındı” metni Mesaj Şablonları'ndan düzenlenir.
            </p>
            <Chips items={statusChips} value={status} onChange={setStatus} />
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(r) => r.id}
                initialSort={{ key: "at", dir: "desc" }}
                searchText={(r) => `${r.name} ${r.phone} ${r.body}`}
                searchPlaceholder="Öğrenci, telefon ya da mesajda ara"
                exportName="otomatik-sms"
                filters={
                    <select
                        value={student}
                        onChange={(e) => setStudent(e.target.value)}
                        aria-label="Öğrenciye göre süz"
                        className="h-10 rounded-xl border border-ad-line-strong bg-ad-surface px-3 text-sm text-ad-body"
                    >
                        <option value="">Tüm öğrenciler</option>
                        {students.map(([id, name]) => (
                            <option key={id} value={id}>
                                {name}
                            </option>
                        ))}
                    </select>
                }
                empty={{ icon: "schedule_send", title: "Henüz otomatik SMS gönderilmedi", description: "Vadesi geçen ödeme olduğunda sistem günlük görevinde SMS gönderir ve burada listelenir." }}
            />
        </div>
    );
}
