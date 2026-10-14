/** Bir istek hata verirse sayfayı düşürmez, varsayılan değeri döndürür. */
export async function safe(promise, fallback = []) {
    try {
        return await promise;
    } catch (error) {
        console.error("[api]", error?.message ?? error);
        return fallback;
    }
}

/** safe gibi, ama hatayı da bildirir: { data, error } */
export async function settle(promise, fallback = []) {
    try {
        return { data: await promise, error: null };
    } catch (error) {
        console.error("[api]", error?.message ?? error);
        return { data: fallback, error };
    }
}
