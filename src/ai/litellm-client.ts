/** OpenAI-compatible content part for multimodal messages */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

/** OpenAI-compatible chat message for LiteLLM /chat/completions */
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
};

const DEFAULT_BASE_URL = 'https://api.ai.it.ufl.edu/v1';

function getBaseUrl() {
  const raw =
    process.env.LITELLM_BASE_URL ||
    process.env.LITELLM_BASE ||
    process.env.PRACTICE_BASE_URL ||
    DEFAULT_BASE_URL;
  return String(raw).replace(/\/$/, '');
}

function getApiKey() {
  const key =
    process.env.LITELLM_API_KEY || process.env.PRACTICE_API_KEY || '';
  if (!key) {
    throw new Error('LITELLM_API_KEY (or PRACTICE_API_KEY) is not configured');
  }
  return key;
}

function hasImageContent(messages: ChatMessage[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const c = messages[i].content;
    if (Array.isArray(c)) {
      if (c.some((p) => p.type === 'image_url')) return true;
    }
  }
  return false;
}

export async function litellmChatCompletion(options: {
  messages: ChatMessage[];
  model?: string;
  modelEnvKey?: string;
  defaultModel?: string;
  maxTokens?: number;
  temperature?: number;
  useVisionModel?: boolean;
}) {
  const {
    messages,
    model: modelOverride,
    modelEnvKey = 'LITELLM_CHAT_MODEL',
    defaultModel = 'mistral-small-3.1',
    maxTokens = 1024,
    temperature = 0.7,
    useVisionModel,
  } = options;

  const base = getBaseUrl();
  const key = getApiKey();
  const useVision = useVisionModel ?? hasImageContent(messages);
  const model = modelOverride
    ? modelOverride
    : useVision
      ? (process.env.LITELLM_VISION_MODEL || process.env[modelEnvKey] || defaultModel)
      : (process.env[modelEnvKey] || defaultModel);

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      (data && (data.error?.message || data.message)) ||
      `LiteLLM chat completion failed (${response.status})`;
    throw new Error(message);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content returned from LiteLLM chat completion');
  }

  return content as string;
}

export async function litellmTextToSpeech(options: {
  text: string;
  model?: string;
  voice?: string;
}) {
  const { text, model = 'kokoro', voice = 'alloy' } = options;

  const trimmed = text.trim();
  if (!trimmed) {
    return { audioBuffer: Buffer.alloc(0), contentType: 'audio/mpeg' };
  }

  const base = getBaseUrl();
  const key = getApiKey();

  const response = await fetch(`${base}/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      input: trimmed,
      voice,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    try {
      const parsed = JSON.parse(errText);
      const msg =
        parsed?.error?.message ?? parsed?.message ?? 'LiteLLM TTS request failed';
      throw new Error(msg);
    } catch (e) {
      if (e instanceof Error && e.message !== errText) throw e;
      const short =
        errText.length > 80 ? `${errText.slice(0, 80)}…` : errText || response.statusText;
      throw new Error(`TTS request failed (${response.status}): ${short}`);
    }
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  return { audioBuffer, contentType };
}

/** OpenAI-compatible image generation (e.g. flux.1-dev, flux.1-schnell) */
export async function litellmImageGeneration(options: {
  prompt: string;
  model?: string;
  modelEnvKey?: string;
  size?: string;
  response_format?: 'url' | 'b64_json';
  n?: number;
}) {
  const {
    prompt,
    model: modelOverride,
    modelEnvKey = 'LITELLM_IMAGE_MODEL',
    size = '1024x1024',
    response_format = 'b64_json',
    n = 1,
  } = options;

  const base = getBaseUrl();
  const key = getApiKey();
  const model = modelOverride || process.env[modelEnvKey] || 'flux.1-schnell';

  const response = await fetch(`${base}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      n,
      size,
      response_format,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      (data && (data.error?.message || data.message)) ||
      `LiteLLM image generation failed with status ${response.status}`;
    throw new Error(message);
  }

  const first = data.data?.[0];
  if (!first) {
    throw new Error('No image returned from LiteLLM image generation');
  }

  return {
    imageUrl: first.url ?? undefined,
    imageBase64: first.b64_json ?? undefined,
  };
}

/** Build multipart body for LiteLLM /audio/transcriptions */
function buildTranscriptionBody(
  raw: Buffer,
  filename: string,
  mimeType: string,
  model: string
): { body: Buffer; boundary: string } {
  const boundary = '----LiteLLMFormBoundary' + Math.random().toString(36).slice(2);
  const CRLF = '\r\n';
  const tail = `${CRLF}--${boundary}${CRLF}Content-Disposition: form-data; name="model"${CRLF}${CRLF}${model}${CRLF}--${boundary}--${CRLF}`;
  const parts = [
    Buffer.from(
      `--${boundary}${CRLF}Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}Content-Type: ${mimeType}${CRLF}${CRLF}`,
      'utf8'
    ),
    raw,
    Buffer.from(tail, 'utf8'),
  ];
  return { body: Buffer.concat(parts), boundary };
}

/**
 * Transcribe audio via LiteLLM /audio/transcriptions (e.g. whisper-large-v3).
 * Returns transcript text.
 */
export async function litellmTranscribe(options: {
  audioBuffer: Buffer;
  filename?: string;
  model?: string;
}): Promise<string> {
  const { audioBuffer, filename = 'audio.webm', model = 'whisper-large-v3' } = options;
  const base = getBaseUrl();
  const key = getApiKey();
  const mimeType = filename.endsWith('.webm') ? 'audio/webm' : filename.endsWith('.wav') ? 'audio/wav' : 'audio/webm';
  const { body, boundary } = buildTranscriptionBody(audioBuffer, filename, mimeType, model);

  const response = await fetch(`${base}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${key}`,
    },
    body,
  });

  const rawBody = await response.text();
  if (!response.ok) {
    let errMsg = rawBody?.slice(0, 200) || `Status ${response.status}`;
    try {
      const j = JSON.parse(rawBody);
      errMsg = j.error?.message || j.message || errMsg;
    } catch {
      // use rawBody
    }
    throw new Error(errMsg);
  }
  try {
    const data = JSON.parse(rawBody);
    return (data.text ?? data.transcript ?? data.transcription ?? '').trim();
  } catch {
    return rawBody.trim();
  }
}

/**
 * Embed text via OpenAI-compatible /embeddings endpoint (e.g. sfr-embedding-mistral).
 * Returns the embedding vector as number[].
 */
export async function litellmEmbed(options: {
  input: string;
  model?: string;
  modelEnvKey?: string;
}): Promise<number[]> {
  const {
    input,
    model: modelOverride,
    modelEnvKey = 'LITELLM_EMBEDDING_MODEL',
  } = options;

  const base = getBaseUrl();
  const key = getApiKey();
  const model = modelOverride || process.env[modelEnvKey] || 'sfr-embedding-mistral';

  const response = await fetch(`${base}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      input: input.trim() || ' ',
      encoding_format: 'float',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      (data && (data.error?.message || data.message)) ||
      `LiteLLM embeddings failed (${response.status})`;
    throw new Error(message);
  }

  const embedding = data.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error('No embedding returned from LiteLLM embeddings');
  }

  return embedding as number[];
}

