"use client";

import { createPortal } from "react-dom";

/**
 * Pencereyi panel kökünün (.admin-root) altına taşır. Başka bir pencerenin içinden açılan pencere (örn. "Kayıt oluşturuldu" içindeki
 * WhatsApp penceresi) üstteki pencerenin animasyon/overflow kutusuna hapsolup üstten ve alttan kesilmesin diye.
 */
export default function ModalPortal({ children }) {
    if (typeof document === "undefined") return null;
    // Portal içindeki form gönderimi, React ağacında üstte duran forma yansımasın
    return createPortal(<div className="contents" onSubmit={(e) => e.stopPropagation()}>{children}</div>, document.querySelector(".admin-root") ?? document.body);
}
