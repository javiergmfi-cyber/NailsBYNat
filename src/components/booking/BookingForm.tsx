"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { ServiceCategory } from "@/lib/utils/constants";
import type { BookingState } from "./useBookingFlow";
import { formatDate, formatTime, formatPrice, formatDuration } from "@/lib/utils/dates";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface BookingFormProps {
  category: ServiceCategory;
  state: BookingState;
  onUpdateField: (
    field:
      | "customerName"
      | "customerPhone"
      | "customerEmail"
      | "customerNotes"
      | "numChildren"
      | "childrenAges"
      | "address",
    value: string
  ) => void;
  onSubmit: () => void;
  onBack: () => void;
}

/**
 * Format a US phone number as the user types.
 * Strips non-digits, then formats as (XXX) XXX-XXXX.
 */
function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] as const },
  },
};

export function BookingForm({
  category,
  state,
  onUpdateField,
  onSubmit,
  onBack,
}: BookingFormProps) {
  const accent = category === "nails" ? "coral" : "palm";
  const badgeVariant = accent === "coral" ? "coral" : "palm";

  const isValid = useMemo(() => {
    const baseValid =
      state.customerName.trim().length >= 2 &&
      state.customerPhone.replace(/\D/g, "").length === 10 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.customerEmail);

    if (category === "babysitting") {
      return baseValid && state.address.trim().length >= 5;
    }
    return baseValid;
  }, [
    state.customerName,
    state.customerPhone,
    state.customerEmail,
    state.address,
    category,
  ]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    onUpdateField("customerPhone", formatted);
  };

  // Summary info
  const service = state.selectedService!;
  const timeRange =
    state.selectedSlots.length > 0
      ? `${formatTime(state.selectedSlots[0].start_time)} - ${formatTime(
          state.selectedSlots[state.selectedSlots.length - 1].end_time
        )}`
      : "";

  return (
    <div className="flex flex-col gap-6 has-bottom-bar">
      {/* Heading */}
      <div>
        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-espresso">
          Almost there
        </h2>
        <p className="mt-1 text-sm text-warm-gray">
          Just a few details and you&apos;re booked.
        </p>
      </div>

      {/* Appointment summary card */}
      <Card padding="sm">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              accent === "coral" ? "bg-coral/10" : "bg-palm/10"
            }`}
          >
            {category === "nails" ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className={accent === "coral" ? "text-coral" : "text-palm"}
              >
                <path
                  d="M12 3C7.5 3 4 7 4 12s3.5 9 8 9 8-4 8-9-3.5-9-8-9z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M12 3v9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="text-palm"
              >
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-espresso">{service.name}</p>
            <p className="text-sm text-warm-gray">
              {state.selectedDate ? formatDate(state.selectedDate) : ""}
              {timeRange && ` at ${timeRange}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="font-[family-name:var(--font-playfair)] font-semibold text-espresso">
              {formatPrice(service.price_cents)}
            </span>
            <Badge variant={badgeVariant}>{formatDuration(service.duration_min)}</Badge>
          </div>
        </div>
      </Card>

      {/* Form fields */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-5"
      >
        <motion.div variants={itemVariants}>
          <Input
            label="Your Name"
            value={state.customerName}
            onChange={(e) => onUpdateField("customerName", e.target.value)}
            autoComplete="name"
            required
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Input
            label="Phone Number"
            type="tel"
            inputMode="tel"
            value={state.customerPhone}
            onChange={handlePhoneChange}
            autoComplete="tel"
            required
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Input
            label="Email"
            type="email"
            inputMode="email"
            value={state.customerEmail}
            onChange={(e) => onUpdateField("customerEmail", e.target.value)}
            autoComplete="email"
            required
          />
        </motion.div>

        {/* Babysitting-specific fields */}
        {category === "babysitting" && (
          <>
            <motion.div variants={itemVariants}>
              <Input
                label="Number of Children"
                type="number"
                inputMode="numeric"
                min="1"
                max="10"
                value={state.numChildren}
                onChange={(e) => onUpdateField("numChildren", e.target.value)}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Input
                label="Children's Ages"
                value={state.childrenAges}
                onChange={(e) =>
                  onUpdateField("childrenAges", e.target.value)
                }
                placeholder="e.g. 3 and 5"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Input
                label="Address"
                value={state.address}
                onChange={(e) => onUpdateField("address", e.target.value)}
                autoComplete="street-address"
                required
              />
            </motion.div>
          </>
        )}

        <motion.div variants={itemVariants}>
          <Textarea
            label={
              category === "nails"
                ? "Notes for Natalia"
                : "Tell us about your kids"
            }
            value={state.customerNotes}
            onChange={(e) => onUpdateField("customerNotes", e.target.value)}
            placeholder={
              category === "nails"
                ? "Anything Natalia should know? Nail inspo welcome!"
                : "Tell us about your kids \u2014 ages, any allergies, special needs"
            }
          />
        </motion.div>
      </motion.div>

      {/* Error display */}
      {state.error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-terracotta"
        >
          {state.error}
        </motion.p>
      )}

      {/* Sticky bottom bar */}
      <div className="mobile-bottom-bar">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4">
          <Button variant="ghost" onClick={onBack} disabled={state.isSubmitting} className="min-h-[44px]">
            Back
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={!isValid || state.isSubmitting}
            loading={state.isSubmitting}
            onClick={onSubmit}
            className={`w-full sm:w-auto ${
              accent === "palm"
                ? "bg-palm hover:bg-palm/90 focus-visible:ring-palm/40"
                : ""
            }`}
          >
            {state.isSubmitting ? "Booking..." : "Book Appointment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
