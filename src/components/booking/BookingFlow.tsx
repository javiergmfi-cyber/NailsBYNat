"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ServiceCategory } from "@/lib/utils/constants";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useBookingFlow } from "./useBookingFlow";
import { ServiceSelector } from "./ServiceSelector";
import { DateTimeSelector } from "./DateTimeSelector";
import { BookingForm } from "./BookingForm";
import { BookingConfirmation } from "./BookingConfirmation";

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

const STEP_LABELS = ["Service", "Date & Time", "Your Info", "Confirmed"];

interface BookingFlowProps {
  category: ServiceCategory;
}

export function BookingFlow({ category }: BookingFlowProps) {
  const {
    state,
    direction,
    nextStep,
    prevStep,
    setService,
    setDate,
    setSlots,
    updateField,
    submitBooking,
    reset,
  } = useBookingFlow(category);

  const accent = category === "nails" ? "coral" : "palm";

  return (
    <div className="flex min-h-[100dvh] flex-col pt-4 sm:min-h-[60vh] sm:pt-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-espresso sm:text-3xl">
          {category === "nails" ? "Book an Appointment" : "Book a Sitter"}
        </h1>
        <p className="mt-1 text-sm text-warm-gray">
          {STEP_LABELS[state.step - 1]}
          {state.step < 4 && (
            <span className="text-warm-gray/60">
              {" "}
              &middot; Step {state.step} of 4
            </span>
          )}
        </p>
      </div>

      {/* Progress */}
      <ProgressBar progress={state.step / 4} />

      {/* Error banner */}
      {state.error && state.step !== 4 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-[var(--radius-md)] bg-terracotta/10 px-4 py-3 text-sm text-terracotta"
        >
          {state.error}
        </motion.div>
      )}

      {/* Steps */}
      <div className="relative mt-6 flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={state.step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            {state.step === 1 && (
              <ServiceSelector
                category={category}
                accent={accent}
                selectedService={state.selectedService}
                onSelect={setService}
                onNext={nextStep}
              />
            )}

            {state.step === 2 && (
              <DateTimeSelector
                accent={accent}
                service={state.selectedService!}
                selectedDate={state.selectedDate}
                selectedSlots={state.selectedSlots}
                onSelectDate={setDate}
                onSelectSlots={setSlots}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {state.step === 3 && (
              <BookingForm
                category={category}
                state={state}
                onUpdateField={updateField}
                onSubmit={submitBooking}
                onBack={prevStep}
              />
            )}

            {state.step === 4 && (
              <BookingConfirmation
                state={state}
                onBookAnother={reset}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
