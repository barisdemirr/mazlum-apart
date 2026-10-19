import { apiGet } from "@/lib/api";

/** Sabit sayfa (yalnızca "about" sitede kullanılır): { key, title: {tr,en}, body: {tr,en}, updatedAt } */
export const getPage = (key) => apiGet(`/api/pages/${key}`, { revalidate: 60, tags: ["pages"] });
