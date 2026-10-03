"use client";

import { useState } from "react";
import type { VenueImage } from "@/types";

export function Gallery({ images }: { images: VenueImage[] }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <section>
      <h2 className="font-serif text-3xl">Fotografije</h2>
      <div className="mt-4 overflow-hidden rounded-lg bg-line">
        {current?.url ? (
          <img src={current.url} alt={current.alt ?? ""} className="max-h-[480px] w-full object-cover" />
        ) : null}
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto">
        {images.map((image, index) => (
          <button key={image.id} type="button" onClick={() => setActive(index)} className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl border ${index === active ? "border-sea" : "border-transparent"}`} aria-label={image.alt ?? `Fotografija ${index + 1}`}>
            {image.thumb_url ? (
              <img src={image.thumb_url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
