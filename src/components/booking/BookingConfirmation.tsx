"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import type { BookingState } from "./useBookingFlow";
import { formatDate, formatTime } from "@/lib/utils/dates";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface BookingConfirmationProps {
  state: BookingState;
  onBookAnother: () => void;
}

// SVG checkmark path animation
const checkVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.5, delay: 0.3, ease: "easeOut" as const },
      opacity: { duration: 0.2, delay: 0.3 },
    },
  },
};

const circleVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  },
};

export function BookingConfirmation({
  state,
  onBookAnother,
}: BookingConfirmationProps) {
  const confettiFired = useRef(false);

  // Fire confetti on mount
  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;

    // Small delay so the checkmark animation is visible first
    const timer = setTimeout(() => {
      // Coral and gold confetti burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: [
          "#E8836B", // coral
          "#F4B5A5", // coral-light
          "#C9A96E", // gold
          "#DFC99A", // gold-light
          "#7BA387", // palm
        ],
        disableForReducedMotion: true,
      });
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const service = state.selectedService;
  const dateStr = state.selectedDate ? formatDate(state.selectedDate) : "";
  const timeStr =
    state.selectedSlots.length > 0
      ? formatTime(state.selectedSlots[0].start_time)
      : "";

  return (
    <div className="flex flex-col items-center gap-10 pb-12 pt-4 text-center">
      {/* Animated checkmark */}
      <motion.div
        variants={circleVariants}
        initial="hidden"
        animate="visible"
        className="flex h-20 w-20 items-center justify-center rounded-full bg-palm/10"
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          className="text-palm"
        >
          {/* Background circle pulse */}
          <motion.circle
            cx="20"
            cy="20"
            r="18"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.2 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          />
          {/* Checkmark path */}
          <motion.path
            d="M12 20.5L17.5 26L28 15"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            variants={checkVariants}
            initial="hidden"
            animate="visible"
          />
        </svg>
      </motion.div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4, ease: [0.32, 0.72, 0, 1] as const }}
      >
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-espresso sm:text-3xl">
          You&apos;re all set!
        </h2>
        {dateStr && timeStr && (
          <p className="mt-2 text-warm-gray">
            See you{" "}
            <span className="font-medium text-espresso">
              {dateStr}
            </span>{" "}
            at{" "}
            <span className="font-medium text-espresso">{timeStr}</span>
          </p>
        )}
      </motion.div>

      {/* Details card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.4, ease: [0.32, 0.72, 0, 1] as const }}
        className="w-full max-w-sm"
      >
        <Card padding="lg">
          <div className="flex flex-col gap-3 text-left">
            {service && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-gray">Service</span>
                <span className="text-sm font-medium text-espresso">
                  {service.name}
                </span>
              </div>
            )}
            {dateStr && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-gray">Date</span>
                <span className="text-sm font-medium text-espresso">
                  {dateStr}
                </span>
              </div>
            )}
            {state.selectedSlots.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-gray">Time</span>
                <span className="text-sm font-medium text-espresso">
                  {formatTime(state.selectedSlots[0].start_time)}
                  {" - "}
                  {formatTime(
                    state.selectedSlots[state.selectedSlots.length - 1].end_time
                  )}
                </span>
              </div>
            )}
            {state.customerName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-gray">Name</span>
                <span className="text-sm font-medium text-espresso">
                  {state.customerName}
                </span>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Confirmation message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="font-[family-name:var(--font-caveat)] text-lg text-warm-gray"
      >
        Natalia will confirm your appointment shortly.
      </motion.p>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.3, ease: [0.32, 0.72, 0, 1] as const }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Button variant="primary" onClick={onBookAnother} className="w-full min-h-[48px] sm:w-auto">
          Book Another
        </Button>
        <Link href="/" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full min-h-[48px]">
            Back to Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
