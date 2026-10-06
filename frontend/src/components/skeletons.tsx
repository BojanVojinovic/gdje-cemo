import type { ReactNode } from "react";

function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-line ${className}`} />;
}

function Busy({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={className} aria-busy="true" aria-live="polite">
      <span className="sr-only">Učitavanje</span>
      {children}
    </div>
  );
}

function slots(count: number) {
  return Array.from({ length: count }, (_, index) => index);
}

export function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Bone className="h-4 w-20" />
      <Bone className="h-11 w-full rounded-md" />
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden border border-line bg-paper shadow-[var(--shadow-card)]">
      <div className="aspect-[16/10] animate-pulse bg-line" />
      <div className="space-y-2 p-4">
        <Bone className="h-3 w-2/5" />
        <Bone className="h-7 w-4/5" />
        <Bone className="h-4 w-3/5" />
      </div>
    </div>
  );
}

export function EventGridSkeleton({ count = 4, className = "grid gap-5 sm:grid-cols-2" }: { count?: number; className?: string }) {
  return (
    <Busy>
      <ul className={className}>
        {slots(count).map((index) => (
          <li key={index}><EventCardSkeleton /></li>
        ))}
      </ul>
    </Busy>
  );
}

export function EventFiltersSkeleton() {
  return (
    <Busy className="grid gap-3 sm:grid-cols-3">
      {slots(6).map((index) => <FieldSkeleton key={index} />)}
    </Busy>
  );
}

export function VenueCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <article className={`overflow-hidden rounded-[1.25rem] border border-line bg-paper shadow-[var(--shadow-card)] ${featured ? "sm:col-span-2" : ""}`}>
      <div className={`animate-pulse bg-line ${featured ? "aspect-[16/10]" : "aspect-[4/3]"}`} />
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <Bone className="h-6 w-2/3" />
          <Bone className="h-4 w-8" />
        </div>
        <Bone className="h-4 w-1/2" />
        <Bone className="h-4 w-1/3" />
      </div>
    </article>
  );
}

export function VenueGridSkeleton({ count = 6, featuredFirst = false }: { count?: number; featuredFirst?: boolean }) {
  return (
    <Busy>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {slots(count).map((index) => (
          <VenueCardSkeleton key={index} featured={featuredFirst && index === 0} />
        ))}
      </div>
    </Busy>
  );
}

export function FilterPanelSkeleton() {
  return (
    <Busy className="space-y-4">
      <Bone className="h-9 w-32 rounded-full" />
      {slots(5).map((index) => <FieldSkeleton key={index} />)}
      <Bone className="h-11 w-full" />
      <Bone className="h-11 w-full" />
      <div className="space-y-2">
        <Bone className="h-4 w-20" />
        {slots(4).map((index) => <Bone key={index} className="h-8 w-full" />)}
      </div>
    </Busy>
  );
}

export function ReviewCardSkeleton() {
  return (
    <li className="rounded-lg border border-line bg-paper p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Bone className="h-4 w-36" />
          <Bone className="h-3 w-24" />
        </div>
        <Bone className="h-4 w-20" />
      </div>
      <Bone className="mt-3 h-4 w-full" />
      <Bone className="mt-2 h-4 w-4/5" />
      <Bone className="mt-2 h-4 w-2/3" />
    </li>
  );
}

export function ReviewListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Busy>
      <ul className="space-y-4">
        {slots(count).map((index) => <ReviewCardSkeleton key={index} />)}
      </ul>
    </Busy>
  );
}

export function ProfileReviewSkeleton() {
  return (
    <li className="rounded-lg border border-line bg-paper p-4">
      <Bone className="h-5 w-40" />
      <Bone className="mt-2 h-4 w-full" />
      <Bone className="mt-2 h-4 w-3/4" />
      <div className="mt-3 flex gap-2">
        <Bone className="h-11 w-24 rounded-full" />
        <Bone className="h-11 w-20 rounded-full" />
      </div>
    </li>
  );
}

export function ProfileReviewListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Busy>
      <ul className="space-y-3">
        {slots(count).map((index) => <ProfileReviewSkeleton key={index} />)}
      </ul>
    </Busy>
  );
}

export function ReservationCardSkeleton() {
  return (
    <li className="rounded-lg border border-line bg-paper p-4">
      <Bone className="h-5 w-40" />
      <Bone className="mt-2 h-4 w-56" />
      <Bone className="mt-2 h-4 w-2/3" />
      <Bone className="mt-3 h-11 w-24 rounded-full" />
    </li>
  );
}

export function ReservationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Busy>
      <ul className="space-y-3">
        {slots(count).map((index) => <ReservationCardSkeleton key={index} />)}
      </ul>
    </Busy>
  );
}

export function NoticeCardSkeleton() {
  return (
    <li className="border border-line border-l-4 border-l-line bg-paper px-4 py-3">
      <Bone className="h-5 w-1/2" />
      <Bone className="mt-2 h-4 w-full" />
      <Bone className="mt-2 h-3 w-32" />
    </li>
  );
}

export function NoticeListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Busy className="space-y-6">
      <div className="space-y-2 rounded-lg border border-line bg-paper p-4">
        {slots(4).map((index) => (
          <div key={index} className="flex min-h-11 items-center gap-2">
            <Bone className="h-4 w-4" />
            <Bone className="h-4 w-48" />
          </div>
        ))}
        <Bone className="h-11 w-28 rounded-full" />
      </div>
      <ul className="space-y-2">
        {slots(count).map((index) => <NoticeCardSkeleton key={index} />)}
      </ul>
    </Busy>
  );
}

export function InfoCardSkeleton() {
  return (
    <li className="rounded-lg border border-line bg-paper p-4">
      <Bone className="h-3 w-1/3" />
      <Bone className="mt-2 h-7 w-2/3" />
      <Bone className="mt-3 h-4 w-full" />
      <Bone className="mt-2 h-4 w-4/5" />
      <div className="mt-3 flex flex-wrap gap-2">
        <Bone className="h-11 w-24 rounded-full" />
        <Bone className="h-11 w-24 rounded-full" />
      </div>
    </li>
  );
}

export function InfoListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Busy>
      <ul className="space-y-3">
        {slots(count).map((index) => <InfoCardSkeleton key={index} />)}
      </ul>
    </Busy>
  );
}

export function TableRowSkeleton() {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <Bone className="h-4 w-4" />
        <Bone className="h-4 w-64" />
      </div>
      <Bone className="h-4 w-24" />
    </li>
  );
}

export function TableListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Busy>
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-paper">
        {slots(count).map((index) => <TableRowSkeleton key={index} />)}
      </ul>
    </Busy>
  );
}

export function StatGridSkeleton({ count = 4, className = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4" }: { count?: number; className?: string }) {
  return (
    <Busy className={className}>
      {slots(count).map((index) => (
        <div key={index} className="border border-line bg-paper p-4">
          <Bone className="h-3 w-24" />
          <Bone className="mt-3 h-10 w-16" />
        </div>
      ))}
    </Busy>
  );
}

export function ContentCardSkeleton() {
  return (
    <li className="border border-line bg-paper p-5">
      <Bone className="h-3 w-24" />
      <Bone className="mt-2 h-7 w-1/2" />
      <Bone className="mt-3 h-4 w-full" />
      <Bone className="mt-2 h-4 w-3/4" />
    </li>
  );
}

export function HospitalitySkeleton() {
  return (
    <Busy className="space-y-10">
      <section className="space-y-3">
        <Bone className="h-8 w-32" />
        <div className="aspect-[4/3] max-w-md animate-pulse border border-line bg-line" />
        <ul className="grid gap-2 sm:grid-cols-2">
          {slots(4).map((index) => (
            <li key={index} className="border border-line bg-paper px-3 py-2">
              <Bone className="h-4 w-2/3" />
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <Bone className="h-8 w-40" />
        <ul className="space-y-3">
          {slots(2).map((index) => <ContentCardSkeleton key={index} />)}
        </ul>
      </section>
    </Busy>
  );
}

export function CalendarSkeleton() {
  return (
    <Busy>
      <div className="mb-2 flex items-center justify-between">
        <Bone className="h-7 w-28" />
        <Bone className="h-11 w-48 rounded-md" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {slots(7).map((index) => <Bone key={`label-${index}`} className="h-4" />)}
        {slots(35).map((index) => <div key={index} className="min-h-16 animate-pulse rounded-xl border border-line bg-line/40" />)}
      </div>
    </Busy>
  );
}

export function VenuePageSkeleton() {
  return (
    <Busy>
      <div className="h-[58vw] max-h-[560px] min-h-72 animate-pulse bg-line" />
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative -mt-16 border border-line bg-paper p-5 sm:-mt-20 sm:p-8">
          <Bone className="h-3 w-48" />
          <Bone className="mt-3 h-12 w-2/3" />
          <div className="mt-4 flex gap-3">
            <Bone className="h-4 w-24" />
            <Bone className="h-4 w-16" />
            <Bone className="h-4 w-20" />
          </div>
          <div className="mt-5 flex gap-2">
            <Bone className="h-11 w-32 rounded-full" />
            <Bone className="h-11 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <Bone className="h-8 w-32" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-3/4" />
          <HospitalitySkeleton />
          <ReviewListSkeleton />
        </div>
        <aside className="w-full space-y-3 lg:w-80">
          <Bone className="h-8 w-40" />
          {slots(7).map((index) => <Bone key={index} className="h-5 w-full" />)}
          <div className="h-40 animate-pulse bg-line" />
        </aside>
      </div>
    </Busy>
  );
}

export function EventDetailSkeleton() {
  return (
    <Busy>
      <div className="h-[46vw] max-h-[480px] min-h-56 animate-pulse bg-line" />
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[1.4fr_0.7fr]">
        <div className="space-y-4">
          <Bone className="h-3 w-24" />
          <Bone className="h-14 w-4/5" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-2/3" />
        </div>
        <aside className="h-fit space-y-3 border border-line bg-paper p-5">
          <Bone className="h-5 w-32" />
          <Bone className="h-4 w-24" />
          <Bone className="h-4 w-40" />
          <Bone className="h-5 w-20" />
          <Bone className="h-11 w-32 rounded-full" />
        </aside>
      </div>
    </Busy>
  );
}

export function PlacesPageSkeleton() {
  return (
    <Busy className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr]">
      <div className="lg:hidden"><Bone className="h-11 w-28 rounded-full" /></div>
      <aside className="hidden border border-line bg-paper p-4 lg:block">
        <FilterPanelSkeleton />
      </aside>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Bone className="h-10 w-32" />
          <Bone className="h-11 w-full max-w-48 rounded-md" />
        </div>
        <VenueGridSkeleton />
      </section>
    </Busy>
  );
}

export function HomeSkeleton() {
  return (
    <Busy>
      <div className="border-b border-line bg-void">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-[0.92fr_1.08fr] md:py-12">
          <div className="min-h-80 animate-pulse rounded-[1.75rem] bg-line" />
          <div className="min-h-80 animate-pulse rounded-[1.75rem] bg-line" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-12">
          <Bone className="h-10 w-2/3" />
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {slots(3).map((index) => <Bone key={index} className="h-11 rounded-md" />)}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-16 px-4 py-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {slots(4).map((index) => <Bone key={index} className="h-20 rounded-2xl" />)}
        </div>
        <VenueGridSkeleton featuredFirst />
        <VenueGridSkeleton />
        <EventGridSkeleton count={3} className="grid gap-4 md:grid-cols-3" />
      </div>
    </Busy>
  );
}

export function ProfileFormSkeleton() {
  return (
    <Busy className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Bone className="h-12 w-48" />
      <div className="flex gap-4">
        {slots(4).map((index) => <Bone key={index} className="h-8 w-24" />)}
      </div>
      <div className="space-y-3 rounded-lg border border-line bg-paper p-5">
        <Bone className="h-16 w-16 rounded-full" />
        {slots(5).map((index) => <FieldSkeleton key={index} />)}
        <Bone className="h-11 w-36 rounded-full" />
      </div>
      <ProfileReviewListSkeleton />
    </Busy>
  );
}

export function UserTableSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Busy>
      <div className="overflow-x-auto rounded-lg border border-line bg-paper">
        <div className="grid min-w-[720px] grid-cols-6 gap-3 p-3">
          {slots(6).map((index) => <Bone key={index} className="h-4" />)}
        </div>
        {slots(count).map((row) => (
          <div key={row} className="grid min-w-[720px] grid-cols-6 gap-3 border-t border-line p-3">
            <Bone className="h-4 w-4" />
            <Bone className="h-4" />
            <Bone className="h-4" />
            <Bone className="h-11 rounded-md" />
            <Bone className="h-4" />
            <Bone className="h-4" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

export function ReservePageSkeleton() {
  return (
    <Busy className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Bone className="h-4 w-32" />
      <Bone className="h-3 w-24" />
      <Bone className="h-12 w-2/3" />
      <div className="grid gap-3 border border-line bg-paper p-4 sm:grid-cols-4">
        {slots(4).map((index) => <FieldSkeleton key={index} />)}
        <Bone className="h-11 w-56 rounded-full sm:col-span-4" />
      </div>
      <div className="aspect-[4/3] max-w-md animate-pulse border border-line bg-line" />
    </Busy>
  );
}

export function FloorEditorSkeleton() {
  return (
    <Busy className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Bone className="h-10 w-40" />
        <Bone className="h-11 w-28 rounded-full" />
      </div>
      <div className="aspect-[4/3] max-w-3xl animate-pulse border border-line bg-line" />
    </Busy>
  );
}

export function TableOrderSkeleton() {
  return (
    <Busy className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Bone className="h-3 w-40" />
      <Bone className="h-10 w-48" />
      <Bone className="h-4 w-56" />
      {slots(4).map((index) => (
        <div key={index} className="flex items-center justify-between border border-line bg-paper p-4">
          <div className="space-y-2">
            <Bone className="h-5 w-40" />
            <Bone className="h-4 w-16" />
          </div>
          <Bone className="h-11 w-24 rounded-full" />
        </div>
      ))}
    </Busy>
  );
}

export function SettingsFormSkeleton() {
  return (
    <Busy className="space-y-8">
      <div className="space-y-3 rounded-lg border border-line bg-paper p-5">
        {slots(4).map((index) => <FieldSkeleton key={index} />)}
        <Bone className="h-11 w-28 rounded-full" />
      </div>
      <div className="space-y-3">
        <Bone className="h-7 w-48" />
        <div className="grid gap-2 md:grid-cols-3">
          {slots(3).map((index) => <Bone key={index} className="h-11 rounded-md" />)}
        </div>
        <ul className="space-y-2">
          {slots(3).map((index) => (
            <li key={index} className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3">
              <Bone className="h-4 w-40" />
              <Bone className="h-4 w-16" />
            </li>
          ))}
        </ul>
      </div>
    </Busy>
  );
}
