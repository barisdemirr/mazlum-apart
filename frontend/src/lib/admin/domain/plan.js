import { addMonthsKey, monthKey, toISO } from "./dates";

/**
 * Ödeme planı üretimi (saf fonksiyon). Plan kayıt onaylanınca dönemin TAMAMI için baştan üretilir.
 *
 * Kural (müşteri):
 *  - Depozito = 1 aylık kira. Kayıt tarihinde vadelidir ve SON AYIN (haziran) kirası yerine sayılır:
 *    dönemin son ayı için ayrıca kira kalemi üretilmez (öğrenci o ay ödeme yapmaz).
 *  - İlk ayın kirası da kayıt tarihinde vadelidir (peşin).
 *  - Sonraki aylar: öğrencinin seçtiği ödeme penceresine göre ayın 5'i ("early", 1-5) ya da 20'si ("mid", 15-20).
 *  - Tutarlar başvuru anındaki fiyat anlık görüntüsünden (snapshot) gelir, sonradan fiyat değişse etkilenmez.
 * TEYİT BEKLİYOR (müşteriye sorulacak): ay ortası girişte ilk ayın hesabı, pencerenin son günü.
 */
export const PAY_WINDOWS = {
    early: { label: "Ayın 1–5'i", dueDay: 5 },
    mid: { label: "Ayın 15–20'si", dueDay: 20 },
};

/**
 * @returns Charge taslakları (kimlik ve dönem çağıran tarafından eklenir)
 */
export function generateCharges({ entryDate, payWindow, price, periodEnd }) {
    const dueDay = PAY_WINDOWS[payWindow]?.dueDay ?? 5;
    const charges = [];

    charges.push({ kind: "deposit", month: monthKey(entryDate), amount: price.deposit, dueDate: entryDate, note: "Depozito (son ay kirası yerine)" });

    let key = monthKey(entryDate);
    const lastKey = monthKey(periodEnd);
    let index = 0;
    // Tek aylık kayıtta (giriş son aydaysa) kira alınır; aksi halde son ay depozito ile karşılanır
    const lastRentKey = key < lastKey ? addMonthsKey(lastKey, -1) : lastKey;
    while (key <= lastRentKey) {
        const first = index === 0;
        const [y, m] = key.split("-").map(Number);
        charges.push({
            kind: "rent",
            month: key,
            amount: price.monthly,
            dueDate: first ? entryDate : toISO(new Date(y, m - 1, dueDay)),
            note: first ? "İlk ay kirası (peşin)" : "",
        });
        key = addMonthsKey(key, 1);
        index += 1;
    }
    return charges;
}
