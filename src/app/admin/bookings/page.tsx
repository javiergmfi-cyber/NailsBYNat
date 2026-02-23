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
  formatTime,
  formatPrice,
  formatDuration,
  toBusinessDate,
  isPast,
} from "@/lib/utils/dates";
import {
  STATUS_LABELS,
  CATEGORY_LABELS,
  type BookingStatus,
  type ServiceCategory,
} from "@/lib/utils/constants";
import type { Booking, Service, AvailabilitySlot } from "@/types/supabase";

/* ─── Types ─── */

interface BookingWithService extends Booking {
  services: Service;
}

type FilterTab = "all" | "pending" | "confirmed" | "past";
type CategoryFilter = "all" | ServiceCategory;

/* ─── Status badge variant mapping ─── */
const STATUS_BADGE_VARIANT: Record<
  BookingStatus,
  "default" | "coral" | "gold" | "palm" | "terracotta"
> = {
  pending: "gold",
  confirmed: "palm",
  declined: "terracotta",
  cancelled: "default",
  completed: "palm",
};

/* ─── Component ─── */

export default function BookingsPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Admin notes
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  // Decline modal
  const [declineModal, setDeclineModal] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  // Slot times cache
  const [slotTimes, setSlotTimes] = useState<
    Record<string, { date: string; start_time: string; end_time: string }>
  >({});

  /* ─── Fetch bookings ─── */
  const fetchBookings = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, services(*)")
      .order("created_at", { ascending: false });

    if (error) {
      toast("Failed to load bookings", "error");
      return;
    }

    const bookingsData = (data as BookingWithService[]) ?? [];
    setBookings(bookingsData);
    setLoading(false);

    // Fetch slot times for all bookings
    const allSlotIds = bookingsData.flatMap((b) => b.slot_ids || []);
    if (allSlotIds.length > 0) {
      const { data: slots } = await supabase
        .from("availability_slots")
        .select("id, date, start_time, end_time")
        .in("id", allSlotIds);

      const slotsData = slots as unknown as { id: string; date: string; start_time: string; end_time: string }[];
      if (slotsData) {
        const map: Record<string, { date: string; start_time: string; end_time: string }> = {};
        for (const s of slotsData) {
          map[s.id] = { date: s.date, start_time: s.start_time, end_time: s.end_time };
        }
        setSlotTimes(map);
      }
    }
  }, [supabase, toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  /* ─── Get booking date/time from slots ─── */
  function getBookingDateTime(booking: BookingWithService) {
    if (!booking.slot_ids?.length) return null;
    const firstSlot = slotTimes[booking.slot_ids[0]];
    const lastSlot = slotTimes[booking.slot_ids[booking.slot_ids.length - 1]];
    if (!firstSlot) return null;
    return {
      date: firstSlot.date,
      startTime: firstSlot.start_time,
      endTime: lastSlot?.end_time || firstSlot.end_time,
    };
  }

  /* ─── Filtered bookings ─── */
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((b) => b.category === categoryFilter);
    }

    // Tab filter
    const today = toBusinessDate(new Date());
    switch (filterTab) {
      case "pending":
        filtered = filtered.filter((b) => b.status === "pending");
        break;
      case "confirmed":
        filtered = filtered.filter((b) => b.status === "confirmed");
        break;
      case "past":
        filtered = filtered.filter(
          (b) =>
            b.status === "completed" ||
            b.status === "declined" ||
            b.status === "cancelled"
        );
        break;
    }

    // Sort: pending/confirmed by date ascending, past by date descending
    return filtered.sort((a, b) => {
      if (filterTab === "past") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [bookings, filterTab, categoryFilter]);

  /* ─── Actions ─── */

  async function updateStatus(id: string, status: BookingStatus, extra?: Record<string, unknown>) {
    setActionLoading(id);

    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...extra }),
    });

    if (res.ok) {
      const { booking } = await res.json();
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...booking } : b))
      );
      toast(
        `Booking ${STATUS_LABELS[status].toLowerCase()}`,
        status === "confirmed" || status === "completed" ? "success" : "info"
      );
    } else {
      toast("Action failed", "error");
    }

    setActionLoading(null);
  }

  async function saveNotes(id: string) {
    setActionLoading(id);

    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_notes: notesValue }),
    });

    if (res.ok) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, admin_notes: notesValue } : b))
      );
      toast("Notes saved", "success");
    } else {
      toast("Failed to save notes", "error");
    }

    setActionLoading(null);
    setEditingNotes(null);
  }

  /* ─── Tab config ─── */
  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "All", count: bookings.length },
    {
      key: "pending",
      label: "Pending",
      count: bookings.filter((b) => b.status === "pending").length,
    },
    {
      key: "confirmed",
      label: "Confirmed",
      count: bookings.filter((b) => b.status === "confirmed").length,
    },
    { key: "past", label: "Past" },
  ];

  /* ─── Render ─── */

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 pb-8"
    >
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-espresso">
          Bookings
        </h1>
        <p className="mt-1 text-sm text-warm-gray">
          Manage all your appointments in one place.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-[var(--radius-lg)] bg-soft-cream/60 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] px-3.5 py-2 text-sm font-medium transition-colors ${
              filterTab === tab.key
                ? "text-espresso"
                : "text-warm-gray hover:text-espresso"
            }`}
          >
            {filterTab === tab.key && (
              <motion.div
                layoutId="booking-tab"
                className="absolute inset-0 rounded-[var(--radius-md)] bg-white shadow-sm"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`relative z-10 text-xs ${
                  filterTab === tab.key ? "text-coral" : "text-warm-gray/60"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2">
        {(["all", "nails", "babysitting"] as CategoryFilter[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`rounded-[var(--radius-full)] px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === cat
                ? cat === "nails"
                  ? "bg-coral/15 text-coral"
                  : cat === "babysitting"
                    ? "bg-palm/15 text-palm"
                    : "bg-espresso/10 text-espresso"
                : "bg-soft-cream/60 text-warm-gray hover:text-espresso"
            }`}
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Booking list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 rounded-[var(--radius-lg)] shimmer"
            />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card padding="lg">
          <p className="text-center text-sm text-warm-gray">
            No bookings match your filters.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredBookings.map((booking) => {
              const expanded = expandedId === booking.id;
              const dateTime = getBookingDateTime(booking);

              return (
                <motion.div
                  key={booking.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card padding="sm">
                    {/* Summary row */}
                    <button
                      onClick={() =>
                        setExpandedId(expanded ? null : booking.id)
                      }
                      className="flex w-full items-center gap-3 text-left"
                    >
                      {/* Status indicator */}
                      <div
                        className={`h-10 w-1 flex-shrink-0 rounded-full ${
                          booking.status === "pending"
                            ? "bg-gold"
                            : booking.status === "confirmed"
                              ? "bg-palm"
                              : booking.status === "declined"
                                ? "bg-terracotta"
                                : "bg-warm-gray/30"
                        }`}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-espresso text-sm">
                            {booking.customer_name}
                          </span>
                          <Badge variant={STATUS_BADGE_VARIANT[booking.status]}>
                            {STATUS_LABELS[booking.status]}
                          </Badge>
                          <Badge
                            variant={
                              booking.category === "nails" ? "coral" : "palm"
                            }
                          >
                            {CATEGORY_LABELS[booking.category]}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-warm-gray truncate">
                          {booking.services?.name}
                          {dateTime && (
                            <>
                              {" "}
                              &middot; {formatDate(dateTime.date)}{" "}
                              {formatTime(dateTime.startTime)}
                            </>
                          )}
                        </p>
                      </div>

                      {/* Expand chevron */}
                      <motion.svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="flex-shrink-0 text-warm-gray/40"
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <path d="M4.5 7l4.5 4.5L13.5 7" />
                      </motion.svg>
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 border-t border-gold/10 pt-3 space-y-3">
                            {/* Details grid */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-wider text-warm-gray/60">
                                  Phone
                                </p>
                                <p className="text-espresso">
                                  {booking.customer_phone}
                                </p>
                              </div>
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-wider text-warm-gray/60">
                                  Email
                                </p>
                                <p className="truncate text-espresso">
                                  {booking.customer_email}
                                </p>
                              </div>
                              {booking.services && (
                                <>
                                  <div>
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-warm-gray/60">
                                      Service
                                    </p>
                                    <p className="text-espresso">
                                      {booking.services.name}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-warm-gray/60">
                                      Price
                                    </p>
                                    <p className="text-espresso">
                                      {formatPrice(booking.services.price_cents)}{" "}
                                      &middot;{" "}
                                      {formatDuration(
                                        booking.services.duration_min
                                      )}
                                    </p>
                                  </div>
                                </>
                              )}
                              {dateTime && (
                                <>
                                  <div>
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-warm-gray/60">
                                      Date
                                    </p>
                                    <p className="text-espresso">
                                      {formatDate(dateTime.date)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-warm-gray/60">
                                      Time
                                    </p>
                                    <p className="text-espresso">
                                      {formatTime(dateTime.startTime)} -{" "}
                                      {formatTime(dateTime.endTime)}
                                    </p>
                                  </div>
                                </>
                              )}
                              {booking.category === "babysitting" && (
                                <>
                                  {booking.num_children && (
                                    <div>
                                      <p className="text-[11px] font-medium uppercase tracking-wider text-warm-gray/60">
                                        Children
                                      </p>
                                      <p className="text-espresso">
                                        {booking.num_children}
                                        {booking.children_ages &&
                                          ` (ages: ${booking.children_ages})`}
                                      </p>
                                    </div>
                                  )}
                                  {booking.address && (
                                    <div className="col-span-2">
                                      <p className="text-[11px] font-medium uppercase tracking-wider text-warm-gray/60">
                                        Address
                                      </p>
                                      <p className="text-espresso">
                                        {booking.address}
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Customer notes */}
                            {booking.customer_notes && (
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-wider text-warm-gray/60">
                                  Customer Notes
                                </p>
                                <p className="mt-0.5 text-sm italic text-warm-gray">
                                  &ldquo;{booking.customer_notes}&rdquo;
                                </p>
                              </div>
                            )}

                            {/* Decline reason */}
                            {booking.decline_reason && (
                              <div className="rounded-[var(--radius-sm)] bg-terracotta/5 px-3 py-2">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-terracotta/60">
                                  Decline Reason
                                </p>
                                <p className="mt-0.5 text-sm text-terracotta">
                                  {booking.decline_reason}
                                </p>
                              </div>
                            )}

                            {/* Admin notes */}
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wider text-warm-gray/60 mb-1">
                                Admin Notes
                              </p>
                              {editingNotes === booking.id ? (
                                <div className="space-y-2">
                                  <Textarea
                                    label="Notes"
                                    value={notesValue}
                                    onChange={(e) =>
                                      setNotesValue(e.target.value)
                                    }
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingNotes(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      loading={actionLoading === booking.id}
                                      onClick={() => saveNotes(booking.id)}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingNotes(booking.id);
                                    setNotesValue(booking.admin_notes || "");
                                  }}
                                  className="text-sm text-warm-gray hover:text-espresso transition-colors"
                                >
                                  {booking.admin_notes || (
                                    <span className="text-warm-gray/40 italic">
                                      + Add notes
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              {booking.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    loading={actionLoading === booking.id}
                                    onClick={() =>
                                      updateStatus(booking.id, "confirmed")
                                    }
                                    className="!bg-palm hover:!bg-palm/90"
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    disabled={actionLoading === booking.id}
                                    onClick={() => {
                                      setDeclineModal(booking.id);
                                      setDeclineReason("");
                                    }}
                                  >
                                    Decline
                                  </Button>
                                </>
                              )}
                              {booking.status === "confirmed" && (
                                <>
                                  <Button
                                    size="sm"
                                    loading={actionLoading === booking.id}
                                    onClick={() =>
                                      updateStatus(booking.id, "completed")
                                    }
                                    className="!bg-palm hover:!bg-palm/90"
                                  >
                                    Mark Complete
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={actionLoading === booking.id}
                                    onClick={() =>
                                      updateStatus(booking.id, "cancelled")
                                    }
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Decline modal */}
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
        <div className="mt-4 flex gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setDeclineModal(null);
              setDeclineReason("");
            }}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={actionLoading === declineModal}
            onClick={() => {
              if (declineModal) {
                updateStatus(declineModal, "declined", {
                  decline_reason: declineReason || null,
                });
                setDeclineModal(null);
                setDeclineReason("");
              }
            }}
            className="flex-1"
          >
            Decline Booking
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
}
