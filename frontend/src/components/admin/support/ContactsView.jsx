"use client";

import Link from "next/link";
import DataTable from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui";
import { turkeyDate } from "@/lib/format";
import { CONTACT_CHANNEL, CONTACT_PURPOSE, date } from "@/lib/admin/labels";

/** Öğrencilerle yapılan WhatsApp / SMS iletişim geçmişi (kim, ne zaman, ne amaçla). */
export default function ContactsView({ items }) {
    const columns = [
        { key: "at", header: "Tarih", sort: (c) => c.at, render: (c) => <span className="ad-num">{date(turkeyDate(c.at))}</span>, export: { type: "date", value: (c) => turkeyDate(c.at) } },
        { key: "student", header: "Öğrenci", render: (c) => <Link href={`/admin/ogrenciler/${c.enrollmentId}`} className="font-bold hover:text-ad-brand" onClick={(e) => e.stopPropagation()}>{c.student.firstName} {c.student.lastName}</Link>, export: { value: (c) => `${c.student.firstName} ${c.student.lastName}` } },
        { key: "ch", header: "Kanal", render: (c) => CONTACT_CHANNEL[c.channel] ?? c.channel, export: { value: (c) => CONTACT_CHANNEL[c.channel] ?? c.channel } },
        { key: "purpose", header: "Amaç", render: (c) => CONTACT_PURPOSE[c.purpose] ?? "Diğer", export: { value: (c) => CONTACT_PURPOSE[c.purpose] ?? "Diğer" } },
        { key: "by", header: "Yapan", render: (c) => c.by ?? "—", export: { value: (c) => c.by ?? "" } },
    ];
    return (
        <div>
            <PageHeader title="İletişim Geçmişi" description="Öğrencilere gönderilen mesajlar. Hatırlatma yaparken aynı kişiye tekrar yazmaktan kaçının." />
            <DataTable columns={columns} rows={items} rowKey={(c) => c.id} searchText={(c) => `${c.student.firstName} ${c.student.lastName}`} searchPlaceholder="Öğrenci ara" exportName="iletisim-gecmisi" empty={{ icon: "chat", title: "Henüz iletişim kaydı yok" }} />
        </div>
    );
}
