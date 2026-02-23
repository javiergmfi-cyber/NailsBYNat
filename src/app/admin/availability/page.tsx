"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/providers/ToastProvider";
import {
  toBusinessDate,
  getMonthDates,
  isPast,
  isToday,
} from "@/lib/utils/dates";
import type { AvailabilitySlot, AvailabilityRule } from "@/types/supabase";

/* ─── Constants ─── */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TIME_OPTIONS = [
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
];

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

/* ─── Component ─── */

export default function AvailabilityPage() {
  const supabase = createClient();
  const { toast } = useToast();

  // Calendar state
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Availability data
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set());

  // Weekly pattern
  const [weeklyDays, setWeeklyDays] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [showPattern, setShowPattern] = useState(false);

  /* ─── Month label ─── */
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  /* ─── Calendar grid ─── */
  const monthDates = useMemo(
    () => getMonthDates(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const firstDayOfWeek = monthDates[0].getDay();

  /* ─── Fetch slots for the month ─── */
  const fetchSlots = useCallback(async () => {
    setLoading(true);

    const startDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const endDate = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${lastDay}`;

    const { data: slots } = await supabase
      .from("availability_slots")
      .select("date, status")
      .gte("date", startDate)
      .lte("date", endDate);

    const available = new Set<string>();
    const booked = new Set<string>();
    const slotsData = slots as unknown as { date: string; status: string }[];

    if (slotsData) {
      for (const slot of slotsData) {
        if (slot.status === "available") available.add(slot.date);
        if (slot.status === "booked") booked.add(slot.date);
      }
    }

    setAvailableDates(available);
    setBookedDates(booked);
    setLoading(false);
  }, [supabase, viewYear, viewMonth]);

  /* ─── Fetch rules ─── */
  const fetchRules = useCallback(async () => {
    const { data } = await supabase
      .from("availability_rules")
      .select("*")
      .eq("is_active", true);

    if (data) {
      const rulesData = data as unknown as AvailabilityRule[];
      setRules(rulesData);
      const activeDays = new Set(rulesData.map((r) => r.day_of_week));
      setWeeklyDays(activeDays);
      if (rulesData.length > 0) {
        setStartTime(rulesData[0].start_time);
        setEndTime(rulesData[0].end_time);
      }
    }
  }, [supabase]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  /* ─── Toggle a date ─── */
  async function toggleDate(dateStr: string) {
    if (isPast(dateStr) || bookedDates.has(dateStr)) return;

    const isAvailable = availableDates.has(dateStr);

    if (isAvailable) {
      // Remove available slots for this date
      await supabase
        .from("availability_slots")
        .delete()
        .eq("date", dateStr)
        .eq("status", "available");

      setAvailableDates((prev) => {
        const next = new Set(prev);
        next.delete(dateStr);
        return next;
      });
    } else {
      // Create available slot for this date
      const { error } = await supabase.from("availability_slots").insert({
        date: dateStr,
        start_time: startTime,
        end_time: endTime,
        status: "available",
      } as never);

      if (error) {
        toast("Failed to update availability", "error");
        return;
      }

      setAvailableDates((prev) => new Set([...prev, dateStr]));
    }
  }

  /* ─── Toggle weekly day ─── */
  function toggleWeeklyDay(day: number) {
    setWeeklyDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }

  /* ─── Save weekly pattern ─── */
  async function savePattern() {
    setSaving(true);

    // Deactivate old rules
    await supabase
      .from("availability_rules")
      .update({ is_active: false } as never)
      .eq("is_active", true);

    // Insert new rules
    const newRules = Array.from(weeklyDays).map((day) => ({
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
      slot_duration: 30,
      is_active: true,
    }));

    if (newRules.length > 0) {
      const { error } = await supabase
        .from("availability_rules")
        .insert(newRules as never);

      if (error) {
        toast("Failed to save pattern", "error");
        setSaving(false);
        return;
      }
    }

    toast("Weekly pattern saved!", "success");
    setSaving(false);
    fetchRules();
  }

  /* ─── Generate slots ─── */
  async function generateSlots() {
    setGenerating(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("generate_slots", {
      p_days_ahead: 28,
    });

    if (error) {
      toast("Failed to generate slots", "error");
      setGenerating(false);
      return;
    }

    toast(`Generated slots for the next 4 weeks!`, "success");
    setGenerating(false);
    fetchSlots();
  }

  /* ─── Navigation ─── */
  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  /* ─── Counts ─── */
  const availableCount = monthDates.filter((d) =>
    availableDates.has(toBusinessDate(d))
  ).length;

  /* ─── Render ─── */

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-8"
    >
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-espresso">
          Availability
        </h1>
        <p className="mt-1 text-sm text-warm-gray">
          Tap days to mark yourself as available. Days default to unavailable.
        </p>
      </div>

      {/* Calendar Card */}
      <Card padding="md">
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-sm)] text-warm-gray transition-colors active:bg-soft-cream hover:bg-soft-cream hover:text-espresso"
            aria-label="Previous month"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5l-5 5 5 5" />
            </svg>
          </button>

          <h2 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-espresso">
            {monthLabel}
          </h2>

          <button
            onClick={nextMonth}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-sm)] text-warm-gray transition-colors active:bg-soft-cream hover:bg-soft-cream hover:text-espresso"
            aria-label="Next month"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 5l5 5-5 5" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="py-1 text-center text-xs font-semibold uppercase tracking-wider text-warm-gray/60"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-[var(--radius-sm)] shimmer"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Date cells */}
            {monthDates.map((date) => {
              const dateStr = toBusinessDate(date);
              const past = isPast(dateStr);
              const today = isToday(dateStr);
              const available = availableDates.has(dateStr);
              const booked = bookedDates.has(dateStr);

              return (
                <motion.button
                  key={dateStr}
                  whileTap={!past && !booked ? { scale: 0.9 } : undefined}
                  onClick={() => toggleDate(dateStr)}
                  disabled={past || booked}
                  className={`relative aspect-square flex items-center justify-center rounded-[var(--radius-sm)] text-sm font-medium transition-all ${
                    past
                      ? "text-warm-gray/30 cursor-not-allowed"
                      : booked
                        ? "bg-palm/20 text-palm cursor-default"
                        : available
                          ? "bg-coral text-white shadow-sm"
                          : today
                            ? "bg-soft-cream text-espresso hover:bg-coral/10"
                            : "text-espresso hover:bg-soft-cream"
                  }`}
                  aria-label={`${date.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                  })}${available ? " - available" : ""}${booked ? " - booked" : ""}`}
                >
                  {date.getDate()}
                  {today && !available && !booked && (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-coral" />
                  )}
                  {booked && (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-palm" />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Legend + count */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gold/10 pt-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-warm-gray">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-coral" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-palm/20" />
              Booked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-soft-cream" />
              Unavailable
            </span>
          </div>
          <p className="text-sm font-medium text-espresso">
            {availableCount} available day{availableCount !== 1 ? "s" : ""} this month
          </p>
        </div>
      </Card>

      {/* Hours */}
      <Card padding="md">
        <h3 className="mb-3 font-[family-name:var(--font-playfair)] text-base font-semibold text-espresso">
          Working Hours
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-warm-gray">
              Start Time
            </label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full min-h-[48px] rounded-[var(--radius-md)] border border-gold/20 bg-white px-3 py-2.5 text-sm text-espresso focus:border-coral/50 focus:outline-none focus:ring-2 focus:ring-coral/30"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {formatTimeLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-warm-gray">
              End Time
            </label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full min-h-[48px] rounded-[var(--radius-md)] border border-gold/20 bg-white px-3 py-2.5 text-sm text-espresso focus:border-coral/50 focus:outline-none focus:ring-2 focus:ring-coral/30"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {formatTimeLabel(t)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Weekly Pattern */}
      <Card padding="md">
        <button
          onClick={() => setShowPattern(!showPattern)}
          className="flex w-full min-h-[48px] items-center justify-between"
        >
          <div>
            <h3 className="font-[family-name:var(--font-playfair)] text-base font-semibold text-espresso text-left">
              Weekly Pattern
            </h3>
            <p className="mt-0.5 text-xs text-warm-gray text-left">
              Set your usual working days to auto-generate availability
            </p>
          </div>
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-warm-gray"
            animate={{ rotate: showPattern ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path d="M5 8l5 5 5-5" />
          </motion.svg>
        </button>

        <AnimatePresence>
          {showPattern && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4">
                {/* Day toggles */}
                <div className="grid grid-cols-7 gap-2">
                  {DAY_NAMES_FULL.map((name, i) => {
                    const active = weeklyDays.has(i);
                    return (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => toggleWeeklyDay(i)}
                        className={`flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] text-xs font-medium transition-all ${
                          active
                            ? "bg-coral text-white shadow-sm"
                            : "bg-soft-cream/60 text-warm-gray active:bg-soft-cream hover:bg-soft-cream"
                        }`}
                      >
                        <span className="text-xs uppercase tracking-wider sm:hidden">
                          {DAY_NAMES[i]}
                        </span>
                        <span className="hidden text-xs uppercase tracking-wider sm:block">
                          {name.slice(0, 3)}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Summary */}
                {weeklyDays.size > 0 && (
                  <p className="text-xs text-warm-gray">
                    Available:{" "}
                    {Array.from(weeklyDays)
                      .sort()
                      .map((d) => DAY_NAMES_FULL[d])
                      .join(", ")}
                    {" "}from {formatTimeLabel(startTime)} to {formatTimeLabel(endTime)}
                  </p>
                )}

                {/* Save + Generate */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="primary"
                    size="lg"
                    loading={generating}
                    onClick={async () => {
                      await savePattern();
                      await generateSlots();
                    }}
                    className="w-full sm:flex-1"
                  >
                    Save &amp; Generate Slots
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    loading={saving}
                    onClick={savePattern}
                    className="w-full sm:flex-1"
                  >
                    Save Pattern Only
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Quick generate */}
      {rules.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            loading={generating}
            onClick={generateSlots}
          >
            Regenerate slots for next 4 weeks
          </Button>
        </div>
      )}
    </motion.div>
  );
}
