"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import FormDialog from "@/components/admin/FormDialog";
import { DateInput, Field, SelectInput, TextInput } from "@/components/admin/fields";
import { useAdmin } from "@/components/admin/data/AdminDataProvider";
import useCommand from "@/components/admin/useCommand";
import { createApplication } from "@/lib/admin/domain/registration";
import { GRADES, isValidPhone, isValidTc, newGuardian, onlyDigits } from "@/lib/application";
import { getDistricts, getProvinces } from "@/lib/locations";
import { PAY_WINDOW, TERM, money } from "@/lib/admin/labels";

export const GRADE_LABELS = { prep: "Hazırlık", 1: "1. sınıf", 2: "2. sınıf", 3: "3. sınıf", 4: "4. sınıf", 5: "5. sınıf", 6: "6. sınıf" };

const empty = () => ({
    firstName: "", lastName: "", tc: "", birthDate: "", phone: "",
    address: "", provinceId: "", district: "",
    school: "", faculty: "", department: "", grade: "",
    guardians: [newGuardian()],
    roomTypeId: "", term: "full", entryDate: "", payWindow: "early",
});

/**
 * Ofiste alınan kayıt: web başvurusuyla AYNI form alanları ve AYNI akış (önce başvuru olur, sonra onaylanır).
 * Alanlar müşterinin kayıt formu listesidir: ad, soyad, T.C., doğum tarihi, ikamet adresi, il, ilçe, okul, fakülte,
 * bölüm, sınıf, veli bilgileri (en az 1), oda tipi, giriş tarihi, ödeme günü; yarım dönem açıksa kayıt süresi.
 */
export default function OfficeApplicationDialog({ open, onClose, onCreated }) {
    const { state, period, today } = useAdmin();
    const { exec, busy } = useCommand();
    const [form, setForm] = useState(empty);
    const [errors, setErrors] = useState({});

    const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
    const prices = state.roomTypePrices.filter((p) => p.periodId === period.id);
    const provinces = useMemo(() => getProvinces().slice().sort((a, b) => a.name.localeCompare(b.name, "tr")), []);
    const districts = useMemo(() => getDistricts(form.provinceId), [form.provinceId]);

    // Yarım dönem yalnızca dönem ayarından açıldıysa seçilebilir
    const half = period.halfTerm;
    const halfOpen = Boolean(half?.enabled && half.firstEnd && half.secondStart);
    const range = form.term === "first" ? { start: period.start, end: half?.firstEnd ?? period.end } : form.term === "second" ? { start: half?.secondStart ?? period.start, end: period.end } : { start: period.start, end: period.end };

    const setGuardian = (id, field, value) => setForm((f) => ({ ...f, guardians: f.guardians.map((g) => (g.id === id ? { ...g, [field]: value } : g)) }));

    const validate = () => {
        const e = {};
        if (!isValidTc(form.tc)) e.tc = "Geçerli bir T.C. kimlik no girin.";
        if (!form.firstName.trim()) e.firstName = "Ad zorunlu.";
        if (!form.lastName.trim()) e.lastName = "Soyad zorunlu.";
        if (!form.birthDate || form.birthDate >= today || form.birthDate < "1940-01-01") e.birthDate = "Doğum tarihini girin.";
        if (!isValidPhone(form.phone)) e.phone = "5 ile başlayan 10 haneli numara girin.";
        if (form.address.trim().length < 10) e.address = "İkamet adresini ayrıntılı yazın.";
        if (!form.provinceId) e.provinceId = "İl seçin.";
        if (!form.district) e.district = "İlçe seçin.";
        if (!form.school.trim()) e.school = "Okul zorunlu.";
        if (!form.faculty.trim()) e.faculty = "Fakülte zorunlu.";
        if (!form.department.trim()) e.department = "Bölüm zorunlu.";
        if (!form.grade) e.grade = "Sınıf seçin.";
        form.guardians.forEach((g, i) => {
            if (!g.name.trim()) e[`g-${g.id}-name`] = "Veli adı soyadı zorunlu.";
            if (!isValidPhone(g.phone)) e[`g-${g.id}-phone`] = "5 ile başlayan 10 haneli numara girin.";
            void i;
        });
        if (!form.roomTypeId) e.roomTypeId = "Oda tipini seçin.";
        if (!form.entryDate) e.entryDate = "Giriş tarihini seçin.";
        else if (form.entryDate < range.start || form.entryDate > range.end) e.entryDate = "Giriş tarihi seçilen sürenin tarihleri içinde olmalı.";
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
                    firstName: form.firstName, lastName: form.lastName, tc: form.tc, birthDate: form.birthDate, phone: form.phone,
                    address: form.address, provinceId: form.provinceId, district: form.district,
                    school: form.school, faculty: form.faculty, department: form.department, grade: form.grade,
                    guardians: form.guardians.map(({ name, phone }) => ({ name, phone })),
                },
                roomTypeId: form.roomTypeId, term: form.term, entryDate: form.entryDate, payWindow: form.payWindow,
            },
            "Başvuru kaydedildi. Onaylamak için listeden açın."
        );
        if (out.ok) {
            setForm(empty());
            setErrors({});
            onCreated?.(out.result);
            onClose();
        }
    };

    const phoneInput = (value, onChange, error) => (
        <TextInput inputMode="numeric" dir="ltr" placeholder="5XXXXXXXXX" value={value} error={error} onChange={(e) => onChange(onlyDigits(e.target.value, 10))} />
    );

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
            <Field label="Ad" required error={errors.firstName}><TextInput value={form.firstName} error={errors.firstName} onChange={set("firstName")} /></Field>
            <Field label="Soyad" required error={errors.lastName}><TextInput value={form.lastName} error={errors.lastName} onChange={set("lastName")} /></Field>
            <Field label="T.C. kimlik no" required error={errors.tc}>
                <TextInput inputMode="numeric" dir="ltr" value={form.tc} error={errors.tc} onChange={(e) => setForm((f) => ({ ...f, tc: onlyDigits(e.target.value, 11) }))} />
            </Field>
            <Field label="Doğum tarihi" required error={errors.birthDate}>
                <DateInput value={form.birthDate} min="1940-01-01" max={today} error={errors.birthDate} onChange={set("birthDate")} />
            </Field>
            <Field label="Telefon" required error={errors.phone} hint="Öğrenci alanına giriş telefonuyla yapılır." className="sm:col-span-2">
                {phoneInput(form.phone, (v) => setForm((f) => ({ ...f, phone: v })), errors.phone)}
            </Field>

            <Field label="İkamet adresi" required error={errors.address} className="sm:col-span-2">
                <TextInput as="textarea" rows={2} value={form.address} error={errors.address} onChange={set("address")} />
            </Field>
            <Field label="İl" required error={errors.provinceId}>
                <SelectInput value={form.provinceId} error={errors.provinceId} onChange={(e) => setForm((f) => ({ ...f, provinceId: e.target.value, district: "" }))}>
                    <option value="">Seçin</option>
                    {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </SelectInput>
            </Field>
            <Field label="İlçe" required error={errors.district}>
                <SelectInput value={form.district} error={errors.district} onChange={set("district")} disabled={!form.provinceId}>
                    <option value="">{form.provinceId ? "Seçin" : "Önce il seçin"}</option>
                    {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </SelectInput>
            </Field>

            <Field label="Okul" required error={errors.school}><TextInput value={form.school} error={errors.school} onChange={set("school")} /></Field>
            <Field label="Fakülte" required error={errors.faculty}><TextInput value={form.faculty} error={errors.faculty} onChange={set("faculty")} /></Field>
            <Field label="Bölüm" required error={errors.department}><TextInput value={form.department} error={errors.department} onChange={set("department")} /></Field>
            <Field label="Kaçıncı sınıf" required error={errors.grade}>
                <SelectInput value={form.grade} error={errors.grade} onChange={set("grade")}>
                    <option value="">Seçin</option>
                    {GRADES.map((v) => <option key={v} value={v}>{GRADE_LABELS[v]}</option>)}
                </SelectInput>
            </Field>

            <div className="space-y-3 sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wider text-ad-muted">Veli bilgileri (en az 1)</p>
                {form.guardians.map((g, index) => (
                    <div key={g.id} className="grid gap-3 rounded-2xl border border-ad-line p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                        <Field label={`${index + 1}. veli adı soyadı`} required error={errors[`g-${g.id}-name`]}>
                            <TextInput value={g.name} error={errors[`g-${g.id}-name`]} onChange={(e) => setGuardian(g.id, "name", e.target.value)} />
                        </Field>
                        <Field label="Veli telefonu" required error={errors[`g-${g.id}-phone`]}>
                            {phoneInput(g.phone, (v) => setGuardian(g.id, "phone", v), errors[`g-${g.id}-phone`])}
                        </Field>
                        {form.guardians.length > 1 && (
                            <button type="button" onClick={() => setForm((f) => ({ ...f, guardians: f.guardians.filter((x) => x.id !== g.id) }))} aria-label="Veliyi kaldır" className="ad-btn ad-btn-icon ad-btn-danger-soft mt-6 !h-10 !w-10">
                                <Icon name="delete" className="text-[18px]" />
                            </button>
                        )}
                    </div>
                ))}
                <button type="button" onClick={() => setForm((f) => ({ ...f, guardians: [...f.guardians, newGuardian()] }))} className="ad-btn ad-btn-soft ad-btn-sm">
                    <Icon name="add" className="text-[16px]" />Veli ekle
                </button>
            </div>

            <Field label="Oda tipi" required error={errors.roomTypeId} className="sm:col-span-2">
                <SelectInput value={form.roomTypeId} error={errors.roomTypeId} onChange={set("roomTypeId")}>
                    <option value="">Seçin</option>
                    {state.roomTypes.map((r) => {
                        const price = prices.find((p) => p.roomTypeId === r.id);
                        return <option key={r.id} value={r.id} disabled={!price}>{r.name.tr}{price ? ` · ${money(price.monthly)}/ay` : " · fiyat tanımlı değil"}</option>;
                    })}
                </SelectInput>
            </Field>
            {halfOpen && (
                <Field label="Kayıt süresi" hint="Yarım dönem açık: 1. yarıyıl ya da 2. yarıyıl da seçilebilir." className="sm:col-span-2">
                    <SelectInput value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value, entryDate: "" }))}>
                        {Object.entries(TERM).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </SelectInput>
                </Field>
            )}
            <Field label="Giriş tarihi" required error={errors.entryDate}>
                <DateInput value={form.entryDate} min={range.start} max={range.end} error={errors.entryDate} onChange={set("entryDate")} />
            </Field>
            <Field label="Ödeme günü" hint="Sonraki aylarda kira bu günlerde ödenir.">
                <SelectInput value={form.payWindow} onChange={set("payWindow")}>
                    {Object.entries(PAY_WINDOW).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </SelectInput>
            </Field>
        </FormDialog>
    );
}
