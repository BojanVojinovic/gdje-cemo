"use client";

import type { Category } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function HomeSearch({
  cities,
  defaultCity,
  categories,
}: {
  cities: string[];
  defaultCity: string;
  categories: Category[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [focused, setFocused] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    router.push(`/places?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="rounded-[1.25rem] border border-line bg-paper p-2 text-ink shadow-[var(--shadow-card)]" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      <div className="grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_auto]">
        <label className="sr-only" htmlFor="home-q">Pretraga</label>
        <input id="home-q" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Restoran, kafa, bar, ulica…" className="min-h-12 rounded-xl bg-void px-4 text-base text-ink" />
        <label className="sr-only" htmlFor="home-city">Grad</label>
        <select id="home-city" value={city} onChange={(event) => setCity(event.target.value)} className="min-h-12 rounded-xl bg-void px-3 text-ink">
          <option value="">Svi gradovi</option>
          {[defaultCity, ...cities.filter((item) => item !== defaultCity)].map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="home-category">Kategorija</label>
        <select id="home-category" value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-12 rounded-xl bg-void px-3 text-ink">
          <option value="">Sve kategorije</option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>{item.name}</option>
          ))}
        </select>
        <button type="submit" className="min-h-12 rounded-full bg-sea px-6 font-semibold text-snow">Traži</button>
      </div>
      {focused && categories.length ? (
        <div className="flex gap-2 overflow-x-auto px-2 py-3">
          {categories.slice(0, 6).map((item) => (
            <button key={item.id} type="button" className="shrink-0 border border-line px-3 py-1 text-sm" onMouseDown={(event) => event.preventDefault()} onClick={() => { setCategory(item.slug); }}>
              {item.name}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
