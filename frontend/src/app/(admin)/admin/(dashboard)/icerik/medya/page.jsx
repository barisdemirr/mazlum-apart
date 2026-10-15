import MediaView from "@/components/admin/content/MediaView";
import { adminGet } from "@/lib/admin/data";

export const metadata = { title: "Medya" };

const PAGE_SIZE = 48;

export default async function Page({ searchParams }) {
    const { kind, page } = await searchParams;
    const k = kind === "image" || kind === "video" ? kind : undefined;
    const p = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
    const media = await adminGet("/media", { kind: k, page: p, pageSize: PAGE_SIZE });
    return <MediaView media={media} kind={k ?? "all"} />;
}
