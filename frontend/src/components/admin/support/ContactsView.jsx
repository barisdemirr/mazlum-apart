"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import DataTable from "@/components/admin/DataTable";
import { Avatar, PageHeader } from "@/components/admin/ui";
import { SelectInput } from "@/components/admin/fields";
import DateRange, { inRange } from "@/components/admin/accounting/DateRange";
import { CONTACT_PURPOSE } from "@/lib/admin/labels";

const stamp = (iso) => new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** WhatsApp butonlarıyla yapılan her iletişim burada kayıtlıdır. “Açıldı” kaydıdır; mesajın gönderildiğini garanti etmez. */
export default function ContactsView() {
    const router = useRouter();
    const { state, period } = useAdmin();
    const [purpose, setPurpose] = useState("");
    const [range, setRange] = useState({ from: "", to: "" });

    const rows = useMemo(
        () => state.contacts.filter((c) => c.periodId === period.id).map((c) => {
            const enrollment = state.enrollments.find((e) => e.id === c.enrollmentId);
            return { c, enrollment, student: state.students.find((s) => s.id === enrollment?.studentId) };
        }).filter(({ c }) => (!purpose || c.purpose === purpose) && inRange(c.at.slice(0, 10), range)),
        [state, period.id, purpose, range]
    );

    const columns = [
        { key: "at", header: "Zaman", sort: ({ c }) => c.at, render: ({ c }) => <span className="ad-num whitespace-nowrap">{stamp(c.at)}</span>, export: { value: ({ c }) => stamp(c.at), width: 18 } },
        { key: "student", header: "Öğrenci", sort: ({ student }) => student?.lastName, render: ({ student }) => student ? <div className="flex items-center gap-2.5"><Avatar name={`${student.firstName} ${student.lastName}`} /><span className="font-bold">{student.firstName} {student.lastName}</span></div> : "—", export: { value: ({ student }) => student ? `${student.firstName} ${student.lastName}` : "", width: 24 } },
        { key: "purpose", header: "Amaç", render: ({ c }) => CONTACT_PURPOSE[c.purpose] ?? "Diğer", export: { value: ({ c }) => CONTACT_PURPOSE[c.purpose] ?? "Diğer" } },
        { key: "channel", header: "Kanal", render: ({ c }) => c.channel === "whatsapp" ? "WhatsApp" : c.channel, export: { value: ({ c }) => (c.channel === "whatsapp" ? "WhatsApp" : c.channel) } },
        { key: "by", header: "Yapan", render: ({ c }) => c.by, export: { value: ({ c }) => c.by } },
    ];

    return (
        <div>
            <PageHeader title="İletişim Geçmişi" description="Öğrencilerle kime, ne zaman, hangi amaçla ulaşıldığı. Liste ve ana paneldeki “son iletişim” bilgisi buradan gelir." />
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={({ c }) => c.id}
                searchText={({ student }) => `${student?.firstName} ${student?.lastName}`}
                searchPlaceholder="Öğrenci ara"
                filters={<><div className="w-full sm:w-52"><SelectInput value={purpose} onChange={(e) => setPurpose(e.target.value)}><option value="">Tüm amaçlar</option>{Object.entries(CONTACT_PURPOSE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</SelectInput></div><DateRange {...range} onChange={setRange} /></>}
                onRowClick={({ enrollment }) => enrollment && router.push(`/admin/ogrenciler/${enrollment.id}`)}
                initialSort={{ key: "at", dir: "desc" }}
                exportName="iletisim-gecmisi"
                empty={{ icon: "forum", title: "İletişim kaydı yok", description: "WhatsApp butonlarıyla yapılan iletişimler burada listelenir." }}
            />
        </div>
    );
}
