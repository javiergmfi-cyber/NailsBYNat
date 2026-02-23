"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { Service, AvailabilitySlot } from "@/types/supabase";
import { formatDate, formatTime, toBusinessDate } from "@/lib/utils/dates";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface DateTimeSelectorProps {
  accent: "coral" | "palm";
  service: Service;
  selectedDate: string | null;
  selectedSlots: AvailabilitySlot[];
  onSelectDate: (date: string | null) => void;
  onSelectSlots: (slots: AvailabilitySlot[]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface DateGroup {
  date: string;
  slotCount: number;
}

interface QuickPick {
  date: string;
  startTime: string;
  slots: AvailabilitySlot[];
}

function DateCardSkeleton() {
  return (
    <div className="shimmer rounded-[var(--radius-lg)] p-4" style={{ height: 64 }} />
  );
}

function isConsecutive(slots: AvailabilitySlot[]): boolean {
  for (let i = 1; i < slots.length; i++) {
    if (slots[i].start_time !== slots[i - 1].end_time) return false;
  }
  return true;
}

export function DateTimeSelector({
  accent,
  service,
  selectedDate,
  selectedSlots,
  onSelectDate,
  onSelectSlots,
  onNext,
  onBack,
}: DateTimeSelectorProps) {
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [slotsForDate, setSlotsForDate] = useState<AvailabilitySlot[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // How many consecutive 30-min slots we need
  const slotsNeeded = Math.ceil(service.duration_min / 30);

  // Quick picks: stored separately
  const [quickPicks, setQuickPicks] = useState<QuickPick[]>([]);

  const accentBg = accent === "coral" ? "bg-coral" : "bg-palm";
  const accentText = accent === "coral" ? "text-coral" : "text-palm";
  const accentBgLight = accent === "coral" ? "bg-coral/10" : "bg-palm/10";
  const accentRing = accent === "coral" ? "ring-coral/30" : "ring-palm/30";
  const badgeVariant = accent === "coral" ? "coral" : "palm";

  // Fetch available dates
  useEffect(() => {
    let cancelled = false;
    async function fetchDates() {
      setLoadingDates(true);
      const supabase = createClient();
      const today = toBusinessDate(new Date());

      // Get 4 weeks of availability
      const fourWeeksOut = new Date();
      fourWeeksOut.setDate(fourWeeksOut.getDate() + 28);
      const endDate = toBusinessDate(fourWeeksOut);

      const { data } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("status", "available")
        .gte("date", today)
        .lte("date", endDate)
        .order("date")
        .order("start_time");

      if (cancelled) return;

      const rows = (data ?? []) as AvailabilitySlot[];

      if (rows.length > 0) {
        // Group by date
        const grouped = new Map<string, AvailabilitySlot[]>();
        for (const slot of rows) {
          const existing = grouped.get(slot.date) || [];
          existing.push(slot);
          grouped.set(slot.date, existing);
        }

        // Only include dates that have enough consecutive slots
        const validDates: DateGroup[] = [];
        const picks: QuickPick[] = [];

        for (const [date, slots] of grouped) {
          const hasEnoughConsecutive = findConsecutiveSlots(slots, slotsNeeded);
          if (hasEnoughConsecutive.length > 0) {
            validDates.push({ date, slotCount: slots.length });

            // Build quick picks from the first few valid dates
            if (picks.length < 3) {
              picks.push({
                date,
                startTime: hasEnoughConsecutive[0].start_time,
                slots: hasEnoughConsecutive,
              });
            }
          }
        }

        setDateGroups(validDates);
        setQuickPicks(picks);
      } else {
        setDateGroups([]);
        setQuickPicks([]);
      }

      setLoadingDates(false);
    }

    fetchDates();
    return () => {
      cancelled = true;
    };
  }, [service.id, slotsNeeded]);

  // Fetch slots when a date is selected
  useEffect(() => {
    if (!selectedDate) {
      setSlotsForDate([]);
      return;
    }

    let cancelled = false;
    async function fetchSlots() {
      setLoadingSlots(true);
      const supabase = createClient();

      const { data } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("date", selectedDate!)
        .eq("status", "available")
        .order("start_time");

      if (!cancelled) {
        setSlotsForDate((data as AvailabilitySlot[]) || []);
        setLoadingSlots(false);
      }
    }
    fetchSlots();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  // Find the first group of N consecutive slots starting from each slot
  const availableStartSlots = useMemo(() => {
    if (slotsForDate.length < slotsNeeded) return [];

    const validStarts: AvailabilitySlot[] = [];

    for (let i = 0; i <= slotsForDate.length - slotsNeeded; i++) {
      const group = slotsForDate.slice(i, i + slotsNeeded);
      if (isConsecutive(group)) {
        validStarts.push(slotsForDate[i]);
      }
    }

    return validStarts;
  }, [slotsForDate, slotsNeeded]);

  const handleSlotClick = useCallback(
    (startSlot: AvailabilitySlot) => {
      // Find this slot's index and select the consecutive group
      const startIdx = slotsForDate.findIndex((s) => s.id === startSlot.id);
      if (startIdx === -1) return;

      const group = slotsForDate.slice(startIdx, startIdx + slotsNeeded);
      if (group.length === slotsNeeded && isConsecutive(group)) {
        onSelectSlots(group);
      }
    },
    [slotsForDate, slotsNeeded, onSelectSlots]
  );

  const handleQuickPick = useCallback(
    (pick: QuickPick) => {
      onSelectDate(pick.date);
      onSelectSlots(pick.slots);
    },
    [onSelectDate, onSelectSlots]
  );

  // Check if a start slot is currently selected
  const isSlotSelected = (slot: AvailabilitySlot) => {
    return selectedSlots.length > 0 && selectedSlots[0].id === slot.id;
  };

  // Time range display for selected slots
  const selectedTimeRange =
    selectedSlots.length > 0
      ? `${formatTime(selectedSlots[0].start_time)} - ${formatTime(
          selectedSlots[selectedSlots.length - 1].end_time
        )}`
      : null;

  // No availability at all
  if (!loadingDates && dateGroups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 has-bottom-bar pt-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-soft-cream">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            className="text-warm-gray"
          >
            <path
              d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 16l6-6M9 10l6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div>
          <p className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-espresso">
            No openings right now
          </p>
          <p className="mt-1 text-sm text-warm-gray">
            Natalia doesn&apos;t have openings right now. Check back soon!
          </p>
        </div>
        <Button variant="secondary" onClick={onBack}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 has-bottom-bar">
      {/* Heading */}
      <div>
        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-espresso">
          Pick your time
        </h2>
        <p className="mt-1 text-sm text-warm-gray">
          {slotsNeeded > 1
            ? `We'll block ${slotsNeeded} slots (${service.duration_min} min) for you.`
            : `30 minutes reserved just for you.`}
        </p>
      </div>

      {/* Quick Picks */}
      {!loadingDates && quickPicks.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-warm-gray">
            Quick picks
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {quickPicks.map((pick, i) => {
              const isActive =
                selectedDate === pick.date &&
                selectedSlots.length > 0 &&
                selectedSlots[0].start_time === pick.startTime;

              return (
                <motion.div
                  key={`${pick.date}-${pick.startTime}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.06,
                    duration: 0.25,
                    ease: [0.32, 0.72, 0, 1] as const,
                  }}
                >
                  <Card
                    hoverable
                    selected={isActive}
                    padding="sm"
                    onClick={() => handleQuickPick(pick)}
                    role="button"
                    aria-pressed={isActive}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleQuickPick(pick);
                      }
                    }}
                    className="min-h-[56px]"
                  >
                    <p className="text-sm font-medium text-espresso">
                      {formatDate(pick.date)}
                    </p>
                    <p className={`text-xs ${accentText}`}>
                      {formatTime(pick.startTime)}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      {!loadingDates && quickPicks.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gold/10" />
          <span className="text-xs text-warm-gray">or browse all dates</span>
          <div className="h-px flex-1 bg-gold/10" />
        </div>
      )}

      {/* Date list */}
      <div className="flex flex-col gap-2">
        {loadingDates ? (
          <>
            <DateCardSkeleton />
            <DateCardSkeleton />
            <DateCardSkeleton />
            <DateCardSkeleton />
          </>
        ) : (
          dateGroups.map((group, i) => {
            const isExpanded = selectedDate === group.date;

            return (
              <motion.div
                key={group.date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.03,
                  duration: 0.25,
                  ease: [0.32, 0.72, 0, 1] as const,
                }}
              >
                {/* Date row */}
                <button
                  onClick={() =>
                    onSelectDate(isExpanded ? null : group.date)
                  }
                  className={`flex min-h-[52px] w-full items-center justify-between rounded-[var(--radius-lg)] border px-4 py-3.5 text-left transition-all ${
                    isExpanded
                      ? `${accentBgLight} border-${accent}/20`
                      : "border-gold/10 bg-white hover:border-gold/25 hover:bg-soft-cream/50"
                  }`}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-espresso">
                      {formatDate(group.date)}
                    </span>
                    <Badge variant={badgeVariant}>
                      {group.slotCount} {group.slotCount === 1 ? "slot" : "slots"}
                    </Badge>
                  </div>
                  <motion.svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="text-warm-gray"
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <path
                      d="M5 7.5l5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                </button>

                {/* Expanded time slots */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] as const }}
                      className="overflow-hidden"
                    >
                      <div className="px-1 pb-1 pt-2">
                        {loadingSlots ? (
                          <div className="grid grid-cols-2 gap-2">
                            {[...Array(4)].map((_, j) => (
                              <div
                                key={j}
                                className="shimmer rounded-[var(--radius-md)]"
                                style={{ height: 44 }}
                              />
                            ))}
                          </div>
                        ) : availableStartSlots.length === 0 ? (
                          <p className="py-3 text-center text-sm text-warm-gray">
                            No times available for this service duration.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {availableStartSlots.map((slot) => {
                              const selected = isSlotSelected(slot);
                              // Compute end time from last slot in the group
                              const startIdx = slotsForDate.findIndex(
                                (s) => s.id === slot.id
                              );
                              const endSlot =
                                slotsForDate[startIdx + slotsNeeded - 1];
                              const endTime = endSlot
                                ? endSlot.end_time
                                : slot.end_time;

                              return (
                                <motion.button
                                  key={slot.id}
                                  whileTap={{ scale: 0.96 }}
                                  onClick={() => handleSlotClick(slot)}
                                  className={`flex items-center justify-center rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-all ${
                                    selected
                                      ? `${accentBg} border-transparent text-white ring-2 ${accentRing}`
                                      : "border-gold/15 bg-white text-espresso hover:border-gold/30 hover:bg-soft-cream/50"
                                  }`}
                                  style={{ minHeight: 48 }}
                                  aria-pressed={selected}
                                >
                                  {formatTime(slot.start_time)}
                                  {slotsNeeded > 1 && (
                                    <span
                                      className={`ml-1 ${
                                        selected
                                          ? "text-white/70"
                                          : "text-warm-gray"
                                      }`}
                                    >
                                      - {formatTime(endTime)}
                                    </span>
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="mobile-bottom-bar">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4">
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
          <div className="min-w-0 flex-1 text-right">
            {selectedDate && selectedTimeRange ? (
              <p className="truncate text-sm font-medium text-espresso">
                {formatDate(selectedDate)}
                <span className="text-warm-gray"> &middot; {selectedTimeRange}</span>
              </p>
            ) : (
              <p className="text-sm text-warm-gray">Pick a date and time</p>
            )}
          </div>
          <Button
            variant="primary"
            size="lg"
            disabled={selectedSlots.length === 0}
            onClick={onNext}
            className={
              accent === "palm"
                ? "bg-palm hover:bg-palm/90 focus-visible:ring-palm/40"
                : ""
            }
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Find the first set of N consecutive available slots from a list
 * sorted by start_time. Returns the group or an empty array.
 */
function findConsecutiveSlots(
  slots: AvailabilitySlot[],
  needed: number
): AvailabilitySlot[] {
  if (slots.length < needed) return [];

  for (let i = 0; i <= slots.length - needed; i++) {
    const group = slots.slice(i, i + needed);
    if (isConsecutive(group)) return group;
  }
  return [];
}
