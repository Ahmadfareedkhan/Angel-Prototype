import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { saveFeedback } from "@/lib/store";

export async function POST(request: NextRequest) {
  let body: { rating?: string; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { rating, comment } = body;

  if (rating !== "positive" && rating !== "negative") {
    return NextResponse.json(
      { error: "Rating must be 'positive' or 'negative'" },
      { status: 400 }
    );
  }

  try {
    await saveFeedback({
      id: nanoid(),
      rating,
      comment: typeof comment === "string" ? comment.trim().slice(0, 500) : "",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save feedback:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}
