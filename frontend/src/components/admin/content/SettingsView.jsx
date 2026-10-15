"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import useCommand from "@/components/admin/useCommand";
import LocalizedField, { TranslateAllButton, toLocalized } from "@/components/admin/LocalizedField";
import { Field, FormSection, TextInput } from "@/components/admin/fields";
import Icon from "@/components/ui/Icon";
import { saveSiteSettings } from "@/lib/admin/domain/config";

/** Site ayarları: iletişim bilgileri. Boş bırakılan alan sitede hiç gösterilmez. */
export default function SettingsView() {
    const { state } = useAdmin();
    const { exec, busy } = useCommand();
    const s = state.siteSettings;
    const [f, setF] = useState({ phone: s.phone, whatsapp: s.whatsapp, email: s.email, address: toLocalized(s.address), mapUrl: s.mapUrl, instagram: s.instagram, ibanHolder: s.ibanHolder, iban: s.iban });
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        await exec(saveSiteSettings, f, "Site ayarları kaydedildi.");
    };

    return (
        <form onSubmit={submit} noValidate className="space-y-5">
            <p className="max-w-2xl text-sm text-ad-muted">Boş bıraktığınız bilgi sitede gösterilmez; yani girmediğiniz hiçbir iletişim bilgisi ziyaretçiye çıkmaz.</p>
            <FormSection title="İletişim" description="Telefon ve WhatsApp 5 ile başlayan 10 haneli yazılır.">
                <Field label="Telefon"><TextInput inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="5XXXXXXXXX" /></Field>
                <Field label="WhatsApp numarası" hint="Sitedeki WhatsApp butonu bu numarayı açar."><TextInput inputMode="tel" value={f.whatsapp} onChange={set("whatsapp")} placeholder="5XXXXXXXXX" /></Field>
                <Field label="E-posta"><TextInput type="email" value={f.email} onChange={set("email")} /></Field>
                <Field label="Instagram"><TextInput value={f.instagram} onChange={set("instagram")} placeholder="https://instagram.com/…" /></Field>
                <div className="sm:col-span-2"><LocalizedField label="Adres" name="address" multiline rows={3} value={f.address} onChange={(v) => setF((x) => ({ ...x, address: v }))} /></div>
                <Field label="Harita bağlantısı" className="sm:col-span-2"><TextInput value={f.mapUrl} onChange={set("mapUrl")} placeholder="https://maps.google.com/…" /></Field>
            </FormSection>
            <FormSection title="Ödeme bilgisi" description="Havale ile ödemede öğrencinin göreceği hesap. IBAN ve hesap sahibi müşteriden teyit bekliyor.">
                <Field label="Hesap sahibi"><TextInput value={f.ibanHolder} onChange={set("ibanHolder")} /></Field>
                <Field label="IBAN"><TextInput value={f.iban} onChange={set("iban")} placeholder="TR00 0000 0000 0000 0000 0000 00" /></Field>
            </FormSection>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <TranslateAllButton fields={[{ name: "address", label: "Adres", value: f.address, set: (v) => setF((x) => ({ ...x, address: v })) }]} />
                <button type="submit" disabled={busy} className="ad-btn ad-btn-primary">{busy && <Icon name="progress_activity" className="animate-spin text-[17px]" />}Kaydet</button>
            </div>
        </form>
    );
}
