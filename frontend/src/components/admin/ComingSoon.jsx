import Link from "next/link";
import Icon from "@/components/ui/Icon";

/** Henüz gerçek API'ye bağlanmamış bölümler için (3. aşamada açılır). Eski örnek veriyle çalışmaz. */
export default function ComingSoon({ title, icon = "construction" }) {
    return (
        <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ad-brand-soft text-ad-brand">
                <Icon name={icon} className="text-[30px]" />
            </span>
            <h1 className="ad-display mt-5 text-2xl font-semibold">{title}</h1>
            <p className="mt-1.5 max-w-sm text-sm text-ad-muted">Bu bölüm bir sonraki aşamada canlı verilere bağlanacak.</p>
            <Link href="/admin" className="ad-btn ad-btn-primary mt-6">Ana Panele dön</Link>
        </div>
    );
}
