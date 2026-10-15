import ProfileView from "@/components/portal/profile/ProfileView";
import { settle } from "@/lib/api";
import { getProvinceName } from "@/lib/locations";
import { getStudentProfile } from "@/services";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    return { title: getDictionary(lang).studentPortal.nav.profile };
}

export default async function ProfilePage() {
    const student = await getStudentProfile();
    return <ProfileView student={student} period={student.period} provinceName={getProvinceName(student.provinceId)} />;
}
