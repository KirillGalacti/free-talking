import "dotenv/config";

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { isSeed } from "../shared/seed";
import { PRESET_SEED, presetBrief } from "../shared/preset-scenario";
import type { ChatReplyPayload } from "../shared/types";
import { getScenario, saveScenario } from "./card";
import { counterpartyReply, type Turn } from "./counterparty";
import { analyzeSession, normalizeAnalysisInput } from "./evaluator";
import { assembleScenario, describeSettingsForLog, sanitizeSettings } from "./scenario";
import { recognizeSpeech, synthesizeSpeech } from "./yandex";

const port = Number(process.env.API_PORT || 3002);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const app = express();
app.use(express.json({ limit: "1mb" }));

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizeMessages(value: unknown): Turn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((message): message is Turn =>
      typeof message === "object" && message !== null &&
      ["user", "assistant"].includes((message as Turn).role) && typeof (message as Turn).content === "string")
    .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 4000) }))
    .filter((message) => message.content.length > 0)
    .slice(-40);
}

// ---------- scenario: assemble, preset, load by seed ----------

app.post("/api/scenario/assemble", async (request, response) => {
  const settings = sanitizeSettings(request.body?.settings);
  try {
    const { brief, card, model, settings: effective } = await assembleScenario(settings);
    saveScenario({ brief, card, model, createdAt: brief.createdAt });
    console.log(`Сценарий ${brief.seed} собран (${describeSettingsForLog(effective)}, ${model})`);
    response.json({ brief });
  } catch (error) {
    console.error("Ошибка сборки сценария:", error);
    response.status(502).json({ error: "Генератор сейчас недоступен. Частично собранную ситуацию мы не используем." });
  }
});

app.post("/api/scenario/preset", (_request, response) => {
  response.json({ brief: presetBrief });
});

app.get("/api/scenario/:seed", (request, response) => {
  const seed = String(request.params.seed).toUpperCase();
  const scenario = isSeed(seed) ? getScenario(seed) : null;
  if (!scenario) {
    response.status(404).json({ error: "Сессия с таким seed не найдена" });
    return;
  }
  response.json({ brief: scenario.brief });
});

// ---------- meeting: counterparty replies ----------

const chatRequests = new Map<string, { fingerprint: string; promise: Promise<ChatReplyPayload> }>();

app.post("/api/chat", async (request, response) => {
  const seed = String(request.body?.seed ?? "").toUpperCase();
  const scenario = isSeed(seed) ? getScenario(seed) : null;
  if (!scenario) {
    response.status(404).json({ error: "Сценарий встречи не найден. Начните новую сессию." });
    return;
  }
  const messages = normalizeMessages(request.body?.messages);
  const closing = request.body?.phase === "CLOSING_REQUIRED";
  const timeUp = request.body?.timeUp === true;
  const clientEventId = typeof request.body?.clientEventId === "string" && request.body.clientEventId.length <= 100
    ? request.body.clientEventId
    : undefined;

  if (messages.length === 0 || messages.at(-1)?.role !== "user") {
    response.status(400).json({ error: "Сообщение не передано" });
    return;
  }
  if (closing && !messages.slice(0, -1).some((message) => message.role === "assistant" && /Подведите итог/i.test(message.content))) {
    response.status(409).json({ error: "Финальное действие пока не запрошено" });
    return;
  }

  try {
    const fingerprint = JSON.stringify({ seed, closing, messages });
    const cached = clientEventId ? chatRequests.get(clientEventId) : undefined;
    if (cached && cached.fingerprint !== fingerprint) {
      response.status(409).json({ error: "Идентификатор хода уже использован" });
      return;
    }
    // A repeated delivery of the same turn returns the same reply instead of a second one.
    const promise = cached?.promise ?? counterpartyReply({ brief: scenario.brief, card: scenario.card, messages, closing, timeUp });
    if (clientEventId && !cached) {
      chatRequests.set(clientEventId, { fingerprint, promise });
      if (chatRequests.size > 1_000) chatRequests.delete(chatRequests.keys().next().value!);
    }
    response.json(await promise);
  } catch (error) {
    if (clientEventId) chatRequests.delete(clientEventId);
    console.error("Ошибка YandexGPT:", error);
    response.status(502).json({ error: errorMessage(error, "Ошибка YandexGPT") });
  }
});

// ---------- speech ----------

app.post("/api/transcribe", upload.single("audio"), async (request, response) => {
  if (!request.file?.buffer.length) {
    response.status(400).json({ error: "Аудиозапись не передана" });
    return;
  }
  if (request.file.mimetype !== "audio/lpcm") {
    response.status(415).json({ error: "Формат записи устарел. Обновите страницу и попробуйте снова." });
    return;
  }
  if (request.file.buffer.length % 2 !== 0) {
    response.status(400).json({ error: "Аудиозапись повреждена. Запишите ещё раз." });
    return;
  }
  if (request.file.buffer.length > 1_000_000) {
    response.status(413).json({ error: "Запись слишком длинная. Запишите не более 30 секунд." });
    return;
  }
  try {
    response.json({ text: await recognizeSpeech(request.file.buffer) });
  } catch (error) {
    console.error("Ошибка распознавания речи:", error);
    response.status(502).json({ error: errorMessage(error, "Не удалось распознать речь") });
  }
});

app.post("/api/tts", async (request, response) => {
  const text = typeof request.body?.text === "string" ? request.body.text.trim() : "";
  if (!text) {
    response.status(400).json({ error: "Нет текста для озвучивания" });
    return;
  }
  try {
    const audio = await synthesizeSpeech(text, request.body?.gender === "m" ? "m" : "f");
    response.setHeader("Content-Type", "audio/mpeg");
    response.setHeader("Cache-Control", "no-store");
    response.send(audio);
  } catch (error) {
    console.error("Ошибка озвучивания:", error);
    response.status(502).json({ error: "Озвучивание недоступно" });
  }
});

// ---------- evaluation ----------

app.post("/api/analyze", async (request, response) => {
  let input: ReturnType<typeof normalizeAnalysisInput>;
  try {
    input = normalizeAnalysisInput(request.body);
  } catch (error) {
    response.status(400).json({ error: errorMessage(error, "Некорректная сессия") });
    return;
  }
  const scenario = getScenario(input.seed) ?? getScenario(PRESET_SEED)!;
  try {
    response.json({ analysis: await analyzeSession(input, scenario.brief, scenario.card) });
  } catch (error) {
    console.error("Ошибка анализа встречи:", error);
    response.status(502).json({ error: "Не удалось подготовить разбор. Встреча сохранена — повторите анализ." });
  }
});

// ---------- static build ----------

const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/{*path}", (_request, response) => response.sendFile(path.join(clientDist, "index.html")));
}

app.listen(port, "127.0.0.1", () => {
  console.log(`API запущен: http://127.0.0.1:${port}`);
});
