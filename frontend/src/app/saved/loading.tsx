import { VenueGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div className="h-10 w-64 animate-pulse rounded bg-line" />
      <VenueGridSkeleton />
    </div>
  );
}
