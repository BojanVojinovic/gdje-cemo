import { EventFiltersSkeleton, EventGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="h-10 w-48 animate-pulse rounded bg-line" />
      <EventFiltersSkeleton />
      <EventGridSkeleton />
    </div>
  );
}
