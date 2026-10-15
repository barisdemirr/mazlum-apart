/**
 * Panelde süren istek sayısını tutan küçük global depo.
 * İlerleme çubuğu ve "işleniyor" rozeti buna abone olur.
 */
let active = 0;
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener());

export const progress = {
    start() {
        active += 1;
        emit();
    },
    done() {
        active = Math.max(0, active - 1);
        emit();
    },
    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    isBusy() {
        return active > 0;
    },
};

/** Bir isteği sayaca dahil eder; başarılı da olsa hata da verse sayaç düşer */
export async function track(promise) {
    progress.start();
    try {
        return await promise;
    } finally {
        progress.done();
    }
}