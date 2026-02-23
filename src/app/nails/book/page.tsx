"use client";

import { BookingFlow } from "@/components/booking/BookingFlow";

export default function NailsBookPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BookingFlow category="nails" />
    </div>
  );
}
