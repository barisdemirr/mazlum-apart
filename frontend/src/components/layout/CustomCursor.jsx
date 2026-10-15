"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE = "a, button, [role='button'], summary, label";
const NATIVE = "input, textarea, select, [contenteditable='true']";

/**
 * Masaüstü özel imleci: küçük nokta + gecikmeyle takip eden halka.
 * Etkileşimli öğelerin üstünde halka yalnızca bir miktar büyür (yazı gösterilmez).
 * Yalnızca ince imleçli (fare) cihazlarda çalışır; dokunmatikte hiçbir şey yapmaz.
 * Form alanlarında sistem imleci kullanılır.
 */
export default function CustomCursor() {
    const dotRef = useRef(null);
    const ringRef = useRef(null);
    const dotPosRef = useRef(null);
    const ringPosRef = useRef(null);

    useEffect(() => {
        const fine = window.matchMedia("(pointer: fine)");
        if (!fine.matches) return;

        const dot = dotRef.current;
        const ring = ringRef.current;
        const dotPos = dotPosRef.current;
        const ringPos = ringPosRef.current;
        const root = document.documentElement;
        root.classList.add("has-custom-cursor");

        let x = -100;
        let y = -100;
        let rx = x;
        let ry = y;
        let raf = 0;

        const setState = (name, value) => {
            ring.dataset[name] = value;
            dot.dataset[name] = value;
        };

        const onMove = (e) => {
            x = e.clientX;
            y = e.clientY;
            if (dot.dataset.visible !== "true") {
                rx = x;
                ry = y;
                setState("visible", "true");
            }
        };
        const onOver = (e) => {
            const target = e.target instanceof Element ? e.target : null;
            if (!target) return;

            if (target.closest(NATIVE)) {
                setState("native", "true");
                return;
            }
            setState("native", "false");

            const el = target.closest(INTERACTIVE);
            if (el) {
                setState("hover", "true");
            } else {
                setState("hover", "false");
            }
        };
        const onDown = () => setState("down", "true");
        const onUp = () => setState("down", "false");
        const onLeave = () => setState("visible", "false");
        const onEnter = () => setState("visible", "true");

        const tick = () => {
            rx += (x - rx) * 0.18;
            ry += (y - ry) * 0.18;
            dotPos.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            ringPos.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
            raf = requestAnimationFrame(tick);
        };
        tick();

        window.addEventListener("mousemove", onMove, { passive: true });
        document.addEventListener("mouseover", onOver, { passive: true });
        window.addEventListener("mousedown", onDown);
        window.addEventListener("mouseup", onUp);
        root.addEventListener("mouseleave", onLeave);
        root.addEventListener("mouseenter", onEnter);

        return () => {
            cancelAnimationFrame(raf);
            root.classList.remove("has-custom-cursor");
            window.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseover", onOver);
            window.removeEventListener("mousedown", onDown);
            window.removeEventListener("mouseup", onUp);
            root.removeEventListener("mouseleave", onLeave);
            root.removeEventListener("mouseenter", onEnter);
        };
    }, []);

    // Konum dış kapta (yalnızca transform: translate3d), görünüm iç kapta durur.
    // Boyut/ölçek sınıfları konumu hiçbir şekilde etkileyemez; iç öğe kendi merkezinde büyür/küçülür.
    return (
        <>
            <div ref={dotPosRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[100001] h-0 w-0">
                <div
                    ref={dotRef}
                    className="absolute left-0 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orchid-pink opacity-0 shadow-[0_0_12px_#b4398f] transition-[opacity,width,height] duration-200 data-[visible=true]:opacity-100 data-[hover=true]:h-1.5 data-[hover=true]:w-1.5 data-[native=true]:opacity-0 data-[down=true]:h-1.5 data-[down=true]:w-1.5"
                />
            </div>
            <div ref={ringPosRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[100001] h-0 w-0">
                <div
                    ref={ringRef}
                    className="absolute left-0 top-0 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orchid-petal/70 bg-orchid-powder/20 opacity-0 backdrop-blur-[1px] transition-[opacity,width,height,background-color] duration-200 data-[visible=true]:opacity-100 data-[hover=true]:h-9 data-[hover=true]:w-9 data-[hover=true]:bg-orchid-petal/20 data-[native=true]:opacity-0 data-[down=true]:h-6 data-[down=true]:w-6"
                />
            </div>
        </>
    );
}
