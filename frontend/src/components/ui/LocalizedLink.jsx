"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/**
 * Başvuru ve öğrenci alanı her ziyarette sunucuda üretilen (dinamik) sayfalardır; sorgu dizeli adresler de öyle.
 * Next.js bağlantı ekrana girince bunları arkadan önceden yükler ve her biri sunucu CPU'su harcar.
 * Bu yüzden bu adreslerde ön yükleme kapalıdır (tıklayınca zaten açılır). Statik sayfalar normal ön yüklenir.
 */
const DYNAMIC_TARGET = /^\/(?:(?:en|tr)\/)?(?:basvuru|ogrenci)(?:[/?#]|$)/;

/** Seçili dile göre adres üreten Link: href="/odalar" -> EN'de "/en/odalar" */
export default function LocalizedLink({ href, prefetch, ...props }) {
    const { href: localize } = useLanguage();
    const target = localize(href);
    const dynamic = typeof target === "string" && (DYNAMIC_TARGET.test(target) || target.includes("?"));
    return <Link href={target} prefetch={prefetch ?? (dynamic ? false : undefined)} {...props} />;
}
