/** Backend'in application/problem+json formatındaki hatası */
export class ApiError extends Error {
    constructor({ status, title, detail, errors, type }) {
        super(title || `API Error ${status}`);
        this.name = "ApiError";
        this.status = status;
        this.title = title;
        this.detail = detail;
        this.errors = errors || null; // { "name.tr": ["..."], ... }
        this.type = type || null;
    }

    isValidationError() {
        return this.status === 400 && this.errors != null;
    }

    getFieldError(fieldName) {
        const list = this.errors?.[fieldName];
        return list && list.length > 0 ? list[0] : null;
    }

    getAllMessages() {
        if (this.errors) return Object.values(this.errors).flat();
        return this.detail ? [this.detail] : [this.title];
    }
}

/** Başarılıysa gövdeyi döner, değilse ApiError fırlatır */
export async function parseApiResponse(response) {
    if (response.ok) {
        if (response.status === 204) return null;

        const text = await response.text();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch {
            throw new ApiError({
                status: response.status,
                title: "Geçersiz JSON yanıtı",
                detail: "Sunucudan beklenen formatta yanıt gelmedi.",
            });
        }
    }

    let problem = null;
    try {
        problem = await response.json();
    } catch {
        // JSON değil
    }

    throw new ApiError({
        status: response.status,
        title: problem?.title || `HTTP ${response.status}`,
        detail: problem?.detail || null,
        errors: problem?.errors || null,
        type: problem?.type || null,
    });
}
