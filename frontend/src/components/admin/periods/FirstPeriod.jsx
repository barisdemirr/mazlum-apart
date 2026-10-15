"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";
import useCommand from "@/components/admin/useCommand";
import { Card, PageHeader } from "@/components/admin/ui";
import { DateInput, Field, SelectInput, TextInput } from "@/components/admin/fields";
import { createPeriod } from "@/lib/admin/commands/periods";
import { writePeriodCookie } from "@/lib/admin/client";
import { useRouter } from "next/navigation";

/** Sistemde hiç dönem yokken (ilk kurulum) gösterilir: panel ancak bir dönemle çalışır. */
export default function FirstPeriod() {
    const router = useRouter();
    const { exec, busy } = useCommand();
    const year = new Date().getFullYear();
    const [f, setF] = useState({ type: "academic", name: `${year}–${year + 1} Akademik`, start: `${year}-09-01`, end: `${year + 1}-06-30`, copyFromPeriodId: "" });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        const out = await exec(createPeriod, f, "İlk dönem oluşturuldu.", { refresh: false });
        if (out.ok) {
            writePeriodCookie(out.result.id);
            router.refresh();
        }
    };

    return (
        <div>
            <PageHeader title="İlk dönemi başlatın" description="Panel, bir çalışma dönemiyle çalışır: kayıtlar, muhasebe ve doluluk dönem bazlıdır. Önce dönemi oluşturun; fiyatları ve daireleri sonra girersiniz." />
            <form onSubmit={submit} noValidate>
                <Card>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Tip" required><SelectInput value={f.type} onChange={set("type")}><option value="academic">Akademik dönem</option><option value="summer">Yaz dönemi</option></SelectInput></Field>
                        <Field label="Dönem adı" required><TextInput value={f.name} onChange={set("name")} /></Field>
                        <Field label="Başlangıç" required><DateInput value={f.start} onChange={set("start")} /></Field>
                        <Field label="Bitiş" required><DateInput value={f.end} onChange={set("end")} /></Field>
                    </div>
                    <div className="mt-5 flex justify-end">
                        <button type="submit" disabled={busy} className="ad-btn ad-btn-primary">
                            {busy ? <Icon name="progress_activity" className="animate-spin text-[18px]" /> : <Icon name="rocket_launch" className="text-[20px]" />}Dönemi başlat
                        </button>
                    </div>
                </Card>
            </form>
        </div>
    );
}
