import { notFound } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { findNavItem } from "@/lib/admin/nav";

/** Henüz yapılmamış bölümler için geçici sayfa. Her aşamada gerçek sayfalar eklendikçe daralır. */
export default async function PendingSection({ params }) {
    const { slug } = await params;
    const found = findNavItem(`/admin/${slug.join("/")}`);
    if (!found) notFound();

    return (
        <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ad-brand-soft text-ad-brand">
                <Icon name={found.item.icon} className="text-[30px]" />
            </span>
            <h1 className="ad-display mt-5 text-2xl font-semibold">{found.item.label}</h1>
            <p className="mt-1.5 max-w-sm text-sm text-ad-muted">Bu bölüm bir sonraki aşamalarda eklenecek.</p>
        </div>
    );
}
