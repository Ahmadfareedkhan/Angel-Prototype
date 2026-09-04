import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createHash } from "crypto";
import { getAngelInstructions } from "@/lib/instructions";
import { checkRateLimit } from "@/lib/rate-limit";

const OPENAI_REALTIME_URL = "https://api.openai.com/v1/realtime/calls";

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

  let sdpOffer: string;
  try {
    sdpOffer = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read SDP offer from request body" },
      { status: 400 }
    );
  }

  if (!sdpOffer || sdpOffer.trim().length === 0) {
    return NextResponse.json(
      { error: "Empty SDP offer" },
      { status: 400 }
    );
  }

  let instructions: string;
  try {
    instructions = getAngelInstructions();
  } catch (error) {
    console.error("Instruction loading failed:", error);
    return NextResponse.json(
      { error: "Failed to load system instructions" },
      { status: 500 }
    );
  }

  const model = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1";
  const voice = process.env.ANGEL_VOICE || "marin";
  const sessionId = hashSessionId(nanoid());

  const sessionConfig = JSON.stringify({
    type: "realtime",
    model,
    instructions,
    audio: {
      output: { voice },
      input: {
        noise_reduction: {
          type: "far_field",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.75,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,
          create_response: true,
          interrupt_response: true,
        },
      },
    },
  });

  const formData = new FormData();
  formData.set("sdp", sdpOffer);
  formData.set("session", sessionConfig);

  let openaiResponse: Response;
  try {
    openaiResponse = await fetch(OPENAI_REALTIME_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Safety-Identifier": sessionId,
      },
      body: formData,
    });
  } catch (error) {
    console.error("OpenAI Realtime API request failed:", error);
    return NextResponse.json(
      { error: "Failed to connect to OpenAI Realtime API" },
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

  const sdpAnswer = await openaiResponse.text();

  return new NextResponse(sdpAnswer, {
    status: 200,
    headers: {
      "Content-Type": "application/sdp",
    },
  });
}
