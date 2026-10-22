/** Öğrenci portalı yükleme göstergesi: ortada dönen halka. */
export default function PortalLoader() {
    return (
        <div role="status" aria-live="polite" className="flex min-h-[55vh] w-full items-center justify-center">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-orchid-powder border-t-orchid-pink" />
            <span className="sr-only">Yükleniyor</span>
        </div>
    );
}
