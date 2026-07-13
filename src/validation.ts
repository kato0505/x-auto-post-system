import type { PostHistoryEntry } from "./history.js";
import { recentHistory } from "./history.js";

export type GeneratedPost = {
  text: string;
  theme?: string;
  hasCta?: boolean;
};

export type ValidatedPost = GeneratedPost & {
  text: string;
};

const MAX_POST_LENGTH = 140;
const SIMILARITY_THRESHOLD = 0.72;
const BLOCKED_PHRASES = [
  "必ず稼げる",
  "絶対稼げる",
  "誰でも稼げる",
  "収益保証",
  "月収保証",
  "確実に稼げる",
];

function normalize(text: string): string {
  return text
    .replace(/\s+/g, "")
    .replace(/[、。,.!！?？「」『』（）()【】\[\]#＃]/g, "")
    .toLowerCase();
}

function bigrams(text: string): Set<string> {
  const normalized = normalize(text);
  const set = new Set<string>();
  for (let index = 0; index < normalized.length - 1; index += 1) {
    set.add(normalized.slice(index, index + 2));
  }
  return set;
}

export function similarity(a: string, b: string): number {
  const left = bigrams(a);
  const right = bigrams(b);
  if (left.size === 0 || right.size === 0) return 0;

  let overlap = 0;
  for (const item of left) {
    if (right.has(item)) overlap += 1;
  }
  return (2 * overlap) / (left.size + right.size);
}

function rejectReason(post: GeneratedPost, history: PostHistoryEntry[], accepted: ValidatedPost[]): string | null {
  const text = (post.text || "").trim();
  if (!text) return "空文字";
  if (text.length > MAX_POST_LENGTH) return `文字数オーバー: ${text.length}文字`;
  if (/[#＃]/.test(text)) return "ハッシュタグ入り";
  if (BLOCKED_PHRASES.some((phrase) => text.includes(phrase))) return "誇大表現入り";

  const normalized = normalize(text);
  if (accepted.some((item) => normalize(item.text) === normalized)) return "今回生成内で重複";

  const last14Days = recentHistory(history, 14);
  if (last14Days.some((entry) => normalize(entry.text) === normalized)) return "過去14日内と完全一致";

  const last7Days = recentHistory(history, 7);
  const tooSimilar = last7Days.find((entry) => similarity(entry.text, text) >= SIMILARITY_THRESHOLD);
  if (tooSimilar) return "過去7日内と類似";

  return null;
}

export function validatePosts(posts: GeneratedPost[], history: PostHistoryEntry[], desiredCount = 3): ValidatedPost[] {
  const accepted: ValidatedPost[] = [];

  for (const post of posts) {
    const text = (post.text || "").trim();
    const reason = rejectReason({ ...post, text }, history, accepted);
    if (reason) {
      console.log(`skip: ${reason} / ${text.slice(0, 40)}`);
      continue;
    }
    accepted.push({ ...post, text });
    if (accepted.length >= desiredCount) break;
  }

  return accepted;
}
