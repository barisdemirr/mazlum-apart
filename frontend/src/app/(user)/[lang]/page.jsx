import Hero from "@/components/home/Hero";
import BillsStrip from "@/components/home/BillsStrip";
import RoomsShowcase from "@/components/home/RoomsShowcase";
import { getHeroMedia, getRoomTypes } from "@/services";
import { settle } from "@/lib/api";

export default async function HomePage() {
    // Bölümler birbirinden bağımsız yüklenir; biri başarısız olursa diğerleri görünmeye devam eder
    const [hero, rooms] = await Promise.all([settle(getHeroMedia(), null), settle(getRoomTypes(), [])]);

    return (
        <main>
            <Hero media={hero.data} />
            <BillsStrip />
            {rooms.data?.length > 0 && <RoomsShowcase rooms={rooms.data} />}
        </main>
    );
}
