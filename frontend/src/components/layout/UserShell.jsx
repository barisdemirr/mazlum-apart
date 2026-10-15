"use client";

import { usePathname } from "next/navigation";
import { stripLocale } from "@/lib/i18n/config";
import Preloader from "./Preloader";
import CustomCursor from "./CustomCursor";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import WhatsAppFab from "./WhatsAppFab";

/** Genel (kullanıcı) sitenin ortak kabuğu: açılış, imleç, navbar, içerik, footer, WhatsApp. Portal sayfalarında yalnızca açılış ve imleç. */
export default function UserShell({ children }) {
    const pathname = usePathname();

    // Öğrenci portalının kendi kabuğu var: herkese açık navbar, footer ve WhatsApp butonu çizilmez
    if (stripLocale(pathname || "/").startsWith("/ogrenci")) {
        return (
            <>
                <Preloader />
                <CustomCursor />
                {children}
            </>
        );
    }

    return (
        <>
            <Preloader />
            <CustomCursor />
            <SiteHeader />
            {children}
            <SiteFooter />
            <WhatsAppFab />
        </>
    );
}
