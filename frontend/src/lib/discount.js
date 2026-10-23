/**
 * İndirim kodu hesabı (backend Domain/Accounting/DiscountMath.cs ile AYNI hesap).
 * İndirim aylık kiraya (12 ayda yaz kirasına da) uygulanır; depozitoya uygulanmaz. Sonuç en az 1 TL.
 * discount: { code, kind: "percent" | "fixed", value, restricted }
 */
export function discounted(discount, price) {
    if (!discount || price == null) return price;
    const raw = discount.kind === "percent" ? (price * (100 - discount.value)) / 100 : price - discount.value;
    return Math.max(Math.round(raw * 100) / 100, 1);
}

/**
 * Oda tiplerini indirimli fiyatla döndürür: monthlyPrice (ve varsa summerMonthlyPrice) indirimli olur,
 * liste fiyatı listMonthlyPrice / listSummerMonthlyPrice olarak kalır, depozito ESKİ (indirimsiz) kirada sabitlenir.
 */
export function discountRooms(rooms, discount) {
    if (!discount) return rooms;
    return rooms.map((room) => {
        if (room.unavailable) return room;
        return {
            ...room,
            discount,
            listMonthlyPrice: room.monthlyPrice,
            monthlyPrice: discounted(discount, room.monthlyPrice),
            depositAmount: room.depositAmount ?? room.monthlyPrice,
            ...(room.summerMonthlyPrice != null
                ? { listSummerMonthlyPrice: room.summerMonthlyPrice, summerMonthlyPrice: discounted(discount, room.summerMonthlyPrice) }
                : {}),
        };
    });
}
