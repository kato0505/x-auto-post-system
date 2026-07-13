export type BufferPostResult = {
  id: string;
  text: string;
  dueAt: string | null;
};

const CREATE_POST_MUTATION = `
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess {
      post {
        id
        text
        dueAt
      }
    }
    ... on MutationError {
      message
    }
  }
}
`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendOnce(text: string): Promise<BufferPostResult> {
  const apiKey = process.env.BUFFER_API_KEY;
  const channelId = process.env.BUFFER_CHANNEL_ID;
  if (!apiKey) throw new Error("BUFFER_API_KEY が設定されていません。");
  if (!channelId) throw new Error("BUFFER_CHANNEL_ID が設定されていません。");

  const endpoint = process.env.BUFFER_GRAPHQL_ENDPOINT || "https://api.buffer.com";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: CREATE_POST_MUTATION,
      variables: {
        input: {
          text,
          channelId,
          schedulingType: "automatic",
          mode: "addToQueue",
        },
      },
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Buffer API error: ${response.status} ${body.slice(0, 500)}`);
  }

  const parsed = JSON.parse(body);
  if (parsed.errors?.length) {
    throw new Error(`Buffer GraphQL error: ${JSON.stringify(parsed.errors).slice(0, 500)}`);
  }

  const result = parsed.data?.createPost;
  if (result?.message) {
    throw new Error(`Buffer mutation error: ${result.message}`);
  }
  if (!result?.post?.id) {
    throw new Error(`Buffer response missing post id: ${body.slice(0, 500)}`);
  }

  return {
    id: result.post.id,
    text: result.post.text,
    dueAt: result.post.dueAt ?? null,
  };
}

export async function sendPostToBuffer(text: string, maxRetries = 3): Promise<BufferPostResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await sendOnce(text);
    } catch (error) {
      lastError = error;
      console.log(`Buffer送信失敗 ${attempt}/${maxRetries}: ${(error as Error).message}`);
      if (attempt < maxRetries) await sleep(1000 * attempt);
    }
  }

  throw lastError;
}
