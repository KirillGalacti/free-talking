import "dotenv/config";
import OpenAI from "openai";

// Same Yandex Cloud access as the shared ai-negotiation-arena project: YandexGPT via the
// OpenAI-compatible endpoint and SpeechKit for speech. Keys never leave the server.
export const apiKey = process.env.YANDEX_API_KEY;
export const folderId = process.env.YANDEX_FOLDER_ID;

if (!apiKey) throw new Error("Нет YANDEX_API_KEY в файле .env");
if (!folderId) throw new Error("Нет YANDEX_FOLDER_ID в файле .env");

const ai = new OpenAI({
  apiKey,
  project: folderId,
  baseURL: "https://ai.api.cloud.yandex.net/v1",
  timeout: 60_000,
  maxRetries: 1,
});

/** Fast model for live replies (as in the shared project). */
export const CHAT_MODEL = process.env.YANDEX_CHAT_MODEL || "yandexgpt-5-lite";
/** Stronger model for scenario assembly and evaluation; falls back to the chat model. */
export const REASONING_MODEL = process.env.YANDEX_REASONING_MODEL || "yandexgpt/latest";

const unavailable = new Set<string>();

export interface CompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function complete(
  messages: CompletionMessage[],
  options: { model?: string; temperature?: number; maxTokens?: number } = {},
): Promise<{ text: string; model: string }> {
  const preferred = options.model ?? CHAT_MODEL;
  const models = [preferred, CHAT_MODEL].filter((model, index, list) => list.indexOf(model) === index && !unavailable.has(model));
  let lastError: unknown = null;
  for (const model of models) {
    try {
      const result = await ai.chat.completions.create({
        model: `gpt://${folderId}/${model}`,
        messages,
        temperature: options.temperature ?? 0.5,
        max_tokens: options.maxTokens ?? 900,
      });
      const text = result.choices[0]?.message?.content?.trim();
      if (!text) throw new Error("Модель вернула пустой ответ");
      return { text, model };
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number }).status;
      if (status === 400 || status === 403 || status === 404) unavailable.add(model);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("YandexGPT недоступен");
}

/** Extracts the first JSON object from a model answer (handles ``` fences and prose around it). */
export function parseModelJson(value: string): Record<string, unknown> {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced || value;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Модель не вернула JSON");
  const parsed: unknown = JSON.parse(source.slice(start, end + 1));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Модель вернула некорректный JSON");
  return parsed as Record<string, unknown>;
}

export async function recognizeSpeech(pcm: Buffer) {
  const response = await fetch(
    "https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&format=lpcm&sampleRateHertz=16000",
    {
      method: "POST",
      headers: { Authorization: `Api-Key ${apiKey}`, "Content-Type": "application/octet-stream" },
      body: new Uint8Array(pcm),
    },
  );
  const payload = (await response.json()) as { result?: string; error_message?: string };
  if (!response.ok) throw new Error(payload.error_message || `SpeechKit вернул ${response.status}`);
  const text = payload.result?.trim();
  if (!text) throw new Error("Речь не распознана. Попробуйте говорить ближе к микрофону.");
  return text;
}

export async function synthesizeSpeech(text: string, gender: "f" | "m") {
  const response = await fetch("https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize", {
    method: "POST",
    headers: { Authorization: `Api-Key ${apiKey}` },
    body: new URLSearchParams({
      text: text.slice(0, 4800),
      lang: "ru-RU",
      voice: gender === "m" ? "filipp" : "alena",
      format: "mp3",
      speed: "1.05",
    }),
  });
  if (!response.ok) throw new Error(`SpeechKit TTS вернул ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
