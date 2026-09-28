import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatReplyPayload, ChatTurn, CompletionReason, CompletionState, DealStatus, PublicBrief, SessionSettings, StoredSession } from "../../shared/types";
import { ApiError, requestReply, synthesizeSpeech, transcribeAudio } from "@/services/api";
import { saveSession } from "@/services/session-store";

export type DialogKind = "pause" | "finish" | "connection";
export type InputMode = "voice" | "text";

interface Options {
  demo?: string | null;
  brief: PublicBrief;
  settings: SessionSettings;
  replay?: { parent: StoredSession; momentId: string; positionTurnId: string } | null;
}

function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

const DEMO_USER = "Понимаю. Что для вас важнее в новом контракте — цена за короб или надёжность поставок?";
const DEMO_REPLY = "Надёжность важна, но бюджет на следующий год урезали. Мне нужно показать экономию.";

export function useMeeting({ brief, settings, replay, demo = null }: Options) {
  const sessionIdRef = useRef(crypto.randomUUID());
  const startedAtRef = useRef(new Date().toISOString());
  const durationSec = brief.durationMin * 60;

  const replayPrefix = useMemo(() => {
    if (!replay) return [];
    const end = replay.parent.transcript.findIndex((turn) => turn.id === replay.positionTurnId);
    return end < 0 ? [] : replay.parent.transcript.slice(0, end + 1);
  }, [replay]);
  const initialElapsed = replayPrefix.at(-1)?.elapsedSec ?? 0;

  const [messages, setMessages] = useState<ChatTurn[]>(() => {
    if (replayPrefix.length) return replayPrefix;
    const opening: ChatTurn = { id: "opening", role: "assistant", content: brief.openingLine, createdAt: startedAtRef.current, elapsedSec: 0 };
    if (demo === "speaking") return [opening, { id: "u1", role: "user", content: DEMO_USER, elapsedSec: 130 }];
    if (demo === "finished") return [opening, { id: "u1", role: "user", content: DEMO_USER, elapsedSec: 130 }, { id: "a1", role: "assistant", content: DEMO_REPLY, elapsedSec: 140 }];
    return [opening];
  });
  const [input, setInput] = useState(demo === "typed" || demo === "review" ? DEMO_USER : "");
  const [hasTranscribedInput, setHasTranscribedInput] = useState(demo === "review");
  const [inputMode, setInputMode] = useState<InputMode>(demo === "text" || demo === "typed" || demo === "review" ? "text" : brief.inputMode);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(demo === "recording");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(demo === "recording" ? 7 : 0);
  const [lastRecordingSeconds, setLastRecordingSeconds] = useState(demo === "review" ? 7 : 0);
  const [isSpeaking, setIsSpeaking] = useState(demo === "speaking");
  const [isPaused, setIsPaused] = useState(demo === "pause" || demo === "finish");
  const [isFinished, setIsFinished] = useState(demo === "finished");
  const [elapsed, setElapsed] = useState(demo ? 115 : initialElapsed);
  const [notice, setNotice] = useState<string | null>(null);
  const [completionState, setCompletionState] = useState<CompletionState>("ACTIVE");
  const [dialog, setDialog] = useState<DialogKind | null>(demo === "pause" || demo === "finish" || demo === "connection" ? demo : null);
  const [briefOpen, setBriefOpen] = useState(demo === "brief");
  const [dealStatus, setDealStatus] = useState<DealStatus>("negotiating");

  const messagesRef = useRef(messages);
  const elapsedRef = useRef(initialElapsed);
  const stateRef = useRef<"active" | "paused" | "finished">("active");
  // Read through a function so TypeScript does not narrow the ref across awaits.
  const currentState = () => stateRef.current;
  const completionStateRef = useRef<CompletionState>("ACTIVE");
  const completionReasonRef = useRef<CompletionReason | undefined>(undefined);
  const dealStatusRef = useRef<DealStatus>("negotiating");
  const isSendingRef = useRef(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const transcriptionAbortRef = useRef<AbortController | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const startingRecordingRef = useRef(false);
  const discardRecordingRef = useRef(false);
  const pendingReplyRef = useRef<{ reply: ChatTurn; transcript: ChatTurn[]; data: ChatReplyPayload; wasClosing: boolean } | null>(null);
  const failedTurnRef = useRef<{ message: ChatTurn; wasClosing: boolean } | null>(null);
  const transcriptRef = useRef<HTMLTextAreaElement | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);

  // ---------- persistence ----------
  const buildSession = useCallback((transcript: ChatTurn[], endedAt?: string, finishReason?: StoredSession["finishReason"]): StoredSession => ({
    schemaVersion: 1,
    id: sessionIdRef.current,
    seed: brief.seed,
    brief,
    settings,
    startedAt: startedAtRef.current,
    endedAt,
    durationSec,
    elapsedSec: Math.round(elapsedRef.current),
    transcript,
    completionState: completionStateRef.current,
    completionReason: completionReasonRef.current,
    dealStatus: dealStatusRef.current,
    finishReason,
    parentSessionId: replay?.parent.id,
    replayFromTurnId: replay?.positionTurnId,
    replayMomentId: replay?.momentId,
    attempt: replay ? replay.parent.attempt + 1 : 1,
  }), [brief, settings, durationSec, replay]);

  const persist = useCallback((transcript = messagesRef.current, endedAt?: string, finishReason?: StoredSession["finishReason"]) => {
    try {
      saveSession(buildSession(transcript, endedAt, finishReason));
      return true;
    } catch {
      setNotice("Не удалось сохранить встречу в браузере. Проверьте свободное место.");
      return false;
    }
  }, [buildSession]);

  useEffect(() => {
    persist(messagesRef.current);
    // The initial transcript is saved before a reload can discard it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- meeting clock: runs while the meeting is active, stops on pause ----------
  useEffect(() => {
    if (isPaused || isFinished || demo) return;
    const timer = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPaused, isFinished]);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages, isSending]);

  // ---------- speech output ----------
  const stopSpeaking = useCallback(() => {
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      URL.revokeObjectURL(audio.src);
    }
    audioRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string) => {
    stopSpeaking();
    const controller = new AbortController();
    ttsAbortRef.current = controller;
    setIsSpeaking(true);
    try {
      const blob = await synthesizeSpeech(text, brief.counterparty.gender, controller.signal);
      if (controller.signal.aborted) return;
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.addEventListener("ended", () => { if (audioRef.current === audio) stopSpeaking(); });
      audio.addEventListener("error", () => { if (audioRef.current === audio) stopSpeaking(); });
      if (stateRef.current === "paused") return;
      await audio.play();
    } catch {
      // Speech is an enhancement: subtitles are always on screen, so a TTS failure is silent.
      if (!controller.signal.aborted) setIsSpeaking(false);
    }
  }, [brief.counterparty.gender, stopSpeaking]);

  useEffect(() => {
    if (!replayPrefix.length && !demo) void speak(brief.openingLine);
    return () => {
      stopSpeaking();
      if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      chatAbortRef.current?.abort();
      transcriptionAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- recording (same pipeline as the shared project) ----------
  function resetRecordingResources() {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  async function transcribeRecording(blob: Blob) {
    if (stateRef.current === "finished") return;
    const controller = new AbortController();
    transcriptionAbortRef.current = controller;
    setIsTranscribing(true);
    setNotice(null);
    try {
      const data = await transcribeAudio(blob, controller.signal);
      if (controller.signal.aborted) return;
      setHasTranscribedInput(Boolean(data.text.trim()));
      setInput((current) => [current.trim(), data.text.trim()].filter(Boolean).join(" "));
      setInputMode("text");
      window.setTimeout(() => { if (stateRef.current === "active") transcriptRef.current?.focus(); }, 0);
    } catch (error) {
      if (controller.signal.aborted) return;
      setNotice(error instanceof Error ? error.message : "Не удалось распознать речь");
    } finally {
      transcriptionAbortRef.current = null;
      setIsTranscribing(false);
    }
  }

  function stopRecording(discard = false) {
    discardRecordingRef.current = discard;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function startRecording() {
    if (startingRecordingRef.current || stateRef.current !== "active") return;
    setNotice(null);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setNotice("Браузер не поддерживает запись с микрофона — переключитесь на текст.");
      return;
    }
    startingRecordingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (stateRef.current !== "active") {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;
      const preferredTypes = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 48_000 } : undefined);
      audioChunksRef.current = [];
      discardRecordingRef.current = false;
      mediaRecorderRef.current = recorder;
      recorder.addEventListener("dataavailable", (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); });
      recorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        resetRecordingResources();
        if (stateRef.current === "finished" || discardRecordingRef.current) return;
        if (audioBlob.size > 0) void transcribeRecording(audioBlob);
        else setNotice("Запись получилась пустой. Проверьте микрофон.");
      });
      recorder.addEventListener("error", () => {
        resetRecordingResources();
        if (stateRef.current !== "finished") setNotice("Браузер не смог записать звук.");
      });
      recorder.start(250);
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        if (recorder.state !== "recording") return;
        setRecordingSeconds((seconds) => {
          setLastRecordingSeconds(seconds + 1);
          if (seconds >= 28) window.setTimeout(() => stopRecording(), 0);
          return seconds + 1;
        });
      }, 1000);
    } catch (error) {
      resetRecordingResources();
      if (currentState() === "finished") return;
      setNotice(error instanceof DOMException && error.name === "NotAllowedError"
        ? "Разрешите доступ к микрофону в настройках браузера или переключитесь на текст."
        : "Не удалось подключить микрофон — можно продолжить текстом.");
    } finally {
      startingRecordingRef.current = false;
    }
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
      return;
    }
    if (!isTranscribing && !isPaused && !isFinished && !isSending && !isSpeaking) void startRecording();
  }

  function cancelRecording() {
    if (isRecording) stopRecording(true);
  }

  // ---------- turns ----------
  function updateCompletion(next: CompletionState, reason?: CompletionReason) {
    completionStateRef.current = next;
    if (reason) completionReasonRef.current = reason;
    setCompletionState(next);
  }

  function commitReply(pending: NonNullable<typeof pendingReplyRef.current>) {
    if (stateRef.current === "finished") return;
    const { reply, transcript, data, wasClosing } = pending;
    const updated = [...transcript, reply];
    messagesRef.current = updated;
    setMessages(updated);
    dealStatusRef.current = data.dealStatus;
    setDealStatus(data.dealStatus);

    if (wasClosing || data.completionState === "COMPLETED") {
      updateCompletion("COMPLETED", wasClosing ? completionReasonRef.current ?? "LIMIT_REACHED" : data.completionReason);
      stateRef.current = "finished";
      setIsFinished(true);
      persist(updated, new Date().toISOString(), "system");
    } else if (data.completionState === "CLOSING_REQUIRED") {
      updateCompletion("CLOSING_REQUIRED", data.completionReason ?? "LIMIT_REACHED");
      persist(updated);
    } else {
      persist(updated);
    }
    void speak(reply.content);
  }

  async function deliver(message: ChatTurn, wasClosing: boolean, previous: ChatTurn[]) {
    const nextMessages = [...previous, message];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    persist(nextMessages);
    isSendingRef.current = true;
    setIsSending(true);
    setNotice(null);
    const controller = new AbortController();
    chatAbortRef.current = controller;
    try {
      const data = await requestReply(brief.seed, nextMessages, controller.signal, {
        phase: wasClosing ? "CLOSING_REQUIRED" : "ACTIVE",
        clientEventId: message.id,
        timeUp: elapsedRef.current >= durationSec,
      });
      if (controller.signal.aborted) return;
      if (!data.reply?.trim()) throw new ApiError("Сервер вернул пустую реплику", 502);
      failedTurnRef.current = null;
      const reply: ChatTurn = { id: crypto.randomUUID(), role: "assistant", content: data.reply, createdAt: new Date().toISOString(), elapsedSec: Math.round(elapsedRef.current) };
      const pending = { reply, transcript: nextMessages, data, wasClosing };
      if (stateRef.current === "paused") pendingReplyRef.current = pending;
      else commitReply(pending);
    } catch (error) {
      if (controller.signal.aborted) return;
      // The turn is kept aside: «Повторить» resends it with the same id, so no second reply is created.
      messagesRef.current = previous;
      setMessages(previous);
      persist(previous);
      if (wasClosing) updateCompletion("CLOSING_REQUIRED");
      failedTurnRef.current = { message, wasClosing };
      setInput(message.content);
      if (error instanceof ApiError && error.status === 404) setNotice(error.message);
      else setDialog("connection");
    } finally {
      chatAbortRef.current = null;
      isSendingRef.current = false;
      setIsSending(false);
    }
  }

  function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = input.trim();
    const wasClosing = completionStateRef.current === "CLOSING_REQUIRED";
    if (!content || isSendingRef.current || stateRef.current !== "active" || isSpeaking ||
      (completionStateRef.current !== "ACTIVE" && !wasClosing)) return;
    const failed = failedTurnRef.current;
    const message: ChatTurn = failed && failed.message.content === content
      ? failed.message
      : { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString(), elapsedSec: Math.round(elapsedRef.current) };
    if (wasClosing) updateCompletion("CLOSING_REPLY");
    setInput("");
    setHasTranscribedInput(false);
    void deliver(message, wasClosing, messagesRef.current);
  }

  function retryFailed() {
    const failed = failedTurnRef.current;
    setDialog(null);
    if (!failed) return;
    setInput("");
    if (failed.wasClosing) updateCompletion("CLOSING_REPLY");
    void deliver(failed.message, failed.wasClosing, messagesRef.current);
  }

  function continueInText() {
    setDialog(null);
    setInputMode("text");
    window.setTimeout(() => transcriptRef.current?.focus(), 0);
  }

  // ---------- pause & finish ----------
  function pause() {
    if (stateRef.current === "finished") return;
    stateRef.current = "paused";
    setIsPaused(true);
    audioRef.current?.pause();
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") recorder.pause();
    mediaStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = false; });
  }

  function resume() {
    if (stateRef.current === "finished") return;
    stateRef.current = "active";
    setIsPaused(false);
    mediaStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = true; });
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "paused") recorder.resume();
    if (audioRef.current) void audioRef.current.play().catch(() => stopSpeaking());
    const reply = pendingReplyRef.current;
    pendingReplyRef.current = null;
    if (reply) commitReply(reply);
  }

  function openDialog(kind: "pause" | "finish") {
    if (stateRef.current === "finished") return;
    pause();
    setDialog(kind);
  }

  function dismissDialog() {
    if (dialog === "pause" || dialog === "finish") resume();
    setDialog(null);
  }

  function finishSession() {
    if (stateRef.current === "finished") return sessionIdRef.current;
    const endedAt = new Date().toISOString();
    const previousState = completionStateRef.current;
    updateCompletion("COMPLETED", "MANUAL");
    if (!persist(messagesRef.current, endedAt, "manual")) {
      updateCompletion(previousState);
      return null;
    }
    stateRef.current = "finished";
    chatAbortRef.current?.abort();
    transcriptionAbortRef.current?.abort();
    pendingReplyRef.current = null;
    stopRecording(true);
    resetRecordingResources();
    stopSpeaking();
    setIsSending(false);
    setIsTranscribing(false);
    setIsPaused(false);
    setIsFinished(true);
    setDialog(null);
    return sessionIdRef.current;
  }

  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant")?.content ?? brief.openingLine;
  const remaining = Math.max(0, durationSec - elapsed);

  return {
    sessionId: sessionIdRef.current,
    messages,
    replayPrefix,
    input,
    setInput,
    hasTranscribedInput,
    inputMode,
    setInputMode,
    isSending,
    isRecording,
    isTranscribing,
    isSpeaking,
    isPaused,
    isFinished,
    recordingTime: clock(recordingSeconds),
    lastRecordingTime: clock(lastRecordingSeconds),
    remainingTime: clock(remaining),
    timeUp: remaining <= 0,
    elapsedTime: clock(elapsed),
    notice,
    clearNotice: () => setNotice(null),
    completionState,
    dealStatus,
    dialog,
    briefOpen,
    setBriefOpen,
    conversationRef,
    transcriptRef,
    lastAssistant,
    toggleRecording,
    cancelRecording,
    sendMessage,
    retryFailed,
    continueInText,
    openDialog,
    dismissDialog,
    finishSession,
    skipSpeech: stopSpeaking,
  };
}
