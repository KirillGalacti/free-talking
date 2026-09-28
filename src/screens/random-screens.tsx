import { difficultyLabels, relationshipLabels, styleLabels, tacticsTitles } from "../../shared/catalog";
import type { PublicBrief, RandomLockKey } from "../../shared/types";
import { Stage } from "@/components/stage";
import { SetupLayout } from "@/components/setup-layout";
import { AssemblyFlow, useAssembly } from "@/components/assembly-flow";
import { HandText } from "@/components/hand-text";
import { ArrowIcon, CheckCircleIcon, DiceIcon, LockIcon } from "@/components/icons";
import { CtaButton, OutlineButton, Toggle } from "@/components/ui/controls";
import { Redirect, goBack, navigate } from "@/lib/router";
import { roleText, shortGoal, topicText } from "@/lib/setup-labels";
import { useSetupSteps } from "@/lib/use-setup-steps";
import { cn } from "@/lib/utils";
import { useFlow } from "@/state/flow";

const lockOrder: { key: RandomLockKey; label: string }[] = [
  { key: "topic", label: "Тематика" },
  { key: "role", label: "Ваша роль" },
  { key: "goal", label: "Цель" },
  { key: "difficulty", label: "Сложность" },
  { key: "tactics", label: "Тактики" },
  { key: "industry", label: "Отрасль" },
  { key: "counterpartyRole", label: "Роль контрагента" },
  { key: "style", label: "Стиль" },
  { key: "relationship", label: "Отношения" },
  { key: "conditions", label: "Условия сделки" },
];

export function RandomLockScreen() {
  const { settings, update } = useFlow();
  const steps = useSetupSteps("random");
  const assembly = useAssembly(() => navigate("random-result"));
  const locked = lockOrder.filter((item) => settings.locks[item.key]).length;

  const values: Record<RandomLockKey, string> = {
    topic: topicText(settings),
    role: roleText(settings),
    goal: shortGoal(settings.goal),
    difficulty: difficultyLabels[settings.difficulty],
    tactics: tacticsTitles[settings.tactics],
    industry: settings.industry,
    counterpartyRole: settings.counterpartyRole,
    style: styleLabels[settings.style][0].toUpperCase() + styleLabels[settings.style].slice(1),
    relationship: relationshipLabels[settings.relationship],
    conditions: settings.dealParams.join(", ").toLowerCase(),
  };

  function toggle(key: RandomLockKey, value: boolean) {
    update({ locks: { ...settings.locks, [key]: value } });
  }

  return (
    <Stage label="Согласованный рандом: что закрепить">
      <SetupLayout
        breadcrumb="Главная/Переговоры/Новая сессия"
        steps={steps}
        note="Закреплённое останется как есть. Остальное система подберёт совместимо."
        noteWidth={300}
      >
        <section className="panel rl-card is-focus">
          <h2 className="card-title">Что закрепить</h2>
          <p className="rl-count">Закреплено {locked} из 10</p>
          <ul className="rl-list">
            {lockOrder.map((item) => {
              const on = settings.locks[item.key];
              return (
                <li key={item.key} className={cn(on && "is-on")}>
                  <span className="rl-label">{item.label}</span>
                  {on ? (
                    <>
                      <span className="rl-value">{values[item.key]}</span>
                      <LockIcon className="rl-icon" color="#F2E5CD" />
                    </>
                  ) : (
                    <span className="rl-auto"><DiceIcon color="#CDDFF8" />соберёт система</span>
                  )}
                  <Toggle on={on} onChange={(value) => toggle(item.key, value)} label={`Закрепить: ${item.label}`} />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel rl-how">
          <h2 className="card-title">Как это работает</h2>
          {[
            ["Скрытая позиция", "цель, интересы, BATNA и границы контрагента"],
            ["Совместимый профиль", "стиль и поведение под эту позицию"],
            ["Публичный бриф", "роль, ситуация и факты — без противоречий"],
          ].map(([title, sub], index) => (
            <div className="rl-step" key={title} style={{ top: 101 + index * 112 }}>
              <span className="rl-step-num" style={{ left: index === 0 ? 36.4 : 36 }}><HandText text={String(index + 1)} size={44.8} color="#CDDFF8" /></span>
              <strong>{title}</strong>
              <small>{sub}</small>
              {index < 2 && <i className="rl-step-line" />}
            </div>
          ))}
          <p className="rl-how-note">
            Закреплённое не меняется. Если сочетание невозможно, система предложит, что открепить, — и не соберёт противоречивую ситуацию.
          </p>
        </section>

        <section className="panel rl-seed">
          <h2>Каждая сборка — свой seed</h2>
          <p>Понравилась ситуация — её можно повторить с теми же фактами и скрытой позицией через «Повтор по seed».</p>
          <span className="rl-seed-hint"><DiceIcon color="#22201E" size={26} />Пересобрать можно только незакреплённое</span>
        </section>

        <OutlineButton box={{ left: 1233.2, top: 964, width: 170, height: 58 }} onClick={() => goBack("setup")}>Назад</OutlineButton>
        <CtaButton box={{ left: 1427.2, top: 963, width: 402.8, height: 60 }} onClick={() => assembly.start({ ...settings, seed: null })}>
          Собрать ситуацию
        </CtaButton>
      </SetupLayout>
      <AssemblyFlow assembly={assembly} />
    </Stage>
  );
}

function GeneratedRow({ label, value, locked, top }: { label: string; value: string; locked: boolean; top: number }) {
  return (
    <div className={cn("rr-row", locked && "is-locked")} style={{ top }}>
      {locked ? <LockIcon className="rr-icon" color="#F2E5CD" /> : <DiceIcon className="rr-icon" color="#FF6547" size={24} />}
      <span className="rr-label">{label}</span>
      <span className="rr-value">{value}</span>
    </div>
  );
}

export function RandomResultScreen() {
  const { settings, brief } = useFlow();
  const steps = useSetupSteps("random-result");
  const assembly = useAssembly(() => undefined);

  if (!brief) return <Redirect to="random" />;
  const current: PublicBrief = brief;
  const rows: { label: string; value: string; locked: boolean }[] = [
    { label: "Отрасль", value: current.generated.industry, locked: settings.locks.industry },
    { label: "Контрагент", value: current.generated.counterparty, locked: settings.locks.counterpartyRole },
    { label: "Стиль", value: current.generated.style, locked: settings.locks.style },
    { label: "Отношения", value: current.generated.relationship, locked: settings.locks.relationship },
    { label: "Условия", value: current.generated.conditions, locked: settings.locks.conditions },
    { label: "Тактики", value: tacticsTitles[current.tactics], locked: settings.locks.tactics },
    { label: "Сложность", value: difficultyLabels[current.difficulty], locked: settings.locks.difficulty },
  ];

  return (
    <Stage label="Согласованный рандом: ситуация собрана">
      <SetupLayout
        breadcrumb="Главная/Переговоры/Новая сессия"
        steps={steps}
        note="Незакреплённое можно пересобрать — каждый раз с новым seed."
        noteWidth={285}
      >
        <section className="panel rr-card">
          <p className="rr-kicker">Ситуация собрана</p>
          <h2 className="rr-title">{current.situationTitle}</h2>
          <p className="rr-summary">{current.summary}</p>
          {rows.map((row, index) => <GeneratedRow key={row.label} {...row} top={334 + index * 58} />)}
        </section>

        <section className="panel rr-checks">
          <h2 className="card-title">Проверено</h2>
          <ul>
            {current.checks.slice(0, 5).map((check) => (
              <li key={check}><CheckCircleIcon size={28} /><span>{check}</span></li>
            ))}
          </ul>
          <p className="rr-checks-more">Ещё {Math.max(0, 11 - Math.min(5, current.checks.length))} проверок — внутри, без раскрытия скрытой позиции</p>
        </section>

        <section className="panel rr-seed">
          <p className="rr-seed-kicker">Seed</p>
          <p className="rr-seed-value">{current.seed}</p>
          <p className="rr-seed-copy">Новая сборка создаст новый seed. Эту ситуацию можно будет повторить из истории.</p>
          <button type="button" className="pill rr-rebuild" onClick={() => assembly.start({ ...settings, seed: null })}>
            <span>Пересобрать незакреплённое</span>
            <ArrowIcon color="#FF6547" />
          </button>
        </section>

        <OutlineButton box={{ left: 1214, top: 964, width: 170, height: 58 }} onClick={() => navigate("random")}>Назад</OutlineButton>
        <CtaButton box={{ left: 1408, top: 963, width: 422, height: 60 }} onClick={() => navigate("brief")}>К проверке и старту</CtaButton>
      </SetupLayout>
      <AssemblyFlow assembly={assembly} />
    </Stage>
  );
}
