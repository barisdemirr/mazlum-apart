"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE = "[data-cursor], a, button, [role='button'], summary, label";
const NATIVE = "input, textarea, select, [contenteditable='true']";

/**
 * Masaüstü özel imleci: küçük nokta + gecikmeyle takip eden halka.
 * [data-cursor="Metin"] olan öğelerin üstünde halka büyür ve metni gösterir.
 * Yalnızca ince imleçli (fare) cihazlarda çalışır; dokunmatikte hiçbir şey yapmaz.
 * Form alanlarında sistem imleci kullanılır.
 */
export default function CustomCursor() {
    const dotRef = useRef(null);
    const ringRef = useRef(null);

    useEffect(() => {
        const fine = window.matchMedia("(pointer: fine)");
        if (!fine.matches) return;

        const dot = dotRef.current;
        const ring = ringRef.current;
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
                const label = el.getAttribute("data-cursor") || "";
                ring.textContent = label;
                setState("hover", "true");
                ring.dataset.label = label ? "true" : "false";
            } else {
                ring.textContent = "";
                setState("hover", "false");
                ring.dataset.label = "false";
            }
        };
        const onDown = () => setState("down", "true");
        const onUp = () => setState("down", "false");
        const onLeave = () => setState("visible", "false");
        const onEnter = () => setState("visible", "true");

        const tick = () => {
            rx += (x - rx) * 0.18;
            ry += (y - ry) * 0.18;
            dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
            ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
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

    return (
        <>
            <div
                ref={dotRef}
                aria-hidden="true"
                className="pointer-events-none fixed left-0 top-0 z-[100001] h-2.5 w-2.5 rounded-full bg-orchid-pink opacity-0 shadow-[0_0_12px_#b4398f] transition-[opacity,width,height] duration-200 data-[visible=true]:opacity-100 data-[hover=true]:h-1.5 data-[hover=true]:w-1.5 data-[native=true]:opacity-0 data-[down=true]:scale-75"
            />
            <div
                ref={ringRef}
                aria-hidden="true"
                className="pointer-events-none fixed left-0 top-0 z-[100001] flex h-10 w-10 items-center justify-center rounded-full border border-orchid-petal/70 bg-orchid-powder/20 text-[10px] font-bold uppercase tracking-widest text-orchid-pink opacity-0 backdrop-blur-[1px] transition-[opacity,width,height,background-color] duration-200 data-[visible=true]:opacity-100 data-[hover=true]:h-14 data-[hover=true]:w-14 data-[hover=true]:bg-orchid-petal/20 data-[label=true]:h-[4.5rem] data-[label=true]:w-[4.5rem] data-[label=true]:bg-white/70 data-[native=true]:opacity-0 data-[down=true]:h-8 data-[down=true]:w-8"
            />
        </>
    );
}
