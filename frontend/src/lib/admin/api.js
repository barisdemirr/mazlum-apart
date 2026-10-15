import { bffDelete, bffGet, bffPost, bffPut, bffUpload } from "@/lib/api/bff";
import { buildQuery } from "@/lib/api/query";

/**
 * Panelin tarayıcı tarafı API istemcisi. Her şey /api/backend/admin/* vekilinden geçer (token httpOnly çerezde kalır).
 * Yol "/api/admin" öneksiz yazılır: admin.get("/periods"), admin.post("/applications/ID/approve").
 */
export const admin = {
    get: (path, query) => bffGet(`/admin${path}${buildQuery(query)}`),
    post: (path, body, options) => bffPost(`/admin${path}`, body, options),
    put: (path, body, options) => bffPut(`/admin${path}`, body, options),
    del: (path, query) => bffDelete(`/admin${path}${buildQuery(query)}`),
    upload: (path, form, options) => bffUpload(`/admin${path}`, form, options),
};
