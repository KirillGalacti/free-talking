import { useEffect, useState } from "react";
import { difficultyLower, tacticsLabels } from "../../shared/catalog";
import type { PublicBrief, StoredSession } from "../../shared/types";
import { Stage } from "@/components/stage";
import { SessionHeader } from "@/components/session-header";
import { HandText } from "@/components/hand-text";
import { ChevronIcon, CloseIcon, LockIcon } from "@/components/icons";
import { CtaButton, OutlineButton } from "@/components/ui/controls";
import { useMeeting } from "@/hooks/use-meeting";
import { formatClock, pluralRu } from "@/lib/outcome";
import { Redirect, currentParams, navigate } from "@/lib/router";
import { cn } from "@/lib/utils";
import { loadScenarioBySeed } from "@/services/api";
import { getSession } from "@/services/session-store";
import { useFlow } from "@/state/flow";
import { sessionSubtitle } from "@/screens/brief-screen";

const WAVE = [13.5, 27, 35.6, 22, 39.2, 30.7, 17.2, 27, 32, 18, 12, 14, 26, 35, 21, 30, 38, 16, 22, 34, 12, 28, 15, 36, 19, 26, 33, 14, 24, 37, 18, 29, 21, 32, 15, 25];

function firstName(brief: PublicBrief) {
  return brief.counterparty.name.split(" ")[0];
}

/** Loads the frozen scenario for the meeting (from the flow state, a replay or the server by seed). */
export function MeetingScreen() {
  const { brief: flowBrief, settings, setBrief } = useFlow();
  const params = currentParams();
  const seed = params.get("seed");
  const replaySessionId = params.get("replay");
  const momentId = params.get("moment");
  const parent = replaySessionId ? getSession(replaySessionId) : null;
  const moment = parent?.analysis?.moments.find((item) => item.id === momentId) ?? null;
  const initialBrief = parent?.brief ?? (flowBrief && (!seed || flowBrief.seed === seed) ? flowBrief : null);
  const [brief, setLocalBrief] = useState<PublicBrief | null>(initialBrief);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (brief || !seed) return;
    loadScenarioBySeed(seed)
      .then(({ brief: loaded }) => { setLocalBrief(loaded); setBrief(loaded); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Сценарий не найден"));
  }, [brief, seed, setBrief]);

  if (!brief && !seed) return <Redirect to="setup" />;
  if (!brief) {
    return (
      <Stage label="Встреча">
        <p className="meeting-loading">{error ?? "Загружаем сценарий встречи…"}</p>
      </Stage>
    );
  }
  return (
    <MeetingView
      brief={brief}
      settings={parent?.settings ?? settings}
      replay={parent && moment ? { parent, momentId: moment.id, positionTurnId: moment.positionTurnId } : null}
      replayTime={moment ? moment.timeSec : null}
    />
  );
}

function MeetingView({ brief, settings, replay, replayTime }: {
  brief: PublicBrief;
  settings: ReturnType<typeof useFlow>["settings"];
  replay: { parent: StoredSession; momentId: string; positionTurnId: string } | null;
  replayTime: number | null;
}) {
  const demo = import.meta.env.DEV ? currentParams().get("demo") : null;
  const meeting = useMeeting({ brief, settings, replay, demo });
  const name = firstName(brief);
  const summarized = brief.counterparty.gender === "m" ? "подвёл итог" : "подвела итог";
  const closing = meeting.completionState === "CLOSING_REQUIRED";
  const waitingClosing = meeting.completionState === "CLOSING_REPLY";
  const listening = !meeting.isFinished && (meeting.isSending || meeting.isSpeaking || waitingClosing);
  const reviewing = meeting.inputMode === "text" && meeting.hasTranscribedInput && Boolean(meeting.input.trim());

  function openReport() {
    const id = meeting.finishSession();
    if (id) navigate("report", { session: id });
  }

  let status = "Ваш ход";
  if (meeting.isFinished) status = "Встреча завершена";
  else if (meeting.dialog === "connection") status = "Нет связи";
  else if (meeting.isPaused) status = "Пауза";
  else if (meeting.isRecording) status = `Идёт запись · ${meeting.recordingTime}`;
  else if (meeting.isTranscribing) status = "Распознаём речь";
  else if (meeting.isSpeaking) status = `${name} говорит`;
  else if (meeting.isSending || waitingClosing) status = `${name} думает`;
  else if (reviewing) status = `Запись готова · ${meeting.lastRecordingTime}`;
  else if (closing) status = "Подведите итог";
  else if (meeting.inputMode === "text") status = "Ваш ход · текст";

  const composerChip = meeting.isFinished
    ? "Встреча завершена"
    : reviewing
      ? "Распознано — проверьте текст"
      : listening
        ? meeting.isSpeaking ? `${name} говорит` : `${name} думает`
        : null;

  const prefixCount = meeting.replayPrefix.length;
  const visibleMessages = replay ? meeting.messages.slice(Math.max(0, prefixCount - 1)) : meeting.messages;

  return (
    <Stage label="Встреча с AI-контрагентом">
      <SessionHeader
        subtitle={sessionSubtitle(brief)}
        active={3}
        actions={(
          <>
            <OutlineButton className={cn("thick", meeting.dialog === "pause" && "is-pressed")} box={{ left: 1441, top: 42, width: 127, height: 60 }} onClick={() => meeting.openDialog("pause")} disabled={meeting.isFinished}>
              Пауза
            </OutlineButton>
            <OutlineButton className="thick" box={{ left: 1584, top: 42, width: 220, height: 60 }} onClick={() => meeting.openDialog("finish")} disabled={meeting.isFinished}>
              Завершить
            </OutlineButton>
          </>
        )}
      />

      <aside className="mt-conversation">
        <h2>Разговор</h2>
        <p>Полный текст каждой реплики</p>
        <div className="mt-list" ref={meeting.conversationRef} aria-live="polite">
          {replay && prefixCount > 1 && (
            <>
              <article className="mt-bubble is-summary">
                <small>00:00–{formatClock(meeting.replayPrefix[prefixCount - 2]?.elapsedSec ?? 0)} · {prefixCount - 1} {pluralRu(prefixCount - 1, ["реплика", "реплики", "реплик"])}</small>
                <p>разговор до точки перезапуска сохранён</p>
              </article>
              <span className="mt-replay-chip">Перезапуск с {formatClock(replayTime ?? 0)} · попытка {replay.parent.attempt + 1}</span>
            </>
          )}
          {visibleMessages.map((message) => (
            <article key={message.id} className={cn("mt-bubble", message.role === "user" ? "is-user" : "is-counterparty")}>
              <strong>{replay ? `${formatClock(message.elapsedSec ?? 0)} · ` : ""}{message.role === "assistant" ? brief.counterparty.name : "Вы"}</strong>
              <p>{message.content}</p>
            </article>
          ))}
        </div>
      </aside>

      <span className="mt-cp-chip">
        <img src="/assets/person.svg" alt="" width="31" height="31" />
        {brief.counterparty.name} · AI-контрагент
      </span>
      <span className="mt-status"><i className={cn(meeting.isFinished && "is-muted")} />{status}</span>
      <img className="mt-avatar" src="/assets/avatar.svg" alt="" width="376" height="380" draggable={false} />

      <article className="mt-reply" aria-live="polite">
        <strong>{brief.counterparty.name}</strong>
        <p>{meeting.lastAssistant}</p>
      </article>

      <div className={cn("mt-mode", meeting.inputMode === "text" && "is-text", (listening || meeting.isFinished) && "is-muted")} role="radiogroup" aria-label="Способ ввода">
        <button type="button" role="radio" aria-checked={meeting.inputMode === "voice"} onClick={() => meeting.setInputMode("voice")} disabled={meeting.isFinished || meeting.isRecording}>Голос</button>
        <button type="button" role="radio" aria-checked={meeting.inputMode === "text"} onClick={() => meeting.setInputMode("text")} disabled={meeting.isFinished || meeting.isRecording}>Текст</button>
      </div>
      {meeting.inputMode === "text" && !reviewing && !listening && !meeting.isFinished && (
        <p className="mt-keys">Enter — отправить · Shift + Enter — новая строка</p>
      )}
      {composerChip && <span className="mt-chip"><i className={cn(meeting.isFinished && "is-light")} />{composerChip}</span>}

      <div className="mt-composer">
        {meeting.isFinished ? (
          <>
            <img className="mt-mic is-off" src="/assets/mic-off.svg" alt="" width="88" height="88" />
            <div className="mt-prompt">
              <strong>Встреча завершена</strong>
              <p>{name} {summarized}.<br />Посмотрите, что получилось.</p>
            </div>
            <CtaButton className="mt-to-report" variant="orange" box={{ left: 424, top: 22, width: 373, height: 60 }} fontSize={26} weight={700} onClick={openReport}>
              Перейти к разбору
            </CtaButton>
          </>
        ) : listening ? (
          <>
            <img className="mt-mic is-off" src="/assets/mic-off.svg" alt="" width="88" height="88" />
            <div className="mt-prompt">
              <strong>Слушайте</strong>
              <p>{meeting.isSpeaking ? <>Ввод откроется, когда {name}<br />закончит реплику</> : <>{name} формулирует ответ —<br />ввод откроется после реплики</>}</p>
            </div>
            {meeting.isSpeaking && <button type="button" className="mt-skip" onClick={meeting.skipSpeech}>Пропустить озвучку</button>}
          </>
        ) : meeting.inputMode === "voice" ? (
          <>
            <button
              type="button"
              className={cn("mt-mic-button", meeting.isRecording && "is-recording")}
              onClick={meeting.toggleRecording}
              disabled={meeting.isTranscribing || meeting.isPaused}
              aria-label={meeting.isRecording ? "Остановить запись и распознать" : "Начать запись"}
              aria-pressed={meeting.isRecording}
            >
              <img src="/assets/mic.svg" alt="" width="88" height="88" />
            </button>
            {meeting.isRecording ? (
              <>
                <span className="mt-rec-time"><i />{meeting.recordingTime}</span>
                <div className="mt-wave" aria-hidden="true">
                  {WAVE.map((height, index) => (
                    <i key={index} className={cn(index % 4 === 3 && "is-accent")} style={{ height, animationDelay: `${index * 45}ms` }} />
                  ))}
                </div>
                <button type="button" className="mt-cancel" onClick={meeting.cancelRecording} aria-label="Отменить запись" title="Отменить запись">
                  <CloseIcon />
                </button>
              </>
            ) : (
              <div className="mt-prompt">
                <strong>{meeting.isTranscribing ? "Распознаём речь" : closing ? "Подведите итог" : "Ваш ход"}</strong>
                <p>
                  {meeting.isTranscribing
                    ? <>Текст появится в поле ввода —<br />его можно будет исправить</>
                    : closing
                      ? <>Скажите, что фиксируете,<br />и предложите следующий шаг</>
                      : <>Нажмите на микрофон и говорите<br />или переключитесь на текст</>}
                </p>
              </div>
            )}
          </>
        ) : (
          <form className="mt-text" onSubmit={meeting.sendMessage}>
            <textarea
              ref={meeting.transcriptRef}
              value={meeting.input}
              onChange={(event) => meeting.setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={closing ? "Подведите итог и предложите следующий шаг..." : "Напишите ответ..."}
              aria-label="Ваша реплика"
              disabled={meeting.isPaused}
              rows={2}
              maxLength={1500}
            />
            {reviewing && <small className="mt-review-help">Распознанный текст можно исправить до отправки</small>}
            <button type="submit" className="mt-send" disabled={!meeting.input.trim() || meeting.isPaused} aria-label={closing ? "Подвести итог" : "Отправить"} title={closing ? "Подвести итог" : "Отправить"}>
              <img src="/assets/send.svg" alt="" width="64" height="64" />
            </button>
          </form>
        )}
      </div>

      {meeting.notice && (
        <div className="mt-notice" role="status">
          <span>{meeting.notice}</span>
          <button type="button" onClick={meeting.clearNotice} aria-label="Закрыть">×</button>
        </div>
      )}

      {meeting.briefOpen ? (
        <section className="mt-brief is-open" aria-label="Бриф и факты">
          <button type="button" className="mt-brief-toggle" onClick={() => meeting.setBriefOpen(false)} aria-expanded="true">
            <span>Бриф и факты</span>
            <ChevronIcon up color="#CDDFF8" />
          </button>
          <div className="mt-brief-body" tabIndex={0}>
            <h3>Роль</h3>
            <p>{brief.participantRole}</p>
            <h3>Ситуация</h3>
            <p>{brief.situation}</p>
            <h3>Ваша задача</h3>
            <p>{brief.task}</p>
            <h3>Известные факты</h3>
            <ul>{brief.facts.map((fact) => <li key={fact}>{fact.replace(/\.$/, "")}</li>)}</ul>
            {(brief.boundaries.batna || brief.boundaries.redLine) && (
              <>
                <h3>Ваши границы</h3>
                <p>{[brief.boundaries.batna && `BATNA: ${brief.boundaries.batna}`, brief.boundaries.redLine && `Красная линия: ${brief.boundaries.redLine}`].filter(Boolean).map((part) => String(part).replace(/[.;s]+$/, "")).join(". ")}.</p>
              </>
            )}
          </div>
          <p className="mt-brief-foot">Факты видны всё время встречи.<br />Интересы контрагента здесь не показываются.</p>
        </section>
      ) : (
        <>
          <button type="button" className="mt-brief" onClick={() => meeting.setBriefOpen(true)} aria-expanded="false">
            <span>Бриф и факты</span>
            <ChevronIcon color="#E8F1FC" />
          </button>
          <section className="mt-task">
            <h2>Ваша задача</h2>
            <p>{brief.task}</p>
          </section>
          <section className="mt-session">
            <h2>Сессия</h2>
            <LockIcon className="mt-lock" />
            <div className="mt-timer" aria-label={`Осталось ${meeting.remainingTime}`}>
              <HandText text={meeting.remainingTime} size={44.8} color="#F2E5CD" />
            </div>
            <p className="mt-timer-label">
              {meeting.isPaused ? "на паузе · время стоит" : meeting.timeUp ? "время вышло · закончите текущий ход" : `осталось из ${brief.durationMin} минут`}
            </p>
            <dl>
              <dt>Контрагент</dt><dd>{brief.counterparty.presetLabel}</dd>
              <dt>Сложность</dt><dd>{difficultyLower[brief.difficulty]}</dd>
              <dt>Тактики</dt><dd>{tacticsLabels[brief.tactics]}</dd>
              <dt>Подсказки</dt><dd>нет</dd>
            </dl>
            <div className="seed-box mt-seed"><span>seed</span><strong>{brief.seed}</strong></div>
            <p className="mt-session-note">
              {replay
                ? `Перезапуск с ${formatClock(replayTime ?? 0)}: настройки, скрытая позиция и seed те же. Исходная попытка — в истории.`
                : "Настройки заморожены до конца встречи. Оценок во время разговора нет — разбор после."}
            </p>
          </section>
        </>
      )}

      {meeting.dialog && (
        <div className="modal-layer" role="presentation" onClick={(event) => { if (event.target === event.currentTarget && meeting.dialog !== "connection") meeting.dismissDialog(); }}>
          {meeting.dialog === "connection" && (
            <section className="modal mt-modal" role="alertdialog" aria-modal="true" aria-labelledby="mt-modal-title">
              <h2 id="mt-modal-title">Связь прервалась</h2>
              <p>Ваша реплика сохранена, попытка не потеряна. Можно повторить отправку или продолжить текстом.</p>
              <OutlineButton className="thin" weight={400} box={{ left: 53.7, top: 292, width: 320.4, height: 60 }} onClick={meeting.continueInText}>Перейти в текст</OutlineButton>
              <CtaButton box={{ left: 401.8, top: 292, width: 302.2, height: 60 }} onClick={meeting.retryFailed}>Повторить</CtaButton>
            </section>
          )}
          {meeting.dialog === "pause" && (
            <section className="modal mt-modal" role="dialog" aria-modal="true" aria-labelledby="mt-modal-title">
              <h2 id="mt-modal-title">Разговор на паузе</h2>
              <p>Контрагент не продолжает реплику, пока вы не вернётесь.<br />Последняя реплика сохранена, таймер встречи остановлен.</p>
              <OutlineButton className="thin" weight={400} box={{ left: 53.7, top: 292, width: 320.4, height: 60 }} onClick={openReport}>Завершить попытку</OutlineButton>
              <CtaButton box={{ left: 401.8, top: 292, width: 302.2, height: 60 }} onClick={meeting.dismissDialog}>Продолжить</CtaButton>
            </section>
          )}
          {meeting.dialog === "finish" && (
            <section className="modal mt-modal is-finish" role="dialog" aria-modal="true" aria-labelledby="mt-modal-title">
              <h2 id="mt-modal-title">Завершить встречу?</h2>
              <p>Вы перейдёте к разбору. Навыки, для которых не было возможности, получат N/A, а не ноль.</p>
              <OutlineButton className="thin" weight={400} box={{ left: 54, top: 252, width: 220.9, height: 60 }} onClick={openReport}>Завершить</OutlineButton>
              <CtaButton box={{ left: 302.9, top: 252, width: 433, height: 60 }} onClick={meeting.dismissDialog}>Продолжить разговор</CtaButton>
            </section>
          )}
        </div>
      )}
    </Stage>
  );
}
