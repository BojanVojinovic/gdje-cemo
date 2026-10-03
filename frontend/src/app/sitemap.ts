import { api } from "@/lib/api";
import type { Venue } from "@/types";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const staticRoutes = ["", "/places"].map((path) => ({
    url: `${site}${path || "/"}`,
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  try {
    const response = await api<Venue[]>("/venues?per_page=50&sort=newest");
    const pages = Math.min(response.meta?.last_page ?? 1, 20);
    const venues = [...response.data];

    for (let page = 2; page <= pages; page += 1) {
      const next = await api<Venue[]>(`/venues?per_page=50&sort=newest&page=${page}`);
      venues.push(...next.data);
    }

    return [
      ...staticRoutes,
      ...venues.map((venue) => ({
        url: `${site}/venue/${venue.slug}`,
        lastModified: venue.created_at,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
