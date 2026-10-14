"use client";

import { useState } from "react";

/**
 * Yüklenemezse kırık ikon yerine yumuşak bir zemin gösteren görsel.
 * Görseller backend'den (kendi sunucumuz) geldiği için <img> kullanılır.
 */
export default function SafeImage({ src, alt = "", className = "", ...props }) {
    const [failed, setFailed] = useState(!src);

    if (failed) {
        return (
            <div
                role="img"
                aria-label={alt}
                className={`bg-gradient-to-br from-orchid-powder via-orchid-lilac to-orchid-white ${className}`}
            />
        );
    }

    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} {...props} />;
}
