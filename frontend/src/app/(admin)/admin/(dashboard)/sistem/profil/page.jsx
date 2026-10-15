import ProfileView from "@/components/admin/system/ProfileView";
import { adminGet } from "@/lib/admin/data";

export const metadata = { title: "Profilim" };

export default async function Page() {
    return <ProfileView me={await adminGet("/me")} />;
}
