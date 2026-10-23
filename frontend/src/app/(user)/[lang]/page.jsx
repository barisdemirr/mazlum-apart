import Hero from "@/components/home/Hero";
import BillsStrip from "@/components/home/BillsStrip";
import RoomsShowcase from "@/components/home/RoomsShowcase";
import HowItWorks from "@/components/home/HowItWorks";
import InfoBento from "@/components/home/InfoBento";
import PortalShowcase from "@/components/home/PortalShowcase";
import ContactSection from "@/components/home/ContactSection";
import { getApartmentTypes, getHeroMedia, getHeroSlides, getMapImage, getRoomTypes } from "@/services";
import { settle } from "@/lib/api";

export default async function HomePage() {
    // Bölümler birbirinden bağımsız yüklenir; biri başarısız olursa diğerleri görünmeye devam eder
    const [hero, slides, rooms, map, types] = await Promise.all([
        settle(getHeroMedia(), { image: null, videoUrl: null }),
        settle(getHeroSlides(), []),
        settle(getRoomTypes(), []),
        settle(getMapImage(), ""),
        settle(getApartmentTypes(), []),
    ]);

    return (
        <main>
            <Hero slides={slides.data ?? []} media={{ ...hero.data, image: hero.data?.image ?? rooms.data?.[0]?.image ?? null }} />
            <BillsStrip />
            {(types.data?.length > 0 || rooms.data?.length > 0) && <RoomsShowcase rooms={rooms.data ?? []} types={types.data ?? []} />}
            <HowItWorks />
            <InfoBento />
            <PortalShowcase />
            <ContactSection mapImage={map.data} />
        </main>
    );
}
