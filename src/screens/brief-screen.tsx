import { difficultyGenitive, difficultyLower, tacticsLabels } from "../../shared/catalog";
import type { PublicBrief } from "../../shared/types";
import { Stage } from "@/components/stage";
import { SessionHeader } from "@/components/session-header";
import { AssemblyFlow, useAssembly } from "@/components/assembly-flow";
import { LockIcon } from "@/components/icons";
import { CtaButton, OutlineButton } from "@/components/ui/controls";
import { Redirect, navigate } from "@/lib/router";
import { useFlow } from "@/state/flow";

export function sessionSubtitle(brief: PublicBrief) {
  return `${brief.topicLabel} · ${brief.counterparty.presetLabel} · ${difficultyGenitive[brief.difficulty]}`;
}

/** Highlights money amounts in the participant's limits, as in the mockup («не ниже **1 150 ₽**»). */
function Limits({ text }: { text: string }) {
  const parts = text.split(/(\d[\d\s]*[\d]\s?₽|\d+\s?₽)/g);
  return <>{parts.map((part, index) => (/₽/.test(part) ? <b key={index}>{part}</b> : part))}</>;
}

export function BriefScreen() {
  const { brief, settings } = useFlow();
  const assembly = useAssembly();
  if (!brief) return <Redirect to="setup" />;

  const trim = (value: string) => value.trim().replace(/[.;s]+$/, "");
  const limits = [
    brief.boundaries.batna ? `BATNA: ${trim(brief.boundaries.batna)}.` : "BATNA: не задана — её можно сформулировать в разговоре.",
    brief.boundaries.redLine ? `Красная линия: ${trim(brief.boundaries.redLine)}.` : "",
  ].filter(Boolean).join(" ");
  const canRebuild = brief.method !== "seed";

  return (
    <Stage label="Проверка перед стартом">
      <SessionHeader
        subtitle={sessionSubtitle(brief)}
        active={2}
        trackOffset={-5}
        actions={<OutlineButton className="thick" box={{ left: 1642, top: 42, width: 162, height: 60 }} onClick={() => navigate("setup")}>Выйти</OutlineButton>}
      />

      <section className="panel bf-main">
        <p className="bf-kicker">Бриф встречи</p>
        <h2 className="bf-title">{brief.title}</h2>
        <div className="bf-section" style={{ top: 166 }}>
          <h3>Роль</h3>
          <p>{brief.participantRole}</p>
        </div>
        <div className="bf-section" style={{ top: 280 }}>
          <h3>Ситуация</h3>
          <p>{brief.situation}</p>
        </div>
        <div className="bf-task">
          <h3>Ваша задача</h3>
          <p>{brief.task}</p>
        </div>
        <div className="bf-limits">
          <h3>Ваши границы · видите только вы</h3>
          <p><Limits text={limits} /></p>
        </div>
        <p className="bf-foot">Интересы, BATNA и красные линии контрагента скрыты — их предстоит выяснить в разговоре.</p>
      </section>

      <span className="cp-chip" style={{ left: 1040, top: 208 }}>
        {brief.counterparty.name} · {brief.counterparty.role} · AI-контрагент
      </span>

      <section className="bf-facts">
        <h2>Известные факты</h2>
        <ul>{brief.facts.slice(0, 4).map((fact) => <li key={fact}>{fact.replace(/\.$/, "")}</li>)}</ul>
        <small>Факты будут под рукой всю встречу — в панели «Бриф и факты».</small>
      </section>

      <section className="bf-session">
        <h2>Сессия</h2>
        <LockIcon className="lock" color="#CDDFF8" />
        <dl>
          <dt>Контрагент</dt><dd>{brief.counterparty.presetLabel} · {brief.counterparty.styleLabel} стиль</dd>
          <dt>Сложность</dt><dd>{difficultyLower[brief.difficulty]} · тактики {tacticsLabels[brief.tactics]}</dd>
          <dt>Время и ввод</dt><dd>{brief.durationMin} минут · {brief.inputMode === "voice" ? "голос, можно текстом" : "текст, можно голосом"}</dd>
          <dt>Подсказки</dt><dd>нет — свободный режим</dd>
          <dt>Оценка</dt><dd>после встречи · 12 навыков, N/A — не ноль</dd>
        </dl>
        <div className="seed-box bf-seed">
          <span>seed</span>
          <strong>{brief.seed}</strong>
          {canRebuild && (
            <button type="button" onClick={() => assembly.start({ ...settings, method: brief.method === "seed" ? "preset" : brief.method, seed: null })}>
              Пересобрать ситуацию
            </button>
          )}
        </div>
        <p className="bf-session-note">После старта настройки заморозятся — изменить их можно только новой сессией.</p>
      </section>

      <OutlineButton className="thin" weight={400} box={{ left: 1040, top: 963, width: 340, height: 60 }} onClick={() => navigate(settings.method === "seed" ? "seed" : "setup")}>
        Изменить
      </OutlineButton>
      <CtaButton className="start" box={{ left: 1404, top: 963, width: 396, height: 60 }} arrowColor="#544C4C" onClick={() => navigate("meeting", { seed: brief.seed })}>
        Начать встречу
      </CtaButton>
      <AssemblyFlow assembly={assembly} />
    </Stage>
  );
}
