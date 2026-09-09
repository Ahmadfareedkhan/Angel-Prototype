import { readFileSync } from "fs";
import { join } from "path";
import { getStoredInstructions } from "./store";

let fileCache: string | null = null;

function getFileInstructions(): string {
  if (fileCache) return fileCache;

  const filePath = join(process.cwd(), "prompts", "angel.md");

  let content: string;
  try {
    content = readFileSync(filePath, "utf-8").trim();
  } catch (error) {
    throw new Error(
      `Failed to read Angel instructions from ${filePath}. ` +
        `Ensure prompts/angel.md exists and is included in the serverless bundle. ` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (content.length === 0) {
    throw new Error(
      "Angel instructions file is empty. " +
        "A session without instructions would start a generic OpenAI persona, not Angel."
    );
  }

  fileCache = content;
  return fileCache;
}

/**
 * Loads Angel instructions with the following priority:
 * 1. ANGEL_INSTRUCTIONS_OVERRIDE env var (highest)
 * 2. Netlify Blobs store (admin-edited instructions)
 * 3. prompts/angel.md file (default)
 */
export async function getAngelInstructions(): Promise<string> {
  // 1. Env var override (always wins)
  const override = process.env.ANGEL_INSTRUCTIONS_OVERRIDE;
  if (override && override.trim().length > 0) {
    return override.trim();
  }

  // 2. Admin-edited instructions from store
  try {
    const stored = await getStoredInstructions();
    if (stored && stored.trim().length > 0) {
      return stored.trim();
    }
  } catch (error) {
    console.error("Failed to read stored instructions, falling back to file:", error);
  }

  // 3. File-based default
  return getFileInstructions();
}
