"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/** Seçili dile göre adres üreten Link: href="/odalar" -> EN'de "/en/odalar" */
export default function LocalizedLink({ href, ...props }) {
    const { href: localize } = useLanguage();
    return <Link href={localize(href)} {...props} />;
}
