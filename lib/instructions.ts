import { readFileSync } from "fs";
import { join } from "path";

let cached: string | null = null;

export function getAngelInstructions(): string {
  const override = process.env.ANGEL_INSTRUCTIONS_OVERRIDE;
  if (override && override.trim().length > 0) {
    return override.trim();
  }

  if (cached) {
    return cached;
  }

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

  cached = content;
  return cached;
}
