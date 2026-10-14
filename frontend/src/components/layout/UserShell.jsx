"use client";

import Preloader from "./Preloader";
import CustomCursor from "./CustomCursor";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import WhatsAppFab from "./WhatsAppFab";

/** Genel (kullanıcı) sitenin ortak kabuğu: açılış, imleç, navbar, içerik, footer, WhatsApp */
export default function UserShell({ children }) {
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
