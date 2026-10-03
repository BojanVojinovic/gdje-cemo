export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
      <div className="h-12 w-48 animate-pulse rounded-md bg-line" />
      <div className="h-64 animate-pulse rounded-lg bg-line" />
    </div>
  );
}
