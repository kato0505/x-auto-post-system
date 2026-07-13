import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PostStatus = "generated" | "sent" | "failed" | "dry_run";

export type PostHistoryEntry = {
  id: string;
  text: string;
  theme?: string;
  hasCta?: boolean;
  status: PostStatus;
  generatedAt: string;
  sentAt?: string;
  bufferPostId?: string;
  bufferDueAt?: string | null;
  error?: string;
};

const HISTORY_PATH = path.resolve("data/post-history.json");

export async function loadHistory(): Promise<PostHistoryEntry[]> {
  try {
    const raw = await readFile(HISTORY_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function saveHistory(history: PostHistoryEntry[]): Promise<void> {
  await mkdir(path.dirname(HISTORY_PATH), { recursive: true });
  await writeFile(HISTORY_PATH, `${JSON.stringify(history, null, 2)}\n`, "utf8");
}

export function makePostId(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

export function recentHistory(history: PostHistoryEntry[], days: number): PostHistoryEntry[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return history.filter((entry) => {
    const time = Date.parse(entry.sentAt || entry.generatedAt);
    return Number.isFinite(time) && time >= cutoff;
  });
}

export function recentCtaCount(history: PostHistoryEntry[], limit = 4): number {
  return history
    .filter((entry) => entry.status === "sent" || entry.status === "dry_run")
    .slice(-limit)
    .filter((entry) => entry.hasCta)
    .length;
}
