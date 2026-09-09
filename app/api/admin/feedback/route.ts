import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/admin-auth";
import { listFeedback } from "@/lib/store";

/**
 * GET /api/admin/feedback
 * Returns all submitted feedback entries, newest first.
 */
export async function GET(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const entries = await listFeedback();
    const sorted = entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({ feedback: sorted });
  } catch (error) {
    console.error("Failed to load feedback:", error);
    return NextResponse.json(
      { error: "Failed to load feedback" },
      { status: 500 }
    );
  }
}
