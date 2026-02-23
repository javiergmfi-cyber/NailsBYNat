import { createServerSupabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { BookingStatus } from "@/lib/utils/constants";
import type { Database, Booking } from "@/types/supabase";

type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];
type SlotUpdate = Database["public"]["Tables"]["availability_slots"]["Update"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  // Verify auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { status, decline_reason, admin_notes } = body as {
    status?: BookingStatus;
    decline_reason?: string;
    admin_notes?: string;
  };

  // Build the update payload
  const update: BookingUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (status) {
    update.status = status;

    if (status === "confirmed") {
      update.confirmed_at = new Date().toISOString();
    } else if (status === "declined") {
      update.declined_at = new Date().toISOString();
      if (decline_reason) {
        update.decline_reason = decline_reason;
      }
    } else if (status === "cancelled") {
      update.cancelled_at = new Date().toISOString();
    }
  }

  if (admin_notes !== undefined) {
    update.admin_notes = admin_notes;
  }

  const { data, error } = await supabase
    .from("bookings")
    .update(update as never)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If declined or cancelled, free up the slots
  if (status === "declined" || status === "cancelled") {
    const booking = data as unknown as Booking;
    if (booking?.slot_ids?.length) {
      await supabase
        .from("availability_slots")
        .update({ status: "available", booking_id: null } as never)
        .in("id", booking.slot_ids);
    }
  }

  return NextResponse.json({ booking: data });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*, services(*)")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ booking: data });
}
