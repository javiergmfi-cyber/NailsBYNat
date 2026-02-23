import { createAdminSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/supabase";

type NotificationInsert = Database["public"]["Tables"]["booking_notifications"]["Insert"];

// ---------------------------------------------------------------------------
// POST /api/cron/send-reminders — Vercel cron (daily)
// Finds confirmed bookings for tomorrow and logs notification records
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    // ---- Verify cron secret ----
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[CRON send-reminders] CRON_SECRET not configured");
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const token =
      authHeader?.replace("Bearer ", "") ||
      request.nextUrl.searchParams.get("secret");

    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---- Compute tomorrow's date ----
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const admin = await createAdminSupabase();

    // ---- Find slots that are booked for tomorrow ----
    const { data: slotData, error: slotError } = await admin
      .from("availability_slots")
      .select("booking_id")
      .eq("date", tomorrowStr)
      .eq("status", "booked")
      .not("booking_id", "is", null);

    if (slotError) {
      console.error("[CRON send-reminders] Slot query error:", slotError);
      return NextResponse.json({ error: slotError.message }, { status: 500 });
    }

    // Get unique booking IDs
    const tomorrowSlots = (slotData ?? []) as unknown as { booking_id: string | null }[];
    const bookingIds = [
      ...new Set(
        tomorrowSlots
          .map((s) => s.booking_id)
          .filter((id): id is string => id !== null)
      ),
    ];

    if (bookingIds.length === 0) {
      console.log("[CRON send-reminders] No confirmed bookings for tomorrow");
      return NextResponse.json({ success: true, remindersProcessed: 0 });
    }

    // ---- Fetch the confirmed bookings ----
    const { data: bookingData, error: bookingError } = await admin
      .from("bookings")
      .select("id, customer_name, customer_email, customer_phone")
      .in("id", bookingIds)
      .eq("status", "confirmed");

    if (bookingError) {
      console.error(
        "[CRON send-reminders] Booking query error:",
        bookingError
      );
      return NextResponse.json(
        { error: bookingError.message },
        { status: 500 }
      );
    }

    const bookings = (bookingData ?? []) as unknown as {
      id: string;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
    }[];

    if (bookings.length === 0) {
      console.log(
        "[CRON send-reminders] No confirmed bookings found for tomorrow"
      );
      return NextResponse.json({ success: true, remindersProcessed: 0 });
    }

    // ---- Log notification records ----
    // (Actual email/SMS sending will be added later)
    const notificationRows: NotificationInsert[] = bookings.map((booking) => ({
      booking_id: booking.id,
      type: "reminder",
      channel: "email",
      recipient: booking.customer_email,
    }));

    const { error: insertError } = await admin
      .from("booking_notifications")
      .insert(notificationRows as never);

    if (insertError) {
      console.error(
        "[CRON send-reminders] Notification insert error:",
        insertError
      );
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    console.log(
      `[CRON send-reminders] Processed ${bookings.length} reminders for ${tomorrowStr}`
    );

    return NextResponse.json({
      success: true,
      remindersProcessed: bookings.length,
      date: tomorrowStr,
    });
  } catch (err) {
    console.error("[CRON send-reminders] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
