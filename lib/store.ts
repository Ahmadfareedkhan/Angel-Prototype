import { getStore } from "@netlify/blobs";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const isNetlify = !!process.env.NETLIFY;

// ---------------------------------------------------------------------------
// Local‑dev fallback: JSON files in `.data/` (gitignored)
// ---------------------------------------------------------------------------

function localPath(filename: string): string {
  const dir = join(process.cwd(), ".data");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, filename);
}

function localGet(filename: string): string | null {
  const p = localPath(filename);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf-8");
}

function localSet(filename: string, value: string): void {
  writeFileSync(localPath(filename), value, "utf-8");
}

// ---------------------------------------------------------------------------
// Instructions store
// ---------------------------------------------------------------------------

const INSTRUCTIONS_KEY = "angel-instructions";

export async function getStoredInstructions(): Promise<string | null> {
  if (!isNetlify) {
    return localGet("instructions.txt");
  }

  const store = getStore("angel-config");
  const value = await store.get(INSTRUCTIONS_KEY, { type: "text" });
  return value ?? null;
}

export async function setStoredInstructions(content: string): Promise<void> {
  if (!isNetlify) {
    localSet("instructions.txt", content);
    return;
  }

  const store = getStore("angel-config");
  await store.set(INSTRUCTIONS_KEY, content);
}

// ---------------------------------------------------------------------------
// Feedback store
// ---------------------------------------------------------------------------

interface FeedbackEntry {
  id: string;
  rating: "positive" | "negative";
  comment: string;
  timestamp: string;
}

export async function saveFeedback(entry: FeedbackEntry): Promise<void> {
  if (!isNetlify) {
    const p = localPath("feedback.json");
    const existing: FeedbackEntry[] = existsSync(p)
      ? JSON.parse(readFileSync(p, "utf-8"))
      : [];
    existing.push(entry);
    writeFileSync(p, JSON.stringify(existing, null, 2), "utf-8");
    return;
  }

  const store = getStore("angel-feedback");
  await store.setJSON(entry.id, entry);
}

export async function listFeedback(): Promise<FeedbackEntry[]> {
  if (!isNetlify) {
    const p = localPath("feedback.json");
    if (!existsSync(p)) return [];
    return JSON.parse(readFileSync(p, "utf-8"));
  }

  const store = getStore("angel-feedback");
  const { blobs } = await store.list();
  const entries: FeedbackEntry[] = [];
  for (const blob of blobs) {
    const data = await store.get(blob.key, { type: "json" });
    if (data) entries.push(data as FeedbackEntry);
  }
  return entries;
}
