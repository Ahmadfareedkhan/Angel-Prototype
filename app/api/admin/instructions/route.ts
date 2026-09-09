import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { validateAdmin } from "@/lib/admin-auth";
import { getStoredInstructions, setStoredInstructions } from "@/lib/store";

/**
 * GET /api/admin/instructions
 * Returns the current instructions (stored or file default).
 */
export async function GET(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    const stored = await getStoredInstructions();

    if (stored && stored.trim().length > 0) {
      return NextResponse.json({
        instructions: stored,
        source: "custom",
      });
    }

    const filePath = join(process.cwd(), "prompts", "angel.md");
    const fileContent = readFileSync(filePath, "utf-8").trim();

    return NextResponse.json({
      instructions: fileContent,
      source: "default",
    });
  } catch (error) {
    console.error("Failed to load instructions:", error);
    return NextResponse.json(
      { error: "Failed to load instructions" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/instructions
 * Saves new instructions to the store.
 */
export async function PUT(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  let body: { instructions?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { instructions } = body;

  if (!instructions || typeof instructions !== "string" || instructions.trim().length === 0) {
    return NextResponse.json(
      { error: "Instructions cannot be empty" },
      { status: 400 }
    );
  }

  try {
    await setStoredInstructions(instructions.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save instructions:", error);
    return NextResponse.json(
      { error: "Failed to save instructions" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/instructions
 * Resets to the default file-based instructions by clearing the store.
 */
export async function DELETE(request: NextRequest) {
  const authError = validateAdmin(request);
  if (authError) return authError;

  try {
    await setStoredInstructions("");
    return NextResponse.json({ ok: true, message: "Reset to default instructions" });
  } catch (error) {
    console.error("Failed to reset instructions:", error);
    return NextResponse.json(
      { error: "Failed to reset instructions" },
      { status: 500 }
    );
  }
}
