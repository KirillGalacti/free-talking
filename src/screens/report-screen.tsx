import { difficultyLower, skillCatalog, skillLabel } from "../../shared/catalog";
import type { SessionAnalysis, StoredSession } from "../../shared/types";
import { Stage } from "@/components/stage";
import { SetupLayout } from "@/components/setup-layout";
import { HandText } from "@/components/hand-text";
import { CtaButton } from "@/components/ui/controls";
import { useSessionReport } from "@/hooks/use-session-report";
import { formatClock, formatDuration } from "@/lib/outcome";
import { currentParams, navigate } from "@/lib/router";
import { cn } from "@/lib/utils";
import { useFlow } from "@/state/flow";

export function ScoreValue({ score, size, naColor = "#8B8484" }: { score: number | null; size: number; naColor?: string }) {
  if (score === null) return <span className="rp-na" style={{ color: naColor }}>N/A</span>;
  return <HandText text={`${score}/4`} size={size} color={score >= 3 ? "#FF6547" : "#F2E5CD"} label={`${score} из 4`} />;
}

export function useRepeatActions(session: StoredSession | null) {
  const { setBrief, update, reset } = useFlow();
  return {
    repeatBySeed() {
      if (!session) return;
      update({ ...session.settings, method: "seed", seed: session.seed });
      setBrief({ ...session.brief, method: "seed" });
      navigate("brief");
    },
    newSession() {
      reset();
      navigate("setup");
    },
  };
}

export function ReportPending({ title, breadcrumb, isAnalyzing, error, retry }: { title: string; breadcrumb: string; isAnalyzing: boolean; error: string | null; retry: () => void }) {
  return (
    <Stage label={title}>
      <SetupLayout title={title} breadcrumb={breadcrumb}>
        <section className="panel rp-pending" role="status">
          {error ? (
            <>
              <h2>Разбор пока не готов</h2>
              <p>{error}</p>
              <CtaButton box={{ left: 60, top: 250, width: 360, height: 60 }} onClick={retry}>Повторить анализ</CtaButton>
            </>
          ) : (
            <>
              <h2>{isAnalyzing ? "Готовим разбор" : "Встреча не найдена"}</h2>
              <p>{isAnalyzing ? "Оценщик проверяет каждую реплику по 12 навыкам и собирает доказательства. Обычно это 10–20 секунд." : "Завершите встречу, чтобы увидеть разбор."}</p>
              {isAnalyzing && <div className="rp-progress"><i /></div>}
              {!isAnalyzing && <CtaButton box={{ left: 60, top: 250, width: 360, height: 60 }} onClick={() => navigate("setup")}>Новая сессия</CtaButton>}
            </>
          )}
        </section>
      </SetupLayout>
    </Stage>
  );
}

function SkillsPanel({ session, analysis }: { session: StoredSession; analysis: SessionAnalysis }) {
  const brief = session.brief;
  return (
    <section className="panel rp-skills">
      <h2 className="card-title">Навыки встречи</h2>
      <p className="rp-skills-meta">
        {brief.counterparty.name} · {brief.counterparty.presetLabel} · {difficultyLower[brief.difficulty]} сложность · {formatDuration(session.elapsedSec)}
      </p>
      <div className="rp-skills-total">
        <HandText text={`${analysis.assessedCount}/12`} size={39} color="#FF6547" label={`${analysis.assessedCount} из 12`} />
        <small>навыков оценено</small>
      </div>
      <ul className="rp-skill-grid">
        {skillCatalog.map((skill) => {
          const value = analysis.skills.find((item) => item.id === skill.id);
          const score = value?.score ?? null;
          return (
            <li key={skill.id} className={cn(score === null && "is-na")} title={value?.summary}>
              <span>{skill.label}</span>
              <ScoreValue score={score} size={21} />
            </li>
          );
        })}
      </ul>
      <p className="rp-skills-note">N/A — в разговоре не было возможности проявить навык. Это не ноль и не снижает общую оценку.</p>
    </section>
  );
}

function OutcomeCard({ analysis }: { analysis: SessionAnalysis }) {
  return (
    <section className={cn("panel rp-outcome", !analysis.dealReached && "is-no-deal")}>
      <p className="rp-outcome-kicker">Исход встречи</p>
      <h2>{analysis.outcomeTitle}</h2>
      <ul>{analysis.outcomeBullets.map((bullet) => <li key={bullet} title={bullet}>{bullet}</li>)}</ul>
      <p className="rp-outcome-note">{analysis.outcomeNote}</p>
    </section>
  );
}

export function ReportScreen() {
  const sessionId = currentParams().get("session");
  const { session, isAnalyzing, error, retry } = useSessionReport(sessionId);
  const actions = useRepeatActions(session);
  const title = "Разбор встречи";
  const breadcrumb = "Главная/Переговоры/Свободная сессия/Разбор";

  if (!session || !session.analysis) {
    return <ReportPending title={title} breadcrumb={breadcrumb} isAnalyzing={isAnalyzing} error={error} retry={retry} />;
  }
  const analysis = session.analysis;
  const keyMoment = analysis.moments.find((moment) => moment.id === analysis.keyMomentId) ?? analysis.moments[0] ?? null;
  const openFull = () => navigate("full-report", { session: session.id });
  const openReplay = (momentId?: string) => navigate("replay", { session: session.id, moment: momentId ?? keyMoment?.id });

  return (
    <Stage label={title}>
      <SetupLayout title={title} breadcrumb={breadcrumb}>
        <SkillsPanel session={session} analysis={analysis} />
        <OutcomeCard analysis={analysis} />

        {analysis.dealReached ? (
          <section className="panel rp-moments">
            <h2 className="card-title">Критические моменты</h2>
            <p className="rp-moments-note">Встречу можно перезапустить с любого из них</p>
            {analysis.moments.length === 0 && <p className="rp-empty">Критических моментов не найдено — разговор шёл ровно. Посмотрите полный разбор.</p>}
            <ol>
              {analysis.moments.map((moment, index) => {
                const score = analysis.skills.find((skill) => skill.id === moment.skill)?.score ?? null;
                return (
                  <li key={moment.id} className={cn(index === 0 && "is-key")}>
                    <span className="rp-time">{formatClock(moment.timeSec)}</span>
                    <strong>{moment.title}</strong>
                    <em>{skillLabel(moment.skill)} · {score === null ? "N/A" : `${score} из 4`}</em>
                    <p>Вы: «{moment.responseQuote}»</p>
                    <small>→ {moment.reactionSummary || moment.effect}</small>
                    <button type="button" onClick={() => openReplay(moment.id)}>Перезапустить отсюда →</button>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : (
          <>
            <section className="panel rp-strong">
              <h2 className="card-title">Сильное решение</h2>
              {analysis.strongDecision ? (
                <>
                  <article className="ticket rp-strong-ticket">
                    <span>{formatClock(analysis.strongDecision.timeSec)} · ваша реплика</span>
                    <div className="perforation" />
                    <p>«{analysis.strongDecision.quote}»</p>
                  </article>
                  <p className="rp-strong-comment">{analysis.strongDecision.comment}</p>
                </>
              ) : (
                <p className="rp-strong-comment" style={{ top: 110 }}>Оценщик не выделил сильной реплики в этой попытке.</p>
              )}
            </section>
            <section className="panel rp-growth">
              <h2 className="card-title">Точка роста</h2>
              <p className="rp-growth-text">{analysis.growthPoint?.text ?? analysis.nextAttempt}</p>
              {analysis.growthPoint && (
                <span className="rp-growth-chip"><i />{skillLabel(analysis.growthPoint.skill)} · {analysis.growthPoint.score === null ? "N/A" : `${analysis.growthPoint.score} из 4`}</span>
              )}
              {keyMoment && <p className="rp-growth-foot">Ключевой момент — {formatClock(keyMoment.timeSec)}, перезапуск доступен</p>}
            </section>
          </>
        )}

        {analysis.dealReached ? (
          <>
            <CtaButton variant="orange-dark" className="rp-btn-accent" box={{ left: 1308, top: 631, width: 522, height: 60 }} onClick={() => openReplay()} disabled={!keyMoment}>
              Перезапустить с момента
            </CtaButton>
            <CtaButton variant="dark" className="rp-btn-dark" box={{ left: 1308, top: 715, width: 522, height: 60 }} onClick={actions.repeatBySeed}>
              Повторить по seed
            </CtaButton>
          </>
        ) : (
          <>
            <CtaButton className="rp-btn-light" box={{ left: 1308, top: 631, width: 522, height: 60 }} onClick={openFull}>Полный разбор</CtaButton>
            <CtaButton variant="dark" className="rp-btn-dark" box={{ left: 1308, top: 715, width: 522, height: 60 }} onClick={() => openReplay()} disabled={!keyMoment}>
              {keyMoment ? `Перезапустить с ${formatClock(keyMoment.timeSec)}` : "Перезапуск недоступен"}
            </CtaButton>
          </>
        )}
        <p className="rp-seed-note">seed {session.seed} · та же скрытая позиция и факты</p>
        <CtaButton
          variant={analysis.dealReached ? "light" : "orange-dark"}
          className={analysis.dealReached ? "rp-btn-light" : "rp-btn-accent"}
          box={{ left: 1308, top: 886.7, width: 522, height: 60 }}
          onClick={actions.newSession}
        >
          Новая сессия
        </CtaButton>
        {analysis.dealReached && (
          <button type="button" className="rp-history-link" onClick={openFull}>Полный разбор и расшифровка — в истории</button>
        )}
      </SetupLayout>
    </Stage>
  );
}
