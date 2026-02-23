import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { Booking, AvailabilitySlot } from "@/types/supabase";

// ---------------------------------------------------------------------------
// POST /api/bookings — public: customer creates a booking
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      slot_ids,
      service_id,
      category,
      customer_name,
      customer_phone,
      customer_email,
      customer_notes,
      num_children,
      children_ages,
      address,
    } = body as {
      slot_ids?: string[];
      service_id?: string;
      category?: string;
      customer_name?: string;
      customer_phone?: string;
      customer_email?: string;
      customer_notes?: string;
      num_children?: number;
      children_ages?: string;
      address?: string;
    };

    // ---- Validate required fields ----
    const missing: string[] = [];
    if (!slot_ids?.length) missing.push("slot_ids");
    if (!service_id) missing.push("service_id");
    if (!category) missing.push("category");
    if (!customer_name?.trim()) missing.push("customer_name");
    if (!customer_phone?.trim()) missing.push("customer_phone");
    if (!customer_email?.trim()) missing.push("customer_email");

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // ---- Call the atomic RPC (SECURITY DEFINER — needs service role) ----
    const admin = await createAdminSupabase();

    const { data: bookingId, error } = await admin.rpc(
      "claim_consecutive_slots" as never,
      {
        p_slot_ids: slot_ids!,
        p_service_id: service_id!,
        p_category: category!,
        p_customer_name: customer_name!.trim(),
        p_customer_phone: customer_phone!.trim(),
        p_customer_email: customer_email!.trim(),
        p_customer_notes: customer_notes?.trim() || null,
        p_num_children: num_children ?? null,
        p_children_ages: children_ages?.trim() || null,
        p_address: address?.trim() || null,
      } as never
    );

    if (error) {
      console.error("[POST /api/bookings] RPC error:", error);
      return NextResponse.json(
        { error: "Failed to create booking" },
        { status: 500 }
      );
    }

    // RPC returns null when the slots are no longer available
    if (!bookingId) {
      return NextResponse.json(
        { error: "This time slot is no longer available" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: true, bookingId },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/bookings] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/bookings — admin: list bookings with optional filters
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // ---- Auth check ----
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---- Parse query params ----
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
      200
    );
    const offset = Math.max(
      parseInt(searchParams.get("offset") || "0", 10),
      0
    );

    // ---- Build query ----
    let query = supabase
      .from("bookings")
      .select("*, services(*)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }
    if (category) {
      query = query.eq("category", category);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[GET /api/bookings] Query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const bookings = (data ?? []) as unknown as Booking[];

    // ---- Fetch slot data for each booking ----
    const allSlotIds = bookings.flatMap((b) => b.slot_ids ?? []);

    let slotsMap: Record<string, Pick<AvailabilitySlot, "id" | "date" | "start_time" | "end_time" | "status">> = {};

    if (allSlotIds.length > 0) {
      const { data: slotData } = await supabase
        .from("availability_slots")
        .select("id, date, start_time, end_time, status")
        .in("id", allSlotIds);

      const slots = (slotData ?? []) as unknown as Pick<AvailabilitySlot, "id" | "date" | "start_time" | "end_time" | "status">[];

      if (slots.length > 0) {
        slotsMap = Object.fromEntries(slots.map((s) => [s.id, s]));
      }
    }

    const bookingsWithSlots = bookings.map((booking) => ({
      ...booking,
      slots: (booking.slot_ids ?? []).map((id) => slotsMap[id] ?? null),
    }));

    return NextResponse.json({
      bookings: bookingsWithSlots,
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error("[GET /api/bookings] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
