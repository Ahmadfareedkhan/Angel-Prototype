import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createHash } from "crypto";
import { getAngelInstructions } from "@/lib/instructions";
import { checkRateLimit } from "@/lib/rate-limit";

const OPENAI_LIVE_URL = "https://api.openai.com/v1/live/sessions";

function hashSessionId(raw: string): string {
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before trying again." },
      { status: 429 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured: missing API key" },
      { status: 500 }
    );
  }

  let body: { sdp?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const sdpOffer = body.sdp;
  if (!sdpOffer || typeof sdpOffer !== "string" || sdpOffer.trim().length === 0) {
    return NextResponse.json(
      { error: "An SDP offer is required" },
      { status: 400 }
    );
  }

  let instructions: string;
  try {
    instructions = await getAngelInstructions();
  } catch (error) {
    console.error("Instruction loading failed:", error);
    return NextResponse.json(
      { error: "Failed to load system instructions" },
      { status: 500 }
    );
  }

  const voice = process.env.ANGEL_VOICE || "ash";
  const sessionId = hashSessionId(nanoid());

  const requestBody = {
    session: {
      model: "gpt-live-1",
      instructions: [
        "You are Angel, a voice-first conversational companion.",
        "Speak warmly and naturally, at an unhurried pace. Be calm, thoughtful, and present.",
        "When a conversation begins, briefly introduce yourself. For example: 'Hey. I'm Angel. What's going on?' Keep greetings short and varied. Never say 'What's alive in you?' — that phrase is reserved for the app's tagline.",
        "Keep individual responses short — one or two sentences when possible.",
        "Ask one meaningful question at a time. Allow silence.",
        "Do not sound chipper, bubbly, motivational, therapeutic, or like customer service. Neutral is preferable to cheerful.",
        "Backchannel policy: Use minimal backchannels. Acknowledge naturally without competing with the main response.",
        "Interruption policy: Stop speaking when the user interrupts. Listen to what they say.",
        "Follow the backend's reasoning completely. The backend determines what to say, what stage of the conversation you are in, and when to move forward. Do not skip ahead or generate your own therapeutic guidance.",
      ].join("\n"),
      audio: {
        output: { voice },
      },
      delegation: {
        type: "responses" as const,
        responses: {
          model: "gpt-5.6-luna",
          instructions,
          reasoning: { effort: "high" },
        },
      },
    },
    transport: {
      type: "webrtc" as const,
      sdp: sdpOffer,
    },
  };

  let openaiResponse: Response;
  try {
    openaiResponse = await fetch(OPENAI_LIVE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": sessionId,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    console.error("OpenAI Live API request failed:", error);
    return NextResponse.json(
      { error: "Failed to connect to OpenAI Live API" },
      { status: 502 }
    );
  }

  if (!openaiResponse.ok) {
    const errorBody = await openaiResponse.text().catch(() => "unknown");
    console.error(
      `OpenAI returned ${openaiResponse.status}:`,
      errorBody
    );
    return NextResponse.json(
      { error: "OpenAI session creation failed", status: openaiResponse.status },
      { status: 502 }
    );
  }

  const result = await openaiResponse.json();

  return NextResponse.json(result, { status: 201 });
}
