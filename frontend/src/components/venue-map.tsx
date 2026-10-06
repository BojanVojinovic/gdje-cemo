"use client";

import { Skeleton } from "@/components/ui";
import { useEffect, useRef, useState } from "react";

type Props = {
  latitude: number;
  longitude: number;
  label: string;
};

export function VenueMap({ latitude, longitude, label }: Props) {
  const node = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let map: { remove: () => void } | null = null;
    let active = true;

    async function mount() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!active || !node.current) return;

      const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? "&copy; OpenStreetMap";

      const instance = L.map(node.current, { scrollWheelZoom: false }).setView([latitude, longitude], 15);
      L.tileLayer(tileUrl, { attribution }).addTo(instance);
      L.circleMarker([latitude, longitude], {
        radius: 9,
        color: "#083330",
        weight: 2,
        fillColor: "#c4513c",
        fillOpacity: 1,
      }).addTo(instance).bindPopup(label);
      requestAnimationFrame(() => instance.invalidateSize());
      map = instance;
      setReady(true);
    }

    void mount();

    return () => {
      active = false;
      map?.remove();
    };
  }, [latitude, longitude, label]);

  return (
    <div className="relative h-40 w-full overflow-hidden rounded-lg border border-line">
      {ready ? null : <Skeleton className="absolute inset-0 h-full rounded-none" />}
      <div ref={node} className="h-full w-full" role="img" aria-label={`Mapa: ${label}`} />
    </div>
  );
}
