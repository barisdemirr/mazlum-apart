/** Portal sayfaları arama motorlarına kapalıdır (ayrıca middleware X-Robots-Tag gönderir) */
export const metadata = {
    robots: { index: false, follow: false },
};

export default function StudentLayout({ children }) {
    return children;
}
