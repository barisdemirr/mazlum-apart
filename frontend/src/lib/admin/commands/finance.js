import { admin } from "@/lib/admin/api";

/** Muhasebe komutları. Para hareketi yapanlar Idempotency-Key taşır (çift tıklama tek kayıt). Kurallar backend'dedir. */
const idem = { idempotent: true };
const n = (v) => Number(v);
const dateOrNull = (v) => v || null;

export const getAccount = ({ enrollmentId }) => admin.get(`/enrollments/${enrollmentId}/account`);

export const recordPayment = ({ enrollmentId, amount, date, method, accountId, note }) =>
    admin.post(`/enrollments/${enrollmentId}/payments`, { amount: n(amount), date: dateOrNull(date), method, accountId, note: note || null }, idem);
/** Makbuz verisi (yalnızca tahsilat). Yazdırılabilir görünüm: components/admin/accounting/Receipt.jsx */
export const getReceipt = ({ paymentId }) => admin.get(`/payments/${paymentId}/receipt`);
/** Hızlı tahsilat penceresi için: dönemin kayıtları ve kasa/banka hesapları */
export const listEnrollments = ({ periodId }) => admin.get("/enrollments", { periodId });
export const listAccounts = () => admin.get("/accounts");
export const cancelPayment = ({ id, reason }) => admin.post(`/payments/${id}/cancel`, { reason });
export const refundAdvance = ({ enrollmentId, amount, date, accountId, note }) =>
    admin.post(`/enrollments/${enrollmentId}/refunds`, { amount: n(amount), date: dateOrNull(date), accountId, note: note || null }, idem);
export const addCharge = ({ enrollmentId, kind, month, amount, dueDate, note }) =>
    admin.post(`/enrollments/${enrollmentId}/charges`, { kind, month: month || null, amount: n(amount), dueDate: dateOrNull(dueDate), note: note || null }, idem);
/** Aylık indirim: depozito ve tüm kira/yaz taksitlerinden aynı tutar düşer (ters kayıt + indirimli yeni kalem). includePaid: ödenmiş taksitlere de uygula */
export const applyMonthlyDiscount = ({ enrollmentId, amount, includePaid, reason }) =>
    admin.post(`/enrollments/${enrollmentId}/monthly-discount`, { amount: n(amount), includePaid: includePaid === "yes", reason }, idem);
/** Tek taksidin son ödeme tarihini değiştirir (izinli erteleme): yalnızca bu kalem etkilenir, eski/yeni tarih ve gerekçe geçmişe yazılır */
export const changeDueDate = ({ id, dueDate, reason }) => admin.post(`/charges/${id}/due-date`, { dueDate: dateOrNull(dueDate), reason });
export const reverseCharge = ({ id, reason }) => admin.post(`/charges/${id}/reverse`, { reason });
/** Kalem tutarını değiştirir: eski kalem ters kayıtla kapanır, aynı tür/ay/vadeyle yeni tutarda kalem açılır */
export const amendCharge = ({ id, amount, reason }) => admin.post(`/charges/${id}/amend`, { amount: n(amount), reason });

export const addExpense = ({ periodId, categoryId, amount, date, accountId, description }) =>
    admin.post("/expenses", { periodId, categoryId, amount: n(amount), date: dateOrNull(date), accountId, description: description || null }, idem);
export const cancelExpense = ({ id, reason }) => admin.post(`/expenses/${id}/cancel`, { reason });

export const addBill = ({ periodId, kind, month, amount, dueDate, note, subscriptionId }) =>
    admin.post("/bills", { periodId, kind, month, amount: n(amount), dueDate: dateOrNull(dueDate), note: note || null, subscriptionId: subscriptionId || null }, idem);
export const payBill = ({ id, accountId, date }) => admin.post(`/bills/${id}/pay`, { accountId, date: dateOrNull(date) }, idem);
export const deleteBill = ({ id }) => admin.del(`/bills/${id}`);
/** Gelen faturaya göre tutar ve son ödeme tarihini günceller (abonelikten üretilen "fatura bekleniyor" kaydı gerçek faturaya döner) */
export const updateBill = ({ id, amount, dueDate, note }) => admin.put(`/bills/${id}`, { amount: n(amount), dueDate: dateOrNull(dueDate), note: note || null });

/* Fatura abonelikleri: abone numarası + tür; her ay için otomatik "fatura bekleniyor" kaydı üretilir */
const subscriptionBody = ({ kind, subscriberNo, provider, dueDay, estimatedAmount, startMonth, note, active }) => ({
    kind, subscriberNo, provider: provider || null, dueDay: Number(dueDay), estimatedAmount: n(estimatedAmount), startMonth: startMonth || null, note: note || null, active,
});
export const addBillSubscription = (values) => admin.post("/bill-subscriptions", subscriptionBody(values), idem);
export const updateBillSubscription = ({ id, ...values }) => admin.put(`/bill-subscriptions/${id}`, subscriptionBody(values));
export const deleteBillSubscription = ({ id }) => admin.del(`/bill-subscriptions/${id}`);

export const addAccount = ({ type, name, iban }) => admin.post("/accounts", { type, name, iban: (iban || "").replace(/\s/g, "") || null });
export const setOpening = ({ id, periodId, amount, date }) => admin.post(`/accounts/${id}/opening`, { periodId, amount: n(amount), date: dateOrNull(date) });
export const transfer = ({ periodId, fromId, toId, amount, date, note }) =>
    admin.post("/transfers", { periodId, fromId, toId, amount: n(amount), date: dateOrNull(date), note: note || null }, idem);

/* Destek ve sistem */
/** Ofisten öğrenci adına arıza kaydı (multipart; en fazla 3 görsel). Kayıt öğrencinin açtığı arızayla aynı süreçten geçer */
export const createMaintenance = ({ enrollmentId, area, title, description, roomLabel, photos }) => {
    const form = new FormData();
    form.append("enrollmentId", enrollmentId);
    form.append("area", area);
    form.append("title", title);
    form.append("description", description);
    form.append("roomLabel", roomLabel || "");
    for (const file of photos ?? []) form.append("photos", file, file.name);
    return admin.upload("/maintenance", form);
};
export const updateMaintenance = ({ id, status, adminNote }) => admin.put(`/maintenance/${id}`, { status, adminNote: adminNote || null });
export const resetStudentPassword = ({ studentId }) => admin.post(`/students/${studentId}/reset-password`);

export const createAdmin = ({ name, email }) => admin.post("/users", { name, email });
export const updateAdmin = ({ id, name, email, active }) => admin.put(`/users/${id}`, { name, email, active });
export const resetAdminPassword = ({ id }) => admin.post(`/users/${id}/reset-password`);
export const updateProfile = ({ name }) => admin.put("/me", { name });
export const changePassword = ({ currentPassword, newPassword }) => admin.post("/me/password", { currentPassword, newPassword });
