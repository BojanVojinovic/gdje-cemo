"use client";

import { VenueForm } from "@/components/venue-form";

export default function NewVenuePage() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">Novo mjesto</h1>
      <VenueForm />
    </div>
  );
}
