import SiteLoader from "@/components/ui/SiteLoader";

/** Genel site sayfaları arasındaki geçişte gösterilen markalı yükleme ekranı (navbar ve footer yerinde kalır). */
export default function Loading() {
    return (
        <div role="status" aria-live="polite" className="flex min-h-[70vh] w-full items-center justify-center p-6">
            <SiteLoader />
            <span className="sr-only">Yükleniyor</span>
        </div>
    );
}
