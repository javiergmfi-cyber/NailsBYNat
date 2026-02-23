"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/providers/ToastProvider";
import {
  formatDate,
  formatDateLong,
  formatTime,
  formatPrice,
  formatDuration,
  toBusinessDate,
  isToday,
} from "@/lib/utils/dates";
import {
  CATEGORY_LABELS,
  type BookingStatus,
} from "@/lib/utils/constants";
import type { Booking, Service } from "@/types/supabase";

/* ─── Types ─── */

interface BookingWithService extends Booking {
  services: Service;
}

/* ─── Helpers ─── */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getWeekDates(): { date: string; label: string }[] {
  const dates: { date: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push({
      date: toBusinessDate(d),
      label:
        i === 0
          ? "Today"
          : i === 1
            ? "Tomorrow"
            : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    });
  }
  return dates;
}

/* ─── Animation Variants ─── */

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

/* ─── Component ─── */

export default function AdminDashboard() {
  const supabase = createClient();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [declineModal, setDeclineModal] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  /* ─── Fetch bookings ─── */

  const fetchBookings = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, services(*)")
      .in("status", ["pending", "confirmed"])
      .order("created_at", { ascending: false });

    if (error) {
      toast("Failed to load bookings", "error");
      return;
    }

    setBookings((data as BookingWithService[]) ?? []);
    setLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  /* ─── Realtime subscription ─── */

  useEffect(() => {
    const channel = supabase
      .channel("admin-bookings")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        async (payload) => {
          // Fetch the full booking with service data
          const { data } = await supabase
            .from("bookings")
            .select("*, services(*)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setBookings((prev) => [data as BookingWithService, ...prev]);
            toast(
              `New booking from ${(data as BookingWithService).customer_name}!`,
              "info"
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings" },
        async (payload) => {
          const { data } = await supabase
            .from("bookings")
            .select("*, services(*)")
            .eq("id", payload.new.id)
            .single();

          if (data) {
            const updated = data as unknown as BookingWithService;
            setBookings((prev) =>
              prev.map((b) =>
                b.id === updated.id ? updated : b
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, toast]);

  /* ─── Actions ─── */

  async function handleConfirm(id: string) {
    setActionLoading(id);
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "confirmed" }),
    });

    if (res.ok) {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, status: "confirmed" as BookingStatus, confirmed_at: new Date().toISOString() }
            : b
        )
      );
      toast("Booking confirmed!", "success");
    } else {
      toast("Failed to confirm", "error");
    }
    setActionLoading(null);
  }

  async function handleDecline(id: string) {
    setActionLoading(id);
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "declined",
        decline_reason: declineReason || null,
      }),
    });

    if (res.ok) {
      setBookings((prev) => prev.filter((b) => b.id !== id));
      toast("Booking declined", "info");
    } else {
      toast("Failed to decline", "error");
    }
    setActionLoading(null);
    setDeclineModal(null);
    setDeclineReason("");
  }

  /* ─── Derived data ─── */

  const todayStr = toBusinessDate(new Date());

  const todayBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "confirmed" && b.slot_ids?.length > 0)
        .filter((b) => {
          // We need to check if any slot is today - we'll check the booking date
          // Since we don't have slot dates directly, we use a different approach
          return true; // filtered further below
        }),
    [bookings]
  );

  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === "pending"),
    [bookings]
  );

  // For today's schedule, fetch slots
  const [todaySchedule, setTodaySchedule] = useState<BookingWithService[]>([]);

  useEffect(() => {
    async function fetchTodaySlots() {
      // Get today's booked slots
      const { data: slots } = await supabase
        .from("availability_slots")
        .select("booking_id, start_time, end_time")
        .eq("date", todayStr)
        .eq("status", "booked")
        .order("start_time", { ascending: true });

      const slotsData = slots as unknown as { booking_id: string | null; start_time: string; end_time: string }[];

      if (!slotsData?.length) {
        setTodaySchedule([]);
        return;
      }

      // Get unique booking IDs
      const bookingIds = [...new Set(slotsData.map((s) => s.booking_id).filter(Boolean))] as string[];

      if (!bookingIds.length) {
        setTodaySchedule([]);
        return;
      }

      const { data: todayBookingsData } = await supabase
        .from("bookings")
        .select("*, services(*)")
        .in("id", bookingIds)
        .eq("status", "confirmed");

      setTodaySchedule((todayBookingsData as BookingWithService[]) ?? []);
    }

    fetchTodaySlots();
  }, [supabase, todayStr, bookings]);

  // This week counts
  const weekDates = useMemo(() => getWeekDates(), []);

  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchWeekCounts() {
      const dates = weekDates.map((d) => d.date);
      const { data: slots } = await supabase
        .from("availability_slots")
        .select("date")
        .in("date", dates)
        .eq("status", "booked");

      const slotsArr = slots as unknown as { date: string }[];
      if (!slotsArr) return;

      const counts: Record<string, number> = {};
      for (const slot of slotsArr) {
        counts[slot.date] = (counts[slot.date] || 0) + 1;
      }
      setWeekCounts(counts);
    }

    fetchWeekCounts();
  }, [supabase, weekDates, bookings]);

  /* ─── Render ─── */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-[var(--radius-md)] shimmer" />
        <div className="h-4 w-32 rounded-[var(--radius-sm)] shimmer" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-[var(--radius-lg)] shimmer"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-8"
    >
      {/* ─── Greeting ─── */}
      <motion.div variants={fadeUp}>
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-espresso sm:text-3xl">
          {getGreeting()}, Natalia
        </h1>
        <p className="mt-1 text-sm text-warm-gray">
          {formatDateLong(new Date())}
        </p>
      </motion.div>

      {/* ─── Today's Schedule ─── */}
      <motion.section variants={fadeUp}>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-warm-gray">
          <span className="inline-block h-2 w-2 rounded-full bg-palm" />
          Today&apos;s Schedule
        </h2>

        {todaySchedule.length === 0 ? (
          <Card padding="lg">
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-3 text-3xl">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-palm/40"
                >
                  <path d="M17 8l4 4-4 4" />
                  <path d="M3 12h18" />
                </svg>
              </div>
              <p className="font-[family-name:var(--font-playfair)] text-lg text-espresso">
                Nothing today
              </p>
              <p className="mt-1 font-[family-name:var(--font-caveat)] text-warm-gray">
                Enjoy your day off!
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {todaySchedule.map((booking) => (
              <Card key={booking.id} padding="sm">
                <div className="flex items-center gap-4">
                  {/* Time indicator */}
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-palm" />
                    <div className="mt-1 h-8 w-px bg-palm/20" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-espresso">
                      {booking.services?.name}
                    </p>
                    <p className="text-sm text-warm-gray">
                      {booking.customer_name}
                      {booking.services && (
                        <span className="text-warm-gray/60">
                          {" "}
                          &middot; {formatDuration(booking.services.duration_min)}
                        </span>
                      )}
                    </p>
                  </div>

                  <Badge variant={booking.category === "nails" ? "coral" : "palm"}>
                    {CATEGORY_LABELS[booking.category]}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.section>

      {/* ─── Needs Your Attention ─── */}
      <motion.section variants={fadeUp}>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-warm-gray">
          <span className="inline-block h-2 w-2 rounded-full bg-gold" />
          Needs Your Attention
          {pendingBookings.length > 0 && (
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-coral text-[10px] font-bold text-white">
              {pendingBookings.length}
            </span>
          )}
        </h2>

        {pendingBookings.length === 0 ? (
          <Card padding="md">
            <p className="text-center text-sm text-warm-gray">
              All caught up! No pending bookings.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {pendingBookings.map((booking) => (
                <motion.div
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card padding="md">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-espresso">
                            {booking.customer_name}
                          </p>
                          <Badge
                            variant={
                              booking.category === "nails"
                                ? "coral"
                                : "palm"
                            }
                          >
                            {CATEGORY_LABELS[booking.category]}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-warm-gray">
                          {booking.services?.name}
                          {booking.services && (
                            <>
                              <span className="mx-1.5 text-warm-gray/40">
                                &middot;
                              </span>
                              {formatPrice(booking.services.price_cents)}
                              <span className="mx-1.5 text-warm-gray/40">
                                &middot;
                              </span>
                              {formatDuration(booking.services.duration_min)}
                            </>
                          )}
                        </p>
                        {booking.customer_notes && (
                          <p className="mt-1.5 text-xs text-warm-gray/80 italic">
                            &ldquo;{booking.customer_notes}&rdquo;
                          </p>
                        )}
                        <p className="mt-1 text-xs text-warm-gray/60">
                          Requested{" "}
                          {new Date(booking.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>

                      <div className="flex w-full gap-2 sm:w-auto sm:flex-col">
                        <Button
                          size="md"
                          variant="primary"
                          loading={actionLoading === booking.id}
                          onClick={() => handleConfirm(booking.id)}
                          className="!bg-palm !hover:bg-palm/90 flex-1 sm:flex-initial"
                        >
                          Confirm
                        </Button>
                        <Button
                          size="md"
                          variant="danger"
                          disabled={actionLoading === booking.id}
                          onClick={() => setDeclineModal(booking.id)}
                          className="flex-1 sm:flex-initial"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.section>

      {/* ─── This Week ─── */}
      <motion.section variants={fadeUp}>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-warm-gray">
          <span className="inline-block h-2 w-2 rounded-full bg-coral" />
          This Week
        </h2>

        <Card padding="sm">
          <div className="divide-y divide-gold/10">
            {weekDates.map(({ date, label }) => {
              const count = weekCounts[date] || 0;
              const today = isToday(date);
              return (
                <div
                  key={date}
                  className={`flex items-center justify-between px-3 py-3.5 ${
                    today ? "bg-coral/5 rounded-[var(--radius-sm)]" : ""
                  }`}
                >
                  <span
                    className={`text-sm ${
                      today ? "font-semibold text-espresso" : "text-warm-gray"
                    }`}
                  >
                    {label}
                  </span>
                  <span
                    className={`text-sm ${
                      count > 0
                        ? "font-medium text-espresso"
                        : "text-warm-gray/40"
                    }`}
                  >
                    {count > 0
                      ? `${count} appointment${count > 1 ? "s" : ""}`
                      : "Free"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.section>

      {/* ─── Decline Modal ─── */}
      <Modal
        open={!!declineModal}
        onClose={() => {
          setDeclineModal(null);
          setDeclineReason("");
        }}
        title="Decline Booking"
      >
        <p className="mb-4 text-sm text-warm-gray">
          Let the customer know why you&apos;re declining (optional).
        </p>
        <Textarea
          label="Reason (optional)"
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
        />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            variant="danger"
            size="lg"
            loading={actionLoading === declineModal}
            onClick={() => declineModal && handleDecline(declineModal)}
            className="w-full sm:flex-1"
          >
            Decline Booking
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setDeclineModal(null);
              setDeclineReason("");
            }}
            className="w-full sm:flex-1"
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
}
