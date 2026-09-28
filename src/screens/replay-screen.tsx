import { useState } from "react";
import { skillLabel } from "../../shared/catalog";
import { Stage } from "@/components/stage";
import { SessionHeader } from "@/components/session-header";
import { CtaButton, OutlineButton } from "@/components/ui/controls";
import { useSessionReport } from "@/hooks/use-session-report";
import { formatClock } from "@/lib/outcome";
import { currentParams, navigate } from "@/lib/router";
import { cn } from "@/lib/utils";
import { ReportPending } from "@/screens/report-screen";
import { sessionSubtitle } from "@/screens/brief-screen";

export function ReplayScreen() {
  const params = currentParams();
  const { session, isAnalyzing, error, retry } = useSessionReport(params.get("session"));
  const [selectedId, setSelectedId] = useState<string | null>(params.get("moment"));

  if (!session || !session.analysis) {
    return <ReportPending title="Перезапуск встречи" breadcrumb="Главная/Переговоры/Свободная сессия/Перезапуск" isAnalyzing={isAnalyzing} error={error} retry={retry} />;
  }
  const analysis = session.analysis;
  const moments = analysis.moments;
  const index = Math.max(0, moments.findIndex((moment) => moment.id === selectedId));
  const moment = moments[index] ?? null;
  const counterpartyName = session.brief.counterparty.name;

  return (
    <Stage label="Перезапуск с критического момента">
      <SessionHeader
        subtitle={sessionSubtitle(session.brief)}
        active={4}
        actions={<OutlineButton className="thick" box={{ left: 1642, top: 42, width: 162, height: 60 }} onClick={() => navigate("report", { session: session.id })}>Выйти</OutlineButton>}
      />

      <aside className="panel rs-list">
        <h2>Критические моменты</h2>
        <p>Выберите, откуда продолжить</p>
        <ul role="radiogroup" aria-label="Критические моменты">
          {moments.map((item, itemIndex) => {
            const on = itemIndex === index;
            return (
              <li key={item.id}>
                <button type="button" role="radio" aria-checked={on} className={cn("rs-item", on && "is-on")} onClick={() => setSelectedId(item.id)}>
                  <span className={cn("radio", on && "is-on")} aria-hidden="true" />
                  <span className="rs-time">{formatClock(item.timeSec)}</span>
                  <strong>{item.title}</strong>
                  <small>Вы: «{item.responseQuote}»</small>
                </button>
              </li>
            );
          })}
          {moments.length === 0 && <li className="rs-empty">В этой встрече не нашлось критических моментов для перезапуска.</li>}
        </ul>
      </aside>

      {moment && (
        <>
          <p className="rs-kicker">Критический момент {index + 1} · {skillLabel(moment.skill)}</p>
          <h1 className="rs-title">Перезапуск встречи</h1>
          <article className="ticket rs-ticket">
            <span>{formatClock(moment.timeSec)} · {counterpartyName.toLowerCase()}</span>
            <div className="perforation" />
            <p className="rs-quote">«{moment.positionQuote}»</p>
            <p className="rs-answer">Вы ответили: «{moment.responseQuote}»</p>
          </article>
          <section className="rs-try">
            <h2>Что попробовать</h2>
            <p>{moment.improvement}</p>
          </section>
          <ul className="rs-points">
            <li>Встреча продолжится с {formatClock(moment.timeSec)} — разговор до этой точки сохранится.</li>
            <li>Контрагент, скрытая позиция и факты те же · seed {session.seed}.</li>
            <li>На таймере останется {formatClock(moment.replayRemainingSec)}. Исходная попытка останется в истории.</li>
          </ul>
          <section className="rs-compare">
            <h2>Сравним после перезапуска</h2>
            <small>было в первой попытке</small>
            <dl>
              <div><dt>Ваша реплика</dt><dd>«{moment.responseQuote}»</dd></div>
              <div><dt>Реакция контрагента</dt><dd>{moment.reactionSummary || moment.effect}</dd></div>
              <div><dt>Итог встречи</dt><dd>{analysis.outcomeBullets[0] ?? analysis.outcomeTitle}</dd></div>
            </dl>
          </section>
          <CtaButton variant="orange-dark" className="rp-btn-accent" box={{ left: 740, top: 963, width: 460, height: 60 }} arrowColor="#544C4C" onClick={() => navigate("meeting", { replay: session.id, moment: moment.id })}>
            Перезапустить отсюда
          </CtaButton>
          <CtaButton variant="dark" className="rp-btn-dark" box={{ left: 1224, top: 963, width: 300, height: 60 }} onClick={() => navigate("report", { session: session.id })}>
            К разбору
          </CtaButton>
        </>
      )}
    </Stage>
  );
}
