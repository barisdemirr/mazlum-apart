/** @type {import('next').NextConfig} */
const nextConfig = {
    async headers() {
        return [
            {
                // Service worker: asla önbelleğe alınmaz (güncellemeler hemen gelsin) ve hem /ogrenci hem /admin
                // kapsamına kayıt olabilmesi için geniş kapsam izni alır. Kapsamı kayıt anında PwaRegister daraltır.
                source: "/pwa/sw.js",
                headers: [
                    { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
                    { key: "Service-Worker-Allowed", value: "/" },
                    { key: "Content-Type", value: "application/javascript; charset=utf-8" },
                ],
            },
            {
                source: "/pwa/student.webmanifest",
                headers: [
                    { key: "Content-Type", value: "application/manifest+json; charset=utf-8" },
                    { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
                ],
            },
            {
                source: "/pwa/admin.webmanifest",
                headers: [
                    { key: "Content-Type", value: "application/manifest+json; charset=utf-8" },
                    { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
                ],
            },
        ];
    },
};

export default nextConfig;
