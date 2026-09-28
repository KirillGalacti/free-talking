import { useRef, useState } from "react";
import { roles, topics } from "../../shared/catalog";
import type { CreationMethod, TopicId } from "../../shared/types";
import { Stage } from "@/components/stage";
import { SetupLayout, type StepItem } from "@/components/setup-layout";
import { Chip, CtaButton, OptionRow, OutlineButton } from "@/components/ui/controls";
import { goBack, navigate } from "@/lib/router";
import { cn } from "@/lib/utils";
import { useFlow } from "@/state/flow";
import { methodSubtitle, roleText, topicText } from "@/lib/setup-labels";

type CardId = "method" | "topic" | "role" | "goal";

const methods: { id: CreationMethod; title: string; hint: string }[] = [
  { id: "preset", title: "Готовый пресет", hint: "быстрый старт и сравнимые повторы" },
  { id: "exact", title: "Точная настройка", hint: "своя ситуация: публичный контекст и профиль" },
  { id: "random", title: "Согласованный рандом", hint: "закрепите нужное — остальное соберёт система" },
  { id: "seed", title: "Повтор по seed", hint: "те же настройки и та же скрытая позиция" },
];

const cta: Record<CreationMethod, { label: string; screen: "counterparty" | "exact" | "random" | "seed" }> = {
  preset: { label: "К контрагенту", screen: "counterparty" },
  exact: { label: "К своей ситуации", screen: "exact" },
  random: { label: "Настроить рандом", screen: "random" },
  seed: { label: "Выбрать сессию", screen: "seed" },
};

const notes: Record<CreationMethod | "none", string> = {
  none: "Шесть шагов обязательны. Остальное заполнит пресет — можно уточнить в подробных настройках.",
  preset: "Шесть шагов обязательны. Остальное заполнит пресет — можно уточнить в подробных настройках.",
  random: "Шесть шагов обязательны. Остальное заполнит пресет — можно уточнить в подробных настройках.",
  exact: "Точная настройка: вы задаёте публичный контекст и видимый профиль.",
  seed: "Повтор загружает замороженную карточку прошлой сессии.",
};

export function SetupMethodScreen() {
  const { settings, update } = useFlow();
  const [focus, setFocus] = useState<CardId | null>(null);
  const topicInputRef = useRef<HTMLInputElement | null>(null);
  const roleInputRef = useRef<HTMLInputElement | null>(null);
  const goalRef = useRef<HTMLTextAreaElement | null>(null);

  const method = settings.method;
  const isSeed = method === "seed";
  const filled: Record<CardId, boolean> = {
    method: Boolean(method),
    topic: Boolean(settings.topic && (settings.topic !== "custom" || settings.topicCustom.trim())),
    role: Boolean(settings.role && settings.roleDetails.trim()),
    goal: settings.goal.trim().length > 3,
  };
  const order: CardId[] = ["method", "topic", "role", "goal"];
  const firstMissing = order.find((card) => !filled[card]) ?? null;
  const current: CardId | null = isSeed ? "method" : focus ?? firstMissing ?? "goal";
  const glowing = method && !isSeed ? current : null;

  const stepState = (card: CardId): StepItem["state"] => {
    if (card === current && method) return "current";
    if (!method) return card === "method" ? "current" : "open";
    return "done";
  };
  const sub = (card: CardId, value: string) => (isSeed ? undefined : card === current && method ? "сейчас" : filled[card] && method ? value : undefined);

  const steps: StepItem[] = [
    { label: "Способ", sub: method ? (current === "method" ? "сейчас" : methodSubtitle[method]) : "сейчас", state: method ? stepState("method") : "current" },
    { label: "Тематика", sub: sub("topic", topicText(settings).toLowerCase()), state: isSeed ? "open" : stepState("topic") },
    { label: "Ваша роль", sub: sub("role", roleText(settings).toLowerCase()), state: isSeed ? "open" : stepState("role") },
    { label: "Цель", sub: sub("goal", "ваша цель"), state: isSeed ? "open" : stepState("goal") },
    { label: "Контрагент", state: "later" },
    { label: "Сложность", state: "later" },
  ];

  function chooseMethod(id: CreationMethod) {
    update({ method: id });
    setFocus(null);
  }

  function next() {
    if (!method) return;
    if (!isSeed && firstMissing) {
      setFocus(firstMissing);
      if (firstMissing === "goal") goalRef.current?.focus();
      if (firstMissing === "role") roleInputRef.current?.focus();
      return;
    }
    navigate(cta[method].screen);
  }

  function chooseTopic(id: TopicId) {
    update({ topic: id });
    setFocus("topic");
    if (id === "custom") window.setTimeout(() => topicInputRef.current?.focus(), 0);
  }

  return (
    <Stage label="Новая сессия: способ, тематика, роль и цель">
      <SetupLayout
        breadcrumb="Главная/Переговоры/Новая сессия"
        steps={steps}
        stepsTitleAccent={Boolean(method)}
        note={notes[method ?? "none"]}
      >
        <section className="panel method-card" onFocusCapture={() => setFocus("method")}>
          <h2 className="card-title">Способ создания</h2>
          <ul className="option-list" role="radiogroup" aria-label="Способ создания" style={{ top: 90 }}>
            {methods.map((item) => (
              <OptionRow key={item.id} on={method === item.id} title={item.title} hint={item.hint} onClick={() => chooseMethod(item.id)} />
            ))}
          </ul>
        </section>

        <section
          className={cn("panel role-card", glowing === "role" && "is-focus", isSeed && "is-dimmed")}
          onFocusCapture={() => setFocus("role")}
          onPointerDown={() => setFocus("role")}
        >
          <h2 className="card-title" style={{ left: 36, top: 28.9 }}>Ваша роль</h2>
          <div className="chip-wrap" style={{ left: 36, top: 90, width: 540, rowGap: 12 }} role="radiogroup" aria-label="Ваша роль">
            {roles.map((role) => (
              <Chip key={role.id} on={settings.role === role.id} onClick={() => update({ role: role.id })}>{role.label}</Chip>
            ))}
            <Chip custom on={settings.role === "custom"} onClick={() => { update({ role: "custom" }); roleInputRef.current?.focus(); }}>Ввести</Chip>
          </div>
          <p className="card-label" style={{ left: 37, top: 245 }}>Кто вы и что можете решать</p>
          <input
            ref={roleInputRef}
            className="field field-input"
            style={{ left: 36, top: 274 }}
            value={settings.roleDetails}
            onChange={(event) => update({ roleDetails: event.target.value })}
            placeholder="Например: поставщик упаковки · цена в пределах 5%"
            aria-label="Кто вы и что можете решать"
            maxLength={120}
          />
          <p className="card-help" style={{ left: 37, top: 354.8 }}>Роль и полномочия видит и контрагент</p>
          {isSeed && <span className="from-seed" style={{ left: 166, top: 180 }}>возьмётся из выбранной сессии</span>}
        </section>

        <section
          className={cn("panel topic-card", glowing === "topic" && "is-focus", isSeed && "is-dimmed")}
          onFocusCapture={() => setFocus("topic")}
          onPointerDown={() => setFocus("topic")}
        >
          <h2 className="card-title" style={{ left: 36, top: 29.4 }}>Тематика</h2>
          <div className="chip-wrap" style={{ left: 36.5, top: 99.3, width: 450, rowGap: 12.3 }} role="radiogroup" aria-label="Тематика">
            {topics.map((topic) => (
              <Chip key={topic.id} on={settings.topic === topic.id} onClick={() => chooseTopic(topic.id)}>{topic.label}</Chip>
            ))}
            {settings.topic === "custom" ? (
              <input
                ref={topicInputRef}
                className="chip chip-input is-on"
                value={settings.topicCustom}
                onChange={(event) => update({ topicCustom: event.target.value })}
                placeholder="Своя тема"
                aria-label="Своя тема"
                maxLength={40}
              />
            ) : (
              <Chip custom onClick={() => chooseTopic("custom")}>Своя тема</Chip>
            )}
          </div>
          <p className="card-help" style={{ left: 36, top: 293.1 }}>Тема задаёт словарь, факты и типичные условия сделки</p>
          {isSeed && <span className="from-seed" style={{ left: 158, top: 152 }}>возьмётся из выбранной сессии</span>}
        </section>

        <section
          className={cn("panel goal-card", glowing === "goal" && "is-focus", isSeed && "is-dimmed")}
          onFocusCapture={() => setFocus("goal")}
          onPointerDown={() => setFocus("goal")}
        >
          <h2 className="card-title" style={{ left: 35.8, top: 29 }}>Цель встречи</h2>
          <textarea
            ref={goalRef}
            className="field field-area"
            style={{ left: 36, top: 104, paddingRight: 150 }}
            value={settings.goal}
            onChange={(event) => update({ goal: event.target.value })}
            placeholder="Опишите желаемый результат встречи"
            aria-label="Цель встречи"
            maxLength={220}
          />
          <p className="card-help" style={{ left: 37, top: 250.2, width: 540, lineHeight: "22px" }}>
            Опишите результат своими словами. «Правильную» формулировку система не подсказывает.
          </p>
          {isSeed && <span className="from-seed" style={{ left: 166, top: 152 }}>возьмётся из выбранной сессии</span>}
        </section>

        {method === "seed" && <p className="setup-actions-note">Шаг 2 · дальше — выбор сессии</p>}
        {method === "exact" && <p className="setup-actions-note">Шаг 2 из 6</p>}

        <OutlineButton box={method === "exact" ? { left: 1261, top: 965, width: 168, height: 56 } : { left: 1277, top: 965, width: 168, height: 56 }} onClick={() => goBack("setup")}>
          Назад
        </OutlineButton>
        <CtaButton
          box={method === "exact" ? { left: 1455, top: 963, width: 375, height: 60 } : { left: 1470, top: 963, width: 360, height: 60 }}
          onClick={next}
          disabled={!method}
          className={cn(!method && "is-idle")}
        >
          {method ? cta[method].label : "Выберите способ"}
        </CtaButton>
      </SetupLayout>
    </Stage>
  );
}
