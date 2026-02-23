import { createAdminSupabase } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// POST /api/cron/generate-slots — Vercel cron (weekly)
// Calls the generate_slots RPC to create availability 28 days ahead
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    // ---- Verify cron secret ----
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("[CRON generate-slots] CRON_SECRET not configured");
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

    // ---- Call the RPC ----
    const admin = await createAdminSupabase();

    const { data: slotsGenerated, error } = await admin.rpc(
      "generate_slots" as never,
      { p_days_ahead: 28 } as never
    );

    if (error) {
      console.error("[CRON generate-slots] RPC error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[CRON generate-slots] Generated ${slotsGenerated} slots`);

    return NextResponse.json({
      success: true,
      slotsGenerated: (slotsGenerated as number) ?? 0,
    });
  } catch (err) {
    console.error("[CRON generate-slots] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
