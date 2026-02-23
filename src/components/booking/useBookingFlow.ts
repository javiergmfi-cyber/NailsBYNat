"use client";

import { useState, useEffect, useCallback } from "react";
import type { ServiceCategory } from "@/lib/utils/constants";
import type { Service, AvailabilitySlot } from "@/types/supabase";

export interface BookingState {
  step: 1 | 2 | 3 | 4;
  category: ServiceCategory;
  selectedService: Service | null;
  selectedDate: string | null;
  selectedSlots: AvailabilitySlot[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNotes: string;
  numChildren: string;
  childrenAges: string;
  address: string;
  isSubmitting: boolean;
  bookingId: string | null;
  error: string | null;
}

type BookingField = keyof Pick<
  BookingState,
  | "customerName"
  | "customerPhone"
  | "customerEmail"
  | "customerNotes"
  | "numChildren"
  | "childrenAges"
  | "address"
>;

const STORAGE_KEY = "nbn-booking-customer";

function loadCustomerInfo(): Pick<
  BookingState,
  "customerName" | "customerPhone" | "customerEmail"
> {
  if (typeof window === "undefined") {
    return { customerName: "", customerPhone: "", customerEmail: "" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        customerName: parsed.customerName || "",
        customerPhone: parsed.customerPhone || "",
        customerEmail: parsed.customerEmail || "",
      };
    }
  } catch {
    // Ignore corrupt data
  }
  return { customerName: "", customerPhone: "", customerEmail: "" };
}

function saveCustomerInfo(name: string, phone: string, email: string): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
      })
    );
  } catch {
    // Storage full or unavailable
  }
}

function createInitialState(category: ServiceCategory): BookingState {
  return {
    step: 1,
    category,
    selectedService: null,
    selectedDate: null,
    selectedSlots: [],
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerNotes: "",
    numChildren: "",
    childrenAges: "",
    address: "",
    isSubmitting: false,
    bookingId: null,
    error: null,
  };
}

export function useBookingFlow(category: ServiceCategory) {
  const [state, setState] = useState<BookingState>(() =>
    createInitialState(category)
  );

  // Direction tracks whether we're going forward (+1) or backward (-1)
  // so AnimatePresence can slide the correct way
  const [direction, setDirection] = useState<1 | -1>(1);

  // Pre-fill from localStorage on mount
  useEffect(() => {
    const saved = loadCustomerInfo();
    if (saved.customerName || saved.customerPhone || saved.customerEmail) {
      setState((prev) => ({
        ...prev,
        customerName: saved.customerName,
        customerPhone: saved.customerPhone,
        customerEmail: saved.customerEmail,
      }));
    }
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.step >= 4) return prev;
      return { ...prev, step: (prev.step + 1) as BookingState["step"], error: null };
    });
    setDirection(1);
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      if (prev.step <= 1) return prev;
      return { ...prev, step: (prev.step - 1) as BookingState["step"], error: null };
    });
    setDirection(-1);
  }, []);

  const setService = useCallback((service: Service) => {
    setState((prev) => ({
      ...prev,
      selectedService: service,
      // Clear date/slots when service changes since duration may differ
      selectedDate: null,
      selectedSlots: [],
    }));
  }, []);

  const setDate = useCallback((date: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedDate: date,
      selectedSlots: [],
    }));
  }, []);

  const setSlots = useCallback((slots: AvailabilitySlot[]) => {
    setState((prev) => ({
      ...prev,
      selectedSlots: slots,
    }));
  }, []);

  const updateField = useCallback((field: BookingField, value: string) => {
    setState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const submitBooking = useCallback(async () => {
    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const body: Record<string, unknown> = {
        slot_ids: state.selectedSlots.map((s) => s.id),
        service_id: state.selectedService!.id,
        category: state.category,
        customer_name: state.customerName.trim(),
        customer_phone: state.customerPhone.trim(),
        customer_email: state.customerEmail.trim(),
        customer_notes: state.customerNotes.trim() || null,
      };

      if (state.category === "babysitting") {
        body.num_children = state.numChildren ? parseInt(state.numChildren, 10) : null;
        body.children_ages = state.childrenAges.trim() || null;
        body.address = state.address.trim() || null;
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        // Slot was taken by someone else
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          error: "That time slot was just taken. Please pick another time.",
          step: 2,
          selectedSlots: [],
        }));
        setDirection(-1);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      const data = await res.json();

      // Persist customer info for next time
      saveCustomerInfo(
        state.customerName.trim(),
        state.customerPhone.trim(),
        state.customerEmail.trim()
      );

      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        bookingId: data.id,
        step: 4,
      }));
      setDirection(1);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        error: err instanceof Error ? err.message : "Something went wrong.",
      }));
    }
  }, [state]);

  const reset = useCallback(() => {
    setState((prev) => ({
      ...createInitialState(prev.category),
      // Keep customer info
      customerName: prev.customerName,
      customerPhone: prev.customerPhone,
      customerEmail: prev.customerEmail,
    }));
    setDirection(-1);
  }, []);

  return {
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
  };
}
