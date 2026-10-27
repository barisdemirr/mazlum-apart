"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import LocalizedLink from "@/components/ui/LocalizedLink";
import PageHeader from "@/components/portal/PageHeader";
import DocumentField from "@/components/apply/DocumentField";
import { bffPost, bffUpload } from "@/lib/api/bff";
import { formatDate, formatPrice } from "@/lib/format";
import { GRADES } from "@/lib/application";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const TEXT = {
    tr: {
        title: "Kayıt Yenile",
        text: "Mevcut hesabınla yeni dönem için başvur. Kişisel, veli ve okul bilgilerin otomatik aktarılır; yalnızca değişen bilgileri güncellersin.",
        previous: "Önceki kaydın",
        room: "Odan",
        noWindow: "Şu an kayıt yenilemeye açık bir dönem yok. Dönem açıldığında buradan başvurabilirsin.",
        stay: "Konaklama türü",
        plans: { academic: "Akademik dönem", yearly: "12 ay (yaz dahil)", summer: "Sadece yaz" },
        roomType: "Oda tipi",
        choose: "Seçin",
        full: "dolu",
        month: "/ay",
        sameRoom: "Aynı odamı istiyorum",
        sameRoomHint: "Önceki odan boşsa aynı oda tercih edilir; doluysa başvuru alınamaz, “oda fark etmez” ile başvurabilirsin.",
        term: "Kayıt süresi",
        terms: { full: "Tam dönem", first: "1. yarıyıl", second: "2. yarıyıl" },
        entry: "Giriş tarihi",
        payDay: "Kira ödeme günü",
        pay: { early: "Ayın 1–5'i", mid: "Ayın 15–20'si" },
        update: "Değişen bilgilerin",
        grade: "Sınıf",
        grades: { prep: "Hazırlık" },
        school: "Okul",
        faculty: "Fakülte",
        department: "Bölüm",
        address: "İkamet adresi",
        note: "Notun (isteğe bağlı)",
        docNote: "Güncel öğrenci belgen varsa yükle (isteğe bağlı). Önceki belgelerin saklanır.",
        price: "Güncel fiyat ve ödeme planı",
        monthly: "Aylık kira",
        deposit: "Depozito",
        summerRent: "Yaz kirası",
        dueNow: "Kayıtta ödenecek",
        total: "Dönem toplamı",
        kinds: { deposit: "Depozito", rent: "Kira", summer: "Yaz kirası", other: "Diğer", extrastay: "Ek konaklama" },
        submit: "Yenileme başvurusu gönder",
        sending: "Gönderiliyor…",
        done: "Başvurun alındı",
        doneText: "Başvuru numaran {no}. Yönetim onayladığında yeni dönem kaydın oluşur; aynı hesapla giriş yapmaya devam edersin.",
        mine: "Yenileme başvuruların",
        status: { pending: "Bekliyor", approved: "Onaylandı", rejected: "Reddedildi" },
        back: "Özete dön",
        error: "Başvuru gönderilemedi.",
    },
    en: {
        title: "Renew Registration",
        text: "Apply for a new term with your existing account. Your personal, guardian and school details are carried over; only update what has changed.",
        previous: "Your previous stay",
        room: "Your room",
        noWindow: "No term is open for renewal right now. You can apply here once a term opens.",
        stay: "Stay type",
        plans: { academic: "Academic term", yearly: "12 months (incl. summer)", summer: "Summer only" },
        roomType: "Room type",
        choose: "Select",
        full: "full",
        month: "/mo",
        sameRoom: "I want my same room",
        sameRoomHint: "Your previous room is requested if free; if it is taken the application cannot be placed, then apply with “any room”.",
        term: "Term length",
        terms: { full: "Full term", first: "1st semester", second: "2nd semester" },
        entry: "Move-in date",
        payDay: "Rent payment day",
        pay: { early: "1st–5th of month", mid: "15th–20th of month" },
        update: "Details that changed",
        grade: "Year of study",
        grades: { prep: "Prep" },
        school: "University",
        faculty: "Faculty",
        department: "Department",
        address: "Home address",
        note: "Your note (optional)",
        docNote: "Upload your current student certificate if you have one (optional). Your earlier documents are kept.",
        price: "Current price and payment plan",
        monthly: "Monthly rent",
        deposit: "Deposit",
        summerRent: "Summer rent",
        dueNow: "Due at registration",
        total: "Term total",
        kinds: { deposit: "Deposit", rent: "Rent", summer: "Summer rent", other: "Other", extrastay: "Extra stay" },
        submit: "Send renewal application",
        sending: "Sending…",
        done: "Application received",
        doneText: "Your application number is {no}. Once approved, your new term registration is created; you keep signing in with the same account.",
        mine: "Your renewal applications",
        status: { pending: "Pending", approved: "Approved", rejected: "Rejected" },
        back: "Back to overview",
        error: "The application could not be sent.",
    },
};

const input = "w-full rounded-2xl border border-orchid-petal/50 bg-white/80 px-4 py-3 text-sm font-semibold text-orchid-dark outline-none focus:border-orchid-pink";
const label = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-orchid-muted";

const errorMessage = (e, fallback) => {
    const first = e?.errors ? Object.values(e.errors).flat()[0] : null;
    return first || e?.detail || e?.title || fallback;
};

export default function RenewalView({ data }) {
    const { locale } = useLanguage();
    const c = TEXT[locale === "en" ? "en" : "tr"];
    const money = (n) => formatPrice(n, "TRY", locale);

    const [form, setForm] = useState(() => ({
        stayPlan: data.academic ? "academic" : "summer",
        roomTypeId: data.previous?.roomTypeId ?? "",
        sameRoom: Boolean(data.previous?.roomId),
        term: "full",
        entryDate: "",
        payWindow: data.previous?.payWindow ?? "early",
        grade: data.student.grade ?? "",
        school: data.student.school ?? "",
        faculty: data.student.faculty ?? "",
        department: data.student.department ?? "",
        address: data.student.address ?? "",
        note: "",
    }));
    const [document, setDocument] = useState(null);
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [doneNo, setDoneNo] = useState("");
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const period = form.stayPlan === "summer" ? data.summer : data.academic;
    const types = period?.roomTypes ?? [];
    const chosen = types.find((t) => t.id === form.roomTypeId);
    const today = new Date().toISOString().slice(0, 10);
    const minDate = period ? (period.start > today ? period.start : today) : today;
    const halfOpen = form.stayPlan === "academic" && period?.halfTerm?.enabled;
    const sameRoomPossible = Boolean(data.previous?.roomId) && data.previous?.roomTypeId === form.roomTypeId && form.stayPlan !== "summer";

    // Plan/oda tipi/dönem değişince geçersiz seçimleri sıfırla
    useEffect(() => {
        if (!period) return;
        if (form.roomTypeId && !types.some((t) => t.id === form.roomTypeId)) setForm((f) => ({ ...f, roomTypeId: "" }));
        if (form.stayPlan === "yearly" && chosen && chosen.summerMonthly == null) setForm((f) => ({ ...f, stayPlan: "academic" }));
        if (!halfOpen && form.term !== "full") setForm((f) => ({ ...f, term: "full" }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.stayPlan, form.roomTypeId, period?.id]);

    // Güncel fiyat ve ödeme planı önizlemesi
    useEffect(() => {
        if (!form.roomTypeId || !form.entryDate) { setPreview(null); return; }
        let alive = true;
        const timer = setTimeout(() => {
            bffPost("/student/renewal/preview", { stayPlan: form.stayPlan, roomTypeId: form.roomTypeId, term: form.term, entryDate: form.entryDate, payWindow: form.payWindow })
                .then((p) => alive && setPreview({ ok: true, ...p }))
                .catch((e) => alive && setPreview({ ok: false, message: errorMessage(e, "") }));
        }, 250);
        return () => { alive = false; clearTimeout(timer); };
    }, [form.stayPlan, form.roomTypeId, form.term, form.entryDate, form.payWindow]);

    const planOptions = useMemo(() => {
        const list = [];
        if (data.academic) { list.push("academic"); if (!chosen || chosen.summerMonthly != null) list.push("yearly"); }
        if (data.summer) list.push("summer");
        return list;
    }, [data.academic, data.summer, chosen]);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            const body = { ...form, sameRoom: form.sameRoom && sameRoomPossible };
            const formData = new FormData();
            formData.append("data", JSON.stringify(body));
            if (document) formData.append("document", document, document.name);
            const out = await bffUpload("/student/renewal", formData, { timeout: 90_000 });
            setDoneNo(out.applicationNo);
        } catch (err) {
            setError(errorMessage(err, c.error));
        } finally {
            setBusy(false);
        }
    };

    if (doneNo) {
        return (
            <>
                <PageHeader title={c.done} text={c.doneText.replace("{no}", doneNo)} />
                <LocalizedLink href="/ogrenci" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-orchid-pink shadow">
                    <Icon name="arrow_back" className="text-[20px]" />{c.back}
                </LocalizedLink>
            </>
        );
    }

    return (
        <>
            <PageHeader title={c.title} text={c.text} />

            {data.previous && (
                <section className="glass-card mb-5 rounded-[28px] p-5 sm:p-6">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-orchid-pink">{c.previous}</p>
                    <p className="mt-1 text-sm font-bold text-orchid-dark">{data.previous.periodName} · {data.previous.roomTypeName}{data.previous.roomLabel ? ` · ${data.previous.roomLabel}` : ""}</p>
                </section>
            )}

            {data.applications.length > 0 && (
                <section className="glass-card mb-5 rounded-[28px] p-5 sm:p-6">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-orchid-pink">{c.mine}</p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                        {data.applications.map((a) => (
                            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-orchid-dark">{a.no} · {a.periodName}</span>
                                <span className="text-xs font-semibold text-orchid-muted">{c.status[a.status] ?? a.status}{a.rejectReason ? ` · ${a.rejectReason}` : ""} · {formatDate(a.createdAt)}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {!data.academic && !data.summer ? (
                <p className="glass-card rounded-[28px] p-6 text-sm font-semibold text-orchid-muted">{c.noWindow}</p>
            ) : (
                <form onSubmit={submit} className="glass-card space-y-5 rounded-[32px] p-5 sm:p-7">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className={label}>{c.stay}</label>
                            <select className={input} value={form.stayPlan} onChange={set("stayPlan")}>
                                {planOptions.map((p) => <option key={p} value={p}>{c.plans[p]}{p !== "summer" && data.academic ? ` · ${data.academic.name}` : p === "summer" && data.summer ? ` · ${data.summer.name}` : ""}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={label}>{c.roomType}</label>
                            <select className={input} value={form.roomTypeId} onChange={set("roomTypeId")} required>
                                <option value="">{c.choose}</option>
                                {types.map((t) => (
                                    <option key={t.id} value={t.id} disabled={t.full || (form.stayPlan === "yearly" && t.summerMonthly == null)}>
                                        {t.apartmentTypeName ? `${t.apartmentTypeName} · ` : ""}{t.name} — {money(t.monthly)}{c.month}{t.full ? ` (${c.full})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {sameRoomPossible && (
                            <label className="flex items-start gap-3 rounded-2xl bg-white/70 p-4 sm:col-span-2">
                                <input type="checkbox" checked={form.sameRoom} onChange={(e) => setForm((f) => ({ ...f, sameRoom: e.target.checked }))} className="mt-1 h-4 w-4" />
                                <span><span className="block text-sm font-bold text-orchid-dark">{c.sameRoom}{data.previous?.roomLabel ? ` (${data.previous.roomLabel})` : ""}</span><span className="text-xs text-orchid-muted">{c.sameRoomHint}</span></span>
                            </label>
                        )}
                        {halfOpen && (
                            <div>
                                <label className={label}>{c.term}</label>
                                <select className={input} value={form.term} onChange={set("term")}>
                                    {Object.entries(c.terms).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className={label}>{c.entry}</label>
                            <input type="date" className={input} value={form.entryDate} min={minDate} max={period?.end} onChange={set("entryDate")} required />
                        </div>
                        <div>
                            <label className={label}>{c.payDay}</label>
                            <select className={input} value={form.payWindow} onChange={set("payWindow")}>
                                {Object.entries(c.pay).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-orchid-pink">{c.update}</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={label}>{c.grade}</label>
                                <select className={input} value={form.grade} onChange={set("grade")}>
                                    {GRADES.map((g) => <option key={g} value={g}>{g === "prep" ? c.grades.prep : g}</option>)}
                                </select>
                            </div>
                            <div><label className={label}>{c.school}</label><input className={input} value={form.school} onChange={set("school")} maxLength={150} /></div>
                            <div><label className={label}>{c.faculty}</label><input className={input} value={form.faculty} onChange={set("faculty")} maxLength={150} /></div>
                            <div><label className={label}>{c.department}</label><input className={input} value={form.department} onChange={set("department")} maxLength={150} /></div>
                            <div className="sm:col-span-2"><label className={label}>{c.address}</label><input className={input} value={form.address} onChange={set("address")} maxLength={400} /></div>
                            <div className="sm:col-span-2"><label className={label}>{c.note}</label><textarea className={input} rows={2} value={form.note} onChange={set("note")} maxLength={1000} /></div>
                        </div>
                    </div>

                    <div>
                        <p className="mb-2 text-xs text-orchid-muted">{c.docNote}</p>
                        <DocumentField value={document} onChange={setDocument} error="" tick={0} />
                    </div>

                    {preview && (
                        <div className="rounded-3xl bg-white/70 p-5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-orchid-pink">{c.price}</p>
                            {preview.ok ? (
                                <>
                                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                                        <div><dt className="text-xs text-orchid-muted">{c.monthly}</dt><dd className="font-bold text-orchid-dark">{money(preview.monthly)}</dd></div>
                                        <div><dt className="text-xs text-orchid-muted">{c.deposit}</dt><dd className="font-bold text-orchid-dark">{money(preview.deposit)}</dd></div>
                                        {preview.summerMonthly != null && <div><dt className="text-xs text-orchid-muted">{c.summerRent}</dt><dd className="font-bold text-orchid-dark">{money(preview.summerMonthly)}</dd></div>}
                                        <div><dt className="text-xs text-orchid-muted">{c.dueNow}</dt><dd className="font-bold text-orchid-pink">{money(preview.dueAtRegistration)}</dd></div>
                                    </dl>
                                    <ul className="mt-4 divide-y divide-orchid-petal/30 text-sm">
                                        {preview.plan.map((l, i) => (
                                            <li key={i} className="flex items-center justify-between gap-3 py-1.5">
                                                <span className="font-semibold text-orchid-dark">{c.kinds[String(l.kind).toLowerCase()] ?? l.kind} · {l.month}</span>
                                                <span className="text-xs text-orchid-muted">{formatDate(l.dueDate)}</span>
                                                <span className="font-bold text-orchid-dark">{money(l.amount)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-3 text-right text-sm font-bold text-orchid-dark">{c.total}: {money(preview.total)}</p>
                                </>
                            ) : preview.message ? <p className="mt-2 text-sm font-semibold text-orchid-pink">{preview.message}</p> : null}
                        </div>
                    )}

                    {error && <p role="alert" className="rounded-2xl bg-orchid-powder p-4 text-sm font-bold text-orchid-pink">{error}</p>}

                    <button type="submit" disabled={busy || !form.roomTypeId || !form.entryDate} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orchid-pink to-orchid-violet px-7 py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-50">
                        <Icon name="autorenew" className="text-[20px]" />
                        {busy ? c.sending : c.submit}
                    </button>
                </form>
            )}
        </>
    );
}
