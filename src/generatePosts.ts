import type { GeneratedPost } from "./validation.js";
import type { PostHistoryEntry } from "./history.js";
import { recentCtaCount, recentHistory } from "./history.js";

type ResponsesApiResult = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type GeneratedPostResponse = {
  posts: GeneratedPost[];
};

const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";

function extractOutputText(result: ResponsesApiResult): string {
  if (result.output_text) return result.output_text;

  for (const item of result.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }

  throw new Error("OpenAIの返答から投稿JSONを読み取れませんでした。");
}

function buildPrompt(history: PostHistoryEntry[], count: number): string {
  const last14Days = recentHistory(history, 14)
    .map((entry) => `- ${entry.text}`)
    .join("\n");
  const shouldAddCta = recentCtaCount(history, 4) === 0;

  return `
あなたはX投稿の編集者です。以下の条件で、日本語のX投稿を${count}本作ってください。

ターゲット:
- 人生を変えたいが、何から始めればいいか分からない人
- 副業やAIに興味はあるが、情報が多すぎて動けない人

発信テーマ:
- 人生を変えるための考え方
- 副業を続ける仕組み
- 行動できない原因
- 小さく始める方法
- 正しい順番
- 完全実行マニュアルへの興味づけ

文体:
- 一人称は「私」
- 先生目線ではなく、一緒に進む人の目線
- 説教臭くしない
- 1投稿140文字以内
- 1投稿につき伝える内容は1つ
- 冒頭1行で興味を引く
- 具体例を1つ入れる
- 抽象論だけで終わらせない
- ハッシュタグなし
- 誇大表現、収益保証なし

CTA:
- ${shouldAddCta ? "今回は1本だけ、プロフィールまたはLINEにつながる自然な一文を入れてもよい。" : "今回はプロフィールやLINE誘導を入れない。"}
- 毎回LINE誘導はしない。

過去14日以内の投稿と同じ文章は禁止:
${last14Days || "- なし"}
`.trim();
}

export async function generatePosts(history: PostHistoryEntry[], count = 3): Promise<GeneratedPost[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY が設定されていません。");

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(history, count),
      text: {
        format: {
          type: "json_schema",
          name: "x_post_generation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["posts"],
            properties: {
              posts: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["text", "theme", "hasCta"],
                  properties: {
                    text: { type: "string" },
                    theme: { type: "string" },
                    hasCta: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${body.slice(0, 500)}`);
  }

  const parsed = JSON.parse(extractOutputText(JSON.parse(body))) as GeneratedPostResponse;
  return parsed.posts;
}
