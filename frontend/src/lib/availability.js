/** Yatak durumu hesapları (halka açık doluluk verisi üzerinde, saf fonksiyonlar) */

export const BED_STATUS = {
    AVAILABLE: "available",
    RESERVED: "reserved",
    OCCUPIED: "occupied",
};

/** Tüm daireler için { total, free, reserved, occupied } */
export function summarizeAvailability(availability) {
    const totals = { total: 0, free: 0, reserved: 0, occupied: 0 };
    for (const flat of availability?.apartments ?? []) {
        for (const room of flat.rooms) {
            for (const bed of room.beds) {
                totals.total += 1;
                if (bed.status === BED_STATUS.AVAILABLE) totals.free += 1;
                else if (bed.status === BED_STATUS.RESERVED) totals.reserved += 1;
                else totals.occupied += 1;
            }
        }
    }
    return totals;
}

/** Bir dairedeki boş yatak sayısı */
export function freeBedsInFlat(flat) {
    return flat.rooms.reduce((sum, room) => sum + room.beds.filter((bed) => bed.status === BED_STATUS.AVAILABLE).length, 0);
}

/** Yatak kimliğinden { flat, room, bed } bulur (seçimi doğrulamak için) */
export function findBed(availability, bedId) {
    for (const flat of availability?.apartments ?? []) {
        for (const room of flat.rooms) {
            const bed = room.beds.find((b) => b.id === bedId);
            if (bed) return { flat, room, bed };
        }
    }
    return null;
}
