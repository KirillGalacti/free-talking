import { useState } from "react";
import { difficultyLower, skillCatalog, skillLabel, tacticsLabels } from "../../shared/catalog";
import type { TimelineEvent, TimelineKind } from "../../shared/types";
import { Stage } from "@/components/stage";
import { SetupLayout } from "@/components/setup-layout";
import { HandText } from "@/components/hand-text";
import { ArrowIcon, CheckCircleIcon, QuestionCircleIcon } from "@/components/icons";
import { CtaButton } from "@/components/ui/controls";
import { useSessionReport } from "@/hooks/use-session-report";
import { formatClock } from "@/lib/outcome";
import { currentParams, navigate } from "@/lib/router";
import { cn } from "@/lib/utils";
import { ReportPending, ScoreValue } from "@/screens/report-screen";

const PAGE_HEIGHT = 3170;
type Filter = "all" | "offers" | "concessions" | "revealed";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "offers", label: "Предложения" },
  { id: "concessions", label: "Уступки" },
  { id: "revealed", label: "Раскрытия" },
];

function Marker({ kind }: { kind: TimelineKind }) {
  switch (kind) {
    case "ultimatum": return <svg width="22" height="22" viewBox="0 0 22 22"><rect width="22" height="22" rx="5" fill="#F2E5CD" /></svg>;
    case "question": return <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="11" fill="#CDDFF8" /></svg>;
    case "concession": return <svg width="26" height="26" viewBox="-2 -2 26 26"><circle cx="11" cy="11" r="11" fill="#22201E" stroke="#F2E5CD" strokeWidth="4" /></svg>;
    case "revealed": return <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="11" fill="#FF6547" /></svg>;
    case "missed": return <svg width="26" height="23" viewBox="0 0 26 23"><path d="M13 0L26 23H0L13 0Z" fill="#F2E5CD" /></svg>;
    case "package": return <svg width="28" height="28" viewBox="0 0 28 28"><path d="M14 0L28 14L14 28L0 14Z" fill="#CDDFF8" /></svg>;
    case "no_deal": return <svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#8B8484" /><path d="M8 8L16 16M16 8L8 16" stroke="#22201E" strokeWidth="2.5" strokeLinecap="round" /></svg>;
    default: return <svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#FF6547" /><path d="M7 12.3L10.6 15.5L17.5 8.5" stroke="#22201E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  const count = events.length;
  const start = 310;
  const end = 1727;
  return (
    <div className="fr-timeline-track">
      <i className="fr-timeline-line" />
      {events.map((event, index) => {
        const x = count === 1 ? (start + end) / 2 : start + ((end - start) * index) / (count - 1);
        const above = index % 2 === 0;
        return (
          <div key={`${event.turnId}-${index}`} className={cn("fr-event", above ? "is-above" : "is-below")} style={{ left: x - 208 }}>
            <span className="fr-event-marker"><Marker kind={event.kind} /></span>
            <div className="fr-event-copy">
              <small>{formatClock(event.timeSec)}</small>
              <strong>{event.title}</strong>
              <span>{event.caption}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FullReportScreen() {
  const sessionId = currentParams().get("session");
  const { session, isAnalyzing, error, retry } = useSessionReport(sessionId);
  const [filter, setFilter] = useState<Filter>("all");
  const title = "Полный разбор";
  const breadcrumb = "Главная/Переговоры/Свободная сессия/Полный разбор";

  if (!session || !session.analysis) {
    return <ReportPending title={title} breadcrumb={breadcrumb} isAnalyzing={isAnalyzing} error={error} retry={retry} />;
  }
  const analysis = session.analysis;
  const brief = session.brief;
  const distribution = [4, 3, 2, 1].map((value) => ({ value, count: analysis.skills.filter((skill) => skill.score === value).length }));
  const keyMoment = analysis.moments.find((moment) => moment.id === analysis.keyMomentId) ?? analysis.moments[0] ?? null;
  const events = filter === "all" ? analysis.timeline : analysis.timeline.filter((event) => event.category === filter);
  const replay = (momentId?: string) => navigate("replay", { session: session.id, moment: momentId ?? keyMoment?.id });

  return (
    <Stage height={PAGE_HEIGHT} label={title}>
      <SetupLayout title={title} breadcrumb={breadcrumb}>
        <section className="panel fr-outcome">
          <p className="fr-kicker is-dark">Исход встречи</p>
          <h2 className={cn(!analysis.dealReached && "is-no-deal")}>{analysis.outcomeTitle}</h2>
          <ul>{analysis.outcomeBullets.map((bullet) => <li key={bullet} title={bullet}>{bullet}</li>)}</ul>
        </section>

        <section className="panel fr-score">
          <p className="fr-kicker">Навыки</p>
          <div className="fr-score-total"><HandText text={`${analysis.assessedCount}/12`} size={50.7} color="#CDDFF8" /></div>
          <ul className="fr-distribution">
            {distribution.map(({ value, count }) => (
              <li key={value}>
                <HandText text={String(value)} size={26} color={value >= 3 ? "#FF6547" : "#F2E5CD"} />
                <span>× {count}</span>
              </li>
            ))}
          </ul>
          <p className="fr-score-note">Результат попадёт в подтверждённую карту навыков</p>
        </section>

        <section className="panel fr-session">
          <p className="fr-kicker">Сессия</p>
          <dl>
            <dt>Контрагент</dt><dd>{brief.counterparty.name} · {brief.counterparty.presetLabel}</dd>
            <dt>Сложность</dt><dd>{difficultyLower[brief.difficulty]} · тактики {tacticsLabels[brief.tactics]}</dd>
            <dt>Время</dt><dd>{formatClock(session.elapsedSec)} из {brief.durationMin} минут</dd>
            <dt>seed</dt><dd className="is-seed">{session.seed}</dd>
            <dt>Версии</dt><dd>сценарий {brief.versions.scenario} · профиль {brief.versions.profile} · рубрика {brief.versions.rubric}</dd>
          </dl>
        </section>

        <h2 className="fr-heading" style={{ top: 505 }}>12 навыков</h2>
        <p className="fr-heading-note" style={{ top: 521 }}>Оценка 0–4 по наблюдаемым действиям. N/A — возможности проявить навык не было</p>
        <ol className="fr-skills">
          {skillCatalog.map((skill, index) => {
            const value = analysis.skills.find((item) => item.id === skill.id);
            const score = value?.score ?? null;
            return (
              <li key={skill.id} className={cn(score === null && "is-na")}>
                <strong>{index + 1}. {skill.label}</strong>
                <p>{value?.summary}</p>
                <span className="fr-skill-score">
                  {score === null ? <HandText text="N/A" size={26} color="#8B8484" /> : <HandText text={`${score}/4`} size={26} color={score >= 3 ? "#FF6547" : "#F2E5CD"} />}
                </span>
              </li>
            );
          })}
        </ol>

        <h2 className="fr-heading" style={{ top: 1167 }}>Критические моменты</h2>
        <p className="fr-heading-note" style={{ top: 1192 }}>С любого можно перезапустить встречу — остальное сохранится</p>
        <div className="fr-moments">
          {analysis.moments.length === 0 && <p className="fr-empty">Критических моментов не найдено.</p>}
          {analysis.moments.map((moment, index) => {
            const score = analysis.skills.find((skill) => skill.id === moment.skill)?.score ?? null;
            return (
              <article key={moment.id} className="fr-moment" style={{ left: index * 548.7 }}>
                <h3>Момент {index + 1} · {formatClock(moment.timeSec)}</h3>
                <span className="fr-moment-score">
                  {score === null ? <HandText text="N/A" size={36} color="#8B8484" /> : <><HandText text={String(score)} size={36} color={score >= 3 ? "#FF6547" : "#F2E5CD"} /><small>из 4</small></>}
                </span>
                <p className="fr-moment-label">Позиция · {brief.counterparty.name.split(" ")[0].toLowerCase()}</p>
                <p className="fr-moment-quote">«{moment.positionQuote}»</p>
                <div className="ticket fr-moment-ticket">
                  <span>Ваша реплика</span>
                  <div className="perforation" />
                  <p>«{moment.responseQuote}»</p>
                </div>
                <dl>
                  <dt>Факт</dt><dd>{moment.fact}</dd>
                  <dt>Эффект</dt><dd>{moment.effect}</dd>
                  <dt className="is-accent">Улучшение</dt><dd>{moment.improvement}</dd>
                </dl>
                <p className="sr-only">{skillLabel(moment.skill)}</p>
                <button type="button" className="fr-moment-replay" onClick={() => replay(moment.id)}>
                  <span>Перезапустить отсюда</span>
                  <ArrowIcon width={43} />
                </button>
              </article>
            );
          })}
        </div>

        <h2 className="fr-heading" style={{ top: 1864.5 }}>Предложения и уступки</h2>
        <section className="panel fr-offers">
          <p className="fr-kicker">Предложения</p>
          <ul>
            {analysis.offers.slice(0, 3).map((offer, index) => (
              <li key={`${offer.turnId}-${index}`}>
                <span className="fr-offer-turn">Ход {offer.turnIndex}</span>
                <span className={cn("fr-offer-who", offer.who === "counterparty" && "is-counterparty")}>{offer.who === "user" ? "Вы" : brief.counterparty.name.split(" ")[0]}</span>
                <span className="fr-offer-text">{offer.text}</span>
                <span className={cn("fr-offer-status", offer.accent && "is-accent", /просит|встреч/i.test(offer.status) && "is-light")}>{offer.status}</span>
              </li>
            ))}
            {analysis.offers.length === 0 && <li className="is-empty">Конкретных предложений не прозвучало</li>}
          </ul>
        </section>
        <section className="panel fr-concessions">
          <p className="fr-kicker">Ваши уступки</p>
          <ul>
            {analysis.concessions.slice(0, 2).map((concession, index) => (
              <li key={`${concession.turnId}-${index}`} className={cn(!concession.conditional && "is-unconditional")}>
                <small>{formatClock(concession.timeSec)}</small>
                <strong>{concession.text}</strong>
                <span className={cn(concession.conditional && "is-accent")}>→ {concession.received}</span>
                <em className={cn(concession.conditional && "is-accent")}>{concession.conditional ? "условная" : "безусловная"}</em>
              </li>
            ))}
            {analysis.concessions.length === 0 && <li className="is-empty">Уступок не было</li>}
          </ul>
          <p className="fr-concession-note">{analysis.concessionNote}</p>
        </section>

        <h2 className="fr-heading" style={{ top: 2289.5 }}>Хронология встречи</h2>
        <div className="fr-filters" role="radiogroup" aria-label="Фильтр хронологии">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" role="radio" aria-checked={filter === item.id} className={cn("chip", filter === item.id && "is-on")} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <section className="panel fr-timeline">
          {events.length ? <Timeline events={events} /> : <p className="fr-empty">Нет событий этого типа</p>}
        </section>

        <section className="panel fr-learned">
          <h2 className="card-title">Что вы узнали</h2>
          <ul>
            {analysis.learnedFacts.slice(0, 2).map((fact) => (
              <li key={fact.turnId}>
                <strong><i />{formatClock(fact.timeSec)}</strong>
                <p>{fact.text}</p>
              </li>
            ))}
            {analysis.learnedFacts.length === 0 && <li><p>Скрытые интересы контрагента в этой попытке не раскрылись.</p></li>}
          </ul>
          <p className="fr-learned-note">
            {analysis.hiddenFactsLeft > 0 ? `Ещё ${analysis.hiddenFactsLeft} ${analysis.hiddenFactsLeft === 1 ? "факт остался нераскрытым" : "факта остались нераскрытыми"} — их можно выяснить в повторе` : "Все скрытые факты раскрыты"}
          </p>
        </section>

        <section className="panel fr-bounds">
          <h2 className="card-title">Ваши границы</h2>
          <ul>
            {analysis.boundaries.slice(0, 3).map((bound) => (
              <li key={bound.label}>
                {bound.status === "unknown" ? <QuestionCircleIcon size={34} /> : <CheckCircleIcon size={31} color={bound.status === "kept" ? "#CDDFF8" : "#FF6547"} />}
                <div>
                  <strong>{bound.label}</strong>
                  <span>{bound.detail}</span>
                </div>
              </li>
            ))}
            {analysis.boundaries.length === 0 && <li><div><strong>Границы в брифе не заданы</strong><span>не определено</span></div></li>}
          </ul>
        </section>

        <section className="panel fr-next">
          <p className="fr-next-kicker">Для следующей попытки</p>
          <p className="fr-next-text">{analysis.nextAttempt}</p>
        </section>
        <CtaButton variant="orange-dark" className="rp-btn-accent" box={{ left: 1308, top: 3058, width: 522, height: 60 }} arrowColor="#544C4C" onClick={() => replay()} disabled={!keyMoment}>
          {keyMoment ? `Перезапустить с ${formatClock(keyMoment.timeSec)}` : "Перезапуск недоступен"}
        </CtaButton>
      </SetupLayout>
    </Stage>
  );
}
