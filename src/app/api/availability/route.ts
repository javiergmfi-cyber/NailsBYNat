import { createServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { Database, AvailabilitySlot } from "@/types/supabase";

type SlotInsert = Database["public"]["Tables"]["availability_slots"]["Insert"];

// ---------------------------------------------------------------------------
// GET /api/availability?date=YYYY-MM-DD — public: available slots for a date
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Missing required query parameter: date (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Basic date format validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("availability_slots")
      .select("id, start_time, end_time")
      .eq("date", date)
      .eq("status", "available")
      .order("start_time", { ascending: true });

    if (error) {
      console.error("[GET /api/availability] Query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const slots = (data ?? []) as unknown as Pick<AvailabilitySlot, "id" | "start_time" | "end_time">[];

    return NextResponse.json({ slots });
  } catch (err) {
    console.error("[GET /api/availability] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/availability — admin: create manual availability slot(s)
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // ---- Auth check ----
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date, dates, start_time, end_time } = body as {
      date?: string;
      dates?: string[];
      start_time?: string;
      end_time?: string;
    };

    // ---- Validate ----
    if (!start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields: start_time, end_time" },
        { status: 400 }
      );
    }

    // Accept either a single date or an array of dates
    const targetDates: string[] = dates?.length ? dates : date ? [date] : [];

    if (targetDates.length === 0) {
      return NextResponse.json(
        { error: "Missing required field: date or dates" },
        { status: 400 }
      );
    }

    // Validate all date formats
    const invalidDates = targetDates.filter(
      (d) => !/^\d{4}-\d{2}-\d{2}$/.test(d)
    );
    if (invalidDates.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid date format for: ${invalidDates.join(", ")}. Expected YYYY-MM-DD`,
        },
        { status: 400 }
      );
    }

    // ---- Build insert rows ----
    const rows: SlotInsert[] = targetDates.map((d) => ({
      date: d,
      start_time,
      end_time,
      status: "available" as const,
    }));

    const { data: createdSlots, error } = await supabase
      .from("availability_slots")
      .insert(rows as never)
      .select();

    if (error) {
      console.error("[POST /api/availability] Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { slots: createdSlots },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/availability] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/availability?id=<slot_id> — admin: delete/block a slot
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    // ---- Auth check ----
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing required query parameter: id" },
        { status: 400 }
      );
    }

    // ---- Check slot status before deleting ----
    const { data: slotData, error: fetchError } = await supabase
      .from("availability_slots")
      .select("id, status")
      .eq("id", id)
      .single();

    if (fetchError || !slotData) {
      return NextResponse.json(
        { error: "Slot not found" },
        { status: 404 }
      );
    }

    const slot = slotData as unknown as Pick<AvailabilitySlot, "id" | "status">;

    if (slot.status === "booked") {
      return NextResponse.json(
        { error: "Cannot delete booked slot" },
        { status: 400 }
      );
    }

    // ---- Delete the slot ----
    const { error: deleteError } = await supabase
      .from("availability_slots")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[DELETE /api/availability] Delete error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/availability] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
