import { apiGet } from "@/lib/api";
import { TTL_LONG } from "@/lib/api/cache";

/** Sabit sayfa (yalnızca "about" sitede kullanılır): { key, title: {tr,en}, body: {tr,en}, updatedAt } */
export const getPage = (key) => apiGet(`/api/pages/${key}`, { revalidate: TTL_LONG, tags: ["pages"] });
