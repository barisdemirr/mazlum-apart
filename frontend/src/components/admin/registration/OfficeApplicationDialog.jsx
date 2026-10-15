"use client";

import { useState } from "react";
import FormDialog from "@/components/admin/FormDialog";
import { DateInput, Field, SelectInput, TextInput } from "@/components/admin/fields";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import useCommand from "@/components/admin/useCommand";
import { createApplication } from "@/lib/admin/domain/registration";
import { isValidPhone, isValidTc, onlyDigits } from "@/lib/application";
import { PAY_WINDOW, money } from "@/lib/admin/labels";

export const GRADE_LABELS = { prep: "Hazırlık", 1: "1. sınıf", 2: "2. sınıf", 3: "3. sınıf", 4: "4. sınıf", 5: "5. sınıf", 6: "6. sınıf" };

const empty = () => ({
    tc: "", firstName: "", lastName: "", phone: "", school: "", department: "", grade: "1",
    guardianName: "", guardianRelation: "Anne", guardianPhone: "",
    roomTypeId: "", entryDate: "", payWindow: "early",
});

/**
 * Ofiste alınan kayıt: web başvurusuyla AYNI akışa girer (önce başvuru olur, sonra onaylanır).
 * Alan doğrulamaları sitedeki başvuru formuyla aynıdır (T.C. sağlama algoritması, telefon).
 */
export default function OfficeApplicationDialog({ open, onClose, onCreated }) {
    const { state, period } = useAdmin();
    const { exec, busy } = useCommand();
    const [form, setForm] = useState(empty);
    const [errors, setErrors] = useState({});

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    const prices = state.roomTypePrices.filter((p) => p.periodId === period.id);

    const validate = () => {
        const e = {};
        if (!isValidTc(form.tc)) e.tc = "Geçerli bir T.C. kimlik no girin.";
        if (!form.firstName.trim()) e.firstName = "Ad zorunlu.";
        if (!form.lastName.trim()) e.lastName = "Soyad zorunlu.";
        if (!isValidPhone(form.phone)) e.phone = "5 ile başlayan 10 haneli numara girin.";
        if (!form.guardianName.trim()) e.guardianName = "Veli adı zorunlu.";
        if (!isValidPhone(form.guardianPhone)) e.guardianPhone = "5 ile başlayan 10 haneli numara girin.";
        if (!form.roomTypeId) e.roomTypeId = "Oda tipini seçin.";
        if (!form.entryDate) e.entryDate = "Giriş tarihini seçin.";
        return e;
    };

    const submit = async (ev) => {
        ev.preventDefault();
        const found = validate();
        setErrors(found);
        if (Object.keys(found).length) return;

        const out = await exec(
            createApplication,
            {
                periodId: period.id,
                source: "office",
                student: {
                    tc: form.tc, firstName: form.firstName, lastName: form.lastName, phone: form.phone,
                    school: form.school, department: form.department, grade: form.grade,
                    guardians: [{ name: form.guardianName.trim(), relation: form.guardianRelation, phone: form.guardianPhone }],
                },
                roomTypeId: form.roomTypeId, entryDate: form.entryDate, payWindow: form.payWindow,
            },
            "Başvuru kaydedildi. Onaylamak için listeden açın."
        );
        if (out.ok) {
            setForm(empty());
            onCreated?.(out.result);
            onClose();
        }
    };

    return (
        <FormDialog
            open={open}
            title="Ofis kaydı"
            description={`${period.name} dönemine başvuru ekleyin. Kaydet'ten sonra başvuruyu inceleyip onaylarsınız.`}
            onClose={onClose}
            onSubmit={submit}
            busy={busy}
            saveLabel="Başvuruyu kaydet"
            size="lg"
        >
            <Field label="T.C. kimlik no" required error={errors.tc}>
                <TextInput inputMode="numeric" dir="ltr" value={form.tc} error={errors.tc} onChange={(e) => setForm((f) => ({ ...f, tc: onlyDigits(e.target.value, 11) }))} />
            </Field>
            <Field label="Telefon" required error={errors.phone} hint="Öğrenci alanına giriş telefonuyla yapılır.">
                <TextInput inputMode="numeric" dir="ltr" placeholder="5XXXXXXXXX" value={form.phone} error={errors.phone} onChange={(e) => setForm((f) => ({ ...f, phone: onlyDigits(e.target.value, 10) }))} />
            </Field>
            <Field label="Ad" required error={errors.firstName}><TextInput value={form.firstName} error={errors.firstName} onChange={set("firstName")} /></Field>
            <Field label="Soyad" required error={errors.lastName}><TextInput value={form.lastName} error={errors.lastName} onChange={set("lastName")} /></Field>
            <Field label="Okul"><TextInput value={form.school} onChange={set("school")} /></Field>
            <Field label="Bölüm"><TextInput value={form.department} onChange={set("department")} /></Field>
            <Field label="Sınıf">
                <SelectInput value={form.grade} onChange={set("grade")}>
                    {Object.entries(GRADE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </SelectInput>
            </Field>
            <span className="hidden sm:block" />

            <Field label="Veli adı soyadı" required error={errors.guardianName}><TextInput value={form.guardianName} error={errors.guardianName} onChange={set("guardianName")} /></Field>
            <Field label="Veli telefonu" required error={errors.guardianPhone}>
                <TextInput inputMode="numeric" dir="ltr" placeholder="5XXXXXXXXX" value={form.guardianPhone} error={errors.guardianPhone} onChange={(e) => setForm((f) => ({ ...f, guardianPhone: onlyDigits(e.target.value, 10) }))} />
            </Field>

            <Field label="Oda tipi" required error={errors.roomTypeId}>
                <SelectInput value={form.roomTypeId} error={errors.roomTypeId} onChange={set("roomTypeId")}>
                    <option value="">Seçin</option>
                    {state.roomTypes.map((r) => {
                        const price = prices.find((p) => p.roomTypeId === r.id);
                        return <option key={r.id} value={r.id} disabled={!price}>{r.name.tr}{price ? ` · ${money(price.monthly)}/ay` : " · fiyat tanımlı değil"}</option>;
                    })}
                </SelectInput>
            </Field>
            <Field label="Giriş tarihi" required error={errors.entryDate}>
                <DateInput value={form.entryDate} min={period.start} max={period.end} error={errors.entryDate} onChange={set("entryDate")} />
            </Field>
            <Field label="Ödeme penceresi" hint="Sonraki aylarda kira bu günlerde ödenir.">
                <SelectInput value={form.payWindow} onChange={set("payWindow")}>
                    {Object.entries(PAY_WINDOW).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </SelectInput>
            </Field>
        </FormDialog>
    );
}
