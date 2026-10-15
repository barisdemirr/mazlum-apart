import { redirect } from "next/navigation";
import PortalShell from "@/components/portal/PortalShell";
import { getStudentSession } from "@/lib/student/session";
import { getStudentProfile } from "@/services/student";

export const dynamic = "force-dynamic"; // oturuma göre değişir, asla önbelleğe alınmaz

/** Portalın ortak kabuğu. Oturum denetimi middleware'de yapılır; burada ikinci güvence olarak tekrarlanır. */
export default async function PortalLayout({ children }) {
    const session = await getStudentSession();
    if (!session) redirect("/ogrenci/giris");

    const student = await getStudentProfile(session);
    return <PortalShell student={student}>{children}</PortalShell>;
}
