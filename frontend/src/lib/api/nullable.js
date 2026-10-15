import { ApiError } from "./error";

/** İstek 404 dönerse null verir (sayfa notFound() yapabilsin); diğer hatalar olduğu gibi fırlar */
export async function orNull(promise) {
    try {
        return await promise;
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
    }
}
