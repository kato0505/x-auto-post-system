import "dotenv/config";
import { generatePosts } from "./generatePosts.js";
import { loadHistory, makePostId, saveHistory, type PostHistoryEntry } from "./history.js";
import { sendPostToBuffer } from "./bufferClient.js";
import { validatePosts, type ValidatedPost } from "./validation.js";

const DESIRED_POST_COUNT = 3;

function nowIso(): string {
  return new Date().toISOString();
}

function requireEnv(): void {
  const missing = ["OPENAI_API_KEY", "BUFFER_API_KEY", "BUFFER_CHANNEL_ID"].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`環境変数が足りません: ${missing.join(", ")}`);
  }
}

async function collectValidPosts(history: PostHistoryEntry[]): Promise<ValidatedPost[]> {
  const accepted: ValidatedPost[] = [];
  let workingHistory = [...history];

  for (let round = 1; round <= 3 && accepted.length < DESIRED_POST_COUNT; round += 1) {
    console.log(`OpenAIで投稿生成: ${round}回目`);
    const generated = await generatePosts(workingHistory, DESIRED_POST_COUNT);
    const valid = validatePosts(generated, workingHistory, DESIRED_POST_COUNT - accepted.length);
    accepted.push(...valid);
    workingHistory = [
      ...workingHistory,
      ...valid.map((post) => ({
        id: makePostId(post.text),
        text: post.text,
        theme: post.theme,
        hasCta: post.hasCta,
        status: "generated" as const,
        generatedAt: nowIso(),
      })),
    ];
  }

  return accepted.slice(0, DESIRED_POST_COUNT);
}

async function main(): Promise<void> {
  requireEnv();

  const dryRun = process.env.DRY_RUN === "true";
  const history = await loadHistory();
  const posts = await collectValidPosts(history);

  if (posts.length === 0) {
    throw new Error("有効な投稿が0件でした。生成ルールか履歴の重複条件を確認してください。");
  }

  if (posts.length < DESIRED_POST_COUNT) {
    console.log(`注意: 有効な投稿は${posts.length}件だけでした。取れた分だけ処理します。`);
  }

  const nextHistory = [...history];
  let successCount = 0;
  let failCount = 0;

  for (const post of posts) {
    const entry: PostHistoryEntry = {
      id: makePostId(post.text),
      text: post.text,
      theme: post.theme,
      hasCta: post.hasCta,
      status: dryRun ? "dry_run" : "generated",
      generatedAt: nowIso(),
    };

    if (dryRun) {
      console.log(`DRY_RUN: Bufferへ送らず保存します: ${post.text}`);
      nextHistory.push(entry);
      successCount += 1;
      continue;
    }

    try {
      const result = await sendPostToBuffer(post.text);
      entry.status = "sent";
      entry.sentAt = nowIso();
      entry.bufferPostId = result.id;
      entry.bufferDueAt = result.dueAt;
      console.log(`Buffer投入OK: ${result.id} / ${post.text}`);
      successCount += 1;
    } catch (error) {
      entry.status = "failed";
      entry.error = (error as Error).message;
      console.log(`Buffer投入失敗: ${entry.error}`);
      failCount += 1;
    } finally {
      nextHistory.push(entry);
      await saveHistory(nextHistory);
    }
  }

  console.log(`完了: 成功 ${successCount}件 / 失敗 ${failCount}件`);

  if (successCount === 0 && !dryRun) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`実行失敗: ${(error as Error).message}`);
  process.exitCode = 1;
});
