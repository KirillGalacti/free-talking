import type { ChatReplyPayload, ChatTurn, PublicBrief, SessionAnalysis, SessionSettings, StoredSession } from "../../shared/types";
import { encodePcm16 } from "@/lib/audio-pcm";

async function readJson<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let payload: (T & { error?: string }) | null = null;
  try {
    payload = raw ? JSON.parse(raw) as T & { error?: string } : null;
  } catch {
    // A failed proxy or an upstream service can return HTML instead of JSON.
  }
  if (!response.ok) {
    throw new ApiError(payload?.error || `Сервер вернул ошибку ${response.status}. Повторите действие.`, response.status);
  }
  if (!payload) throw new ApiError("Сервер вернул пустой ответ. Повторите действие.", 502);
  return payload;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function post(url: string, body: unknown, signal?: AbortSignal) {
  return fetch(url, { method: "POST", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export async function assembleScenario(settings: SessionSettings, signal?: AbortSignal) {
  return readJson<{ brief: PublicBrief }>(await post("/api/scenario/assemble", { settings }, signal));
}

export async function loadPresetScenario(signal?: AbortSignal) {
  return readJson<{ brief: PublicBrief }>(await post("/api/scenario/preset", {}, signal));
}

export async function loadScenarioBySeed(seed: string, signal?: AbortSignal) {
  return readJson<{ brief: PublicBrief }>(await fetch(`/api/scenario/${encodeURIComponent(seed)}`, { signal }));
}

export async function requestReply(
  seed: string,
  messages: ChatTurn[],
  signal: AbortSignal,
  options: { phase: "ACTIVE" | "CLOSING_REQUIRED"; clientEventId: string; timeUp: boolean },
) {
  return readJson<ChatReplyPayload>(await post("/api/chat", {
    seed,
    phase: options.phase,
    clientEventId: options.clientEventId,
    timeUp: options.timeUp,
    messages: messages.map(({ role, content }) => ({ role, content })),
  }, signal));
}

export async function synthesizeSpeech(text: string, gender: "f" | "m", signal?: AbortSignal) {
  const response = await post("/api/tts", { text, gender }, signal);
  if (!response.ok) throw new ApiError("Озвучивание недоступно", response.status);
  return response.blob();
}

export async function transcribeAudio(blob: Blob, signal: AbortSignal) {
  let decoded: AudioBuffer;
  try {
    const decoder = new OfflineAudioContext(1, 1, 16_000);
    decoded = await decoder.decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new Error("Не удалось обработать аудиозапись. Попробуйте записать ещё раз.");
  }
  const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index));
  const pcm = encodePcm16(channels);
  if (pcm.byteLength > 1_000_000) throw new Error("Запись слишком длинная. Запишите не более 30 секунд.");
  const formData = new FormData();
  formData.append("audio", new Blob([pcm], { type: "audio/lpcm" }), "negotiation.pcm");
  return readJson<{ text: string }>(await fetch("/api/transcribe", { method: "POST", body: formData, signal }));
}

export async function analyzeSession(session: StoredSession) {
  const payload = await readJson<{ analysis: SessionAnalysis }>(await post("/api/analyze", {
    session: {
      id: session.id,
      seed: session.seed,
      durationSec: session.durationSec,
      elapsedSec: session.elapsedSec,
      completionReason: session.completionReason,
      dealStatus: session.dealStatus,
      transcript: session.transcript,
    },
  }));
  return payload.analysis;
}
