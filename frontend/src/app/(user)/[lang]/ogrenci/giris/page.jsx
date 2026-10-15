import LoginView from "@/components/portal/login/LoginView";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function generateMetadata({ params }) {
    const { lang } = await params;
    return { title: getDictionary(lang).studentPortal.login.metaTitle };
}

export default async function StudentLoginPage({ searchParams }) {
    const query = await searchParams;
    const from = typeof query?.from === "string" ? query.from : "";
    const expired = query?.expired === "1";

    return <LoginView from={from} expired={expired} />;
}
