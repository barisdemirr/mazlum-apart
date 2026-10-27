"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";

/**
 * Sürükle-bırak sıralanabilir liste (ek paket yok; tarayıcı sürükle-bırak olayları). Dokunmatik ekran için ▲▼ düğmeleri de vardır.
 * İç içe kullanılabilir (daire türü kartları ve içindeki oda seçenekleri): her liste yalnızca KENDİ öğesinin sürüklenmesini işler,
 * olayları üst listeye geçirmez; bir listenin öğesi başka bir listeye bırakılamaz.
 *
 *  items: [{ id, ... }] · onReorder(yeniIdSırası) → kaydeder (promise döner) · children: (item, { handle, dragging }) => node
 *  Sıra yerelde hemen güncellenir; kaydetme hata verirse eski sıraya dönülür.
 */
export default function SortableList({ items, onReorder, children, className = "", itemClassName = "", as: Tag = "div" }) {
    const [order, setOrder] = useState(items.map((i) => i.id));
    const [dragId, setDragId] = useState(null);
    const [overId, setOverId] = useState(null);
    const [armed, setArmed] = useState(null);
    const saving = useRef(false);

    // Tutamaç bırakıldığında (fare tutamacın dışında bırakılsa da) öğe yeniden sürüklenemez olur; kart içindeki metin seçilebilir kalır
    useEffect(() => {
        if (!armed) return;
        const disarm = () => setArmed(null);
        window.addEventListener("mouseup", disarm);
        return () => window.removeEventListener("mouseup", disarm);
    }, [armed]);

    // Sunucudan gelen sıra değişince (kayıt sonrası yenileme) yerel sırayı eşitle
    useEffect(() => { setOrder(items.map((i) => i.id)); }, [items]);

    const byId = new Map(items.map((i) => [i.id, i]));
    const list = order.map((id) => byId.get(id)).filter(Boolean);

    const commit = async (next) => {
        if (saving.current) return;
        const prev = order;
        setOrder(next);
        saving.current = true;
        try {
            const ok = await onReorder(next);
            if (ok === false) setOrder(prev);
        } catch {
            setOrder(prev);
        } finally {
            saving.current = false;
        }
    };

    const move = (id, delta) => {
        const i = order.indexOf(id);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= order.length) return;
        const next = order.slice();
        next.splice(j, 0, next.splice(i, 1)[0]);
        commit(next);
    };

    const drop = (targetId) => {
        if (!dragId || dragId === targetId) return;
        const next = order.filter((id) => id !== dragId);
        next.splice(next.indexOf(targetId) + (order.indexOf(dragId) < order.indexOf(targetId) ? 1 : 0), 0, dragId);
        commit(next);
    };

    return (
        <Tag className={className}>
            {list.map((item, idx) => {
                const dragging = dragId === item.id;
                const handle = (
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-ad-muted" onClick={(e) => e.stopPropagation()}>
                        <span
                            title="Sürükleyerek sırala"
                            aria-label="Sürükleyerek sırala"
                            className="inline-flex cursor-grab touch-none select-none rounded-md p-0.5 hover:bg-ad-sunken active:cursor-grabbing"
                            onMouseDown={() => setArmed(item.id)}
                            onMouseUp={() => setArmed(null)}
                        >
                            <Icon name="drag_indicator" className="text-[20px]" />
                        </span>
                        <span className="flex flex-col">
                            <button type="button" aria-label="Yukarı taşı" disabled={idx === 0} onClick={() => move(item.id, -1)} className="leading-none hover:text-ad-brand disabled:opacity-30"><Icon name="keyboard_arrow_up" className="text-[16px]" /></button>
                            <button type="button" aria-label="Aşağı taşı" disabled={idx === list.length - 1} onClick={() => move(item.id, 1)} className="leading-none hover:text-ad-brand disabled:opacity-30"><Icon name="keyboard_arrow_down" className="text-[16px]" /></button>
                        </span>
                    </span>
                );
                return (
                    <div
                        key={item.id}
                        draggable={armed === item.id}
                        onDragStart={(e) => {
                            e.stopPropagation(); // iç listedeki sürükleme dış listeyi tetiklemesin
                            setDragId(item.id);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", item.id);
                        }}
                        onDragOver={(e) => {
                            if (!dragId) return; // bu listenin sürüklemesi değil: üst listeye bırak
                            e.preventDefault();
                            e.stopPropagation();
                            if (overId !== item.id) setOverId(item.id);
                        }}
                        onDragLeave={() => { if (overId === item.id) setOverId(null); }}
                        onDrop={(e) => {
                            if (!dragId) return;
                            e.preventDefault();
                            e.stopPropagation();
                            drop(item.id);
                        }}
                        onDragEnd={(e) => { e.stopPropagation(); setDragId(null); setOverId(null); setArmed(null); }}
                        className={`${itemClassName} ${dragging ? "opacity-40" : ""} ${overId === item.id && dragId && dragId !== item.id ? "ring-2 ring-ad-brand" : ""}`}
                    >
                        {children(item, { handle, dragging })}
                    </div>
                );
            })}
        </Tag>
    );
}
