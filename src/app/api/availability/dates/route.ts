import { createServerSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/availability/dates — public: dates with available slots
// Query params:
//   from  — YYYY-MM-DD (defaults to today)
//   weeks — number of weeks to look ahead (defaults to 4)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // ---- Parse "from" date ----
    const fromParam = searchParams.get("from");
    const fromDate = fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam)
      ? fromParam
      : new Date().toISOString().split("T")[0];

    // ---- Parse weeks ----
    const weeksParam = parseInt(searchParams.get("weeks") || "4", 10);
    const weeks = Math.min(Math.max(weeksParam, 1), 12); // clamp 1–12

    // ---- Compute end date ----
    const endDate = new Date(fromDate);
    endDate.setDate(endDate.getDate() + weeks * 7);
    const toDate = endDate.toISOString().split("T")[0];

    // ---- Query distinct dates that have at least 1 available slot ----
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from("availability_slots")
      .select("date")
      .eq("status", "available")
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true });

    if (error) {
      console.error("[GET /api/availability/dates] Query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Deduplicate dates in application code (Supabase JS client doesn't
    // expose DISTINCT directly, but the result set is small)
    const rows = (data ?? []) as unknown as { date: string }[];
    const uniqueDates = [...new Set(rows.map((row) => row.date))];

    return NextResponse.json({ dates: uniqueDates });
  } catch (err) {
    console.error("[GET /api/availability/dates] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
