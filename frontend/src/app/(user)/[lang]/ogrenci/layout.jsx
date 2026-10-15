import PwaRegister from "@/components/pwa/PwaRegister";

/**
 * Öğrenci portalı kendi başına kurulabilen bir PWA'dır: /ogrenci kapsamı, kendi manifest'i, kendi service worker'ı.
 * Portal sayfaları arama motorlarına kapalıdır (ayrıca middleware X-Robots-Tag gönderir).
 */
export const metadata = {
    robots: { index: false, follow: false },
    manifest: "/pwa/student.webmanifest",
    applicationName: "Mazlum Apart",
    appleWebApp: { capable: true, title: "Mazlum Apart", statusBarStyle: "default" },
    icons: {
        icon: [{ url: "/pwa/student-192.png", sizes: "192x192", type: "image/png" }],
        apple: [{ url: "/pwa/student-apple-180.png", sizes: "180x180", type: "image/png" }],
    },
};

// viewport-fit=cover: çentikli telefonlarda tam ekran; boşluklar env(safe-area-inset-*) ile bırakılır
export const viewport = { themeColor: "#b4398f", viewportFit: "cover" };

export default function StudentLayout({ children }) {
    return (
        <>
            <PwaRegister app="student" />
            {children}
        </>
    );
}
