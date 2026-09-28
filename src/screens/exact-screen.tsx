import { Fragment } from "react";
import { counterpartyRoles, difficultyLabels, levelLabels, levelOrder, relationshipLabels, styleLabels, tacticsLabels } from "../../shared/catalog";
import type { DealCondition, Difficulty, Level, RelationshipId, StyleId, TacticsId } from "../../shared/types";
import { Stage } from "@/components/stage";
import { SetupLayout } from "@/components/setup-layout";
import { AssemblyFlow, useAssembly } from "@/components/assembly-flow";
import { CtaButton, OutlineButton, Segmented } from "@/components/ui/controls";
import { SelectField } from "@/components/ui/select-field";
import { anonymise, findRealNames } from "@/lib/real-names";
import { goBack } from "@/lib/router";
import { useSetupSteps } from "@/lib/use-setup-steps";
import { useFlow } from "@/state/flow";

const levelOptions = levelOrder.map((value) => ({ value, label: levelLabels[value] }));
const styleOptions = (Object.keys(styleLabels) as StyleId[]).map((value) => ({ value, label: styleLabels[value] }));
const tacticsOptions = (Object.keys(tacticsLabels) as TacticsId[]).map((value) => ({ value, label: tacticsLabels[value] }));
const difficultyOptions = (Object.keys(difficultyLabels) as Difficulty[]).map((value) => ({ value, label: difficultyLabels[value] }));
const MAX_CONDITIONS = 4;

function Highlighted({ text }: { text: string }) {
  const matches = findRealNames(text);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    parts.push(<Fragment key={`t${index}`}>{text.slice(cursor, match.start)}</Fragment>);
    parts.push(<mark key={`m${index}`}>{match.text}</mark>);
    cursor = match.end;
  });
  parts.push(<Fragment key="tail">{text.slice(cursor)}{"\n"}</Fragment>);
  return <>{parts}</>;
}

export function ExactScreen() {
  const { settings, update } = useFlow();
  const steps = useSetupSteps("exact");
  const assembly = useAssembly();
  const names = findRealNames(settings.situation);

  function setCondition(id: string, patch: Partial<DealCondition>) {
    update({ conditions: settings.conditions.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
  }

  function addCondition() {
    if (settings.conditions.length >= MAX_CONDITIONS) return;
    update({ conditions: [...settings.conditions, { id: crypto.randomUUID(), label: "", current: "", limit: "" }] });
  }

  function removeCondition(id: string) {
    update({ conditions: settings.conditions.filter((item) => item.id !== id) });
  }

  function setLevel(key: "toughness" | "openness", value: Level) {
    update({ profile: { ...settings.profile, [key]: value } });
  }

  const ready = settings.situation.trim().length > 20 && settings.conditions.some((item) => item.label.trim());

  return (
    <Stage label="Точная настройка: своя ситуация">
      <SetupLayout
        breadcrumb="Главная/Переговоры/Новая сессия"
        steps={steps}
        note="Скрытую позицию под ваши условия создаст система и не покажет до разбора."
        noteWidth={300}
      >
        <section className="panel ex-situation is-focus">
          <h2 className="card-title">Своя ситуация</h2>
          <p className="card-sub" style={{ top: 74.3 }}>Только публичные сведения — то, что знают обе стороны</p>
          <div className="ex-editor">
            <div className="ex-backdrop" aria-hidden="true"><Highlighted text={settings.situation} /></div>
            <textarea
              value={settings.situation}
              onChange={(event) => update({ situation: event.target.value })}
              aria-label="Своя ситуация"
              placeholder="Опишите ситуацию: кто вы, с кем встречаетесь и что известно обеим сторонам"
              maxLength={600}
              spellCheck={false}
            />
          </div>
          <div className="ex-names" role="status">
            {names.length ? (
              <>
                <span>Похоже на реальное название</span>
                <button type="button" onClick={() => update({ situation: anonymise(settings.situation) })}>Заменить на «Клиент»</button>
              </>
            ) : (
              <span className="is-clean">Реальных имён и названий не найдено</span>
            )}
          </div>
          <h3 className="ex-subtitle">Условия сделки</h3>
          <p className="card-help" style={{ left: 36, top: 400.5 }}>Что обсуждаете и где ваша граница</p>
          <ul className="ex-conditions">
            {settings.conditions.map((item) => (
              <li key={item.id}>
                <input className="ex-cond-label" value={item.label} onChange={(event) => setCondition(item.id, { label: event.target.value })} placeholder="Условие" aria-label="Условие" maxLength={28} />
                <input className="ex-cond-current" value={item.current} onChange={(event) => setCondition(item.id, { current: event.target.value })} placeholder="сейчас" aria-label="Текущее значение" maxLength={24} />
                <label className="ex-cond-limit">
                  <input
                    value={item.limit}
                    onChange={(event) => setCondition(item.id, { limit: event.target.value })}
                    placeholder="граница"
                    aria-label="Ваша граница"
                    maxLength={24}
                  />
                </label>
                <button type="button" className="ex-cond-remove" onClick={() => removeCondition(item.id)} aria-label="Удалить условие" title="Удалить условие">×</button>
              </li>
            ))}
          </ul>
          {settings.conditions.length < MAX_CONDITIONS && (
            <button type="button" className="ex-add" onClick={addCondition}>+ добавить условие</button>
          )}
        </section>

        <section className="panel ex-counterparty">
          <h2 className="card-title">Контрагент</h2>
          <p className="card-label dt-label" style={{ left: 37, top: 81 }}>Роль</p>
          <SelectField
            label="Роль контрагента"
            style={{ left: 36, top: 110, width: 294.5 }}
            value={settings.counterpartyRole}
            options={(counterpartyRoles.includes(settings.counterpartyRole) ? counterpartyRoles : [settings.counterpartyRole, ...counterpartyRoles]).map((value) => ({ value, label: value }))}
            onChange={(counterpartyRole) => update({ counterpartyRole })}
          />
          <p className="card-label dt-label" style={{ left: 351, top: 81 }}>Отношения</p>
          <SelectField
            label="Отношения"
            style={{ left: 350.5, top: 110, width: 214.5 }}
            value={settings.relationship}
            options={(Object.keys(relationshipLabels) as RelationshipId[]).map((value) => ({ value, label: relationshipLabels[value] }))}
            onChange={(relationship) => update({ relationship })}
          />
          <p className="card-label dt-label" style={{ left: 37, top: 190.7 }}>Стиль</p>
          <Segmented className="ex-style" label="Стиль" options={styleOptions} value={settings.style} onChange={(style) => update({ style })} />
          <div className="ex-row" style={{ top: 290 }}>
            <span className="cp-level-label">Жёсткость</span>
            <Segmented className="ex-level" label="Жёсткость" options={levelOptions} value={settings.profile.toughness} onChange={(value) => setLevel("toughness", value)} />
          </div>
          <div className="ex-row" style={{ top: 348 }}>
            <span className="cp-level-label">Открытость</span>
            <Segmented className="ex-level" label="Открытость" options={levelOptions} value={settings.profile.openness} onChange={(value) => setLevel("openness", value)} />
          </div>
          <div className="ex-row" style={{ top: 406 }}>
            <span className="cp-level-label">Тактики</span>
            <Segmented className="ex-level" label="Тактики" options={tacticsOptions} value={settings.tactics} onChange={(tactics) => update({ tactics })} />
          </div>
          <p className="ex-rest">Остальное — средние значения. Подробнее — в «Настроить подробнее».</p>
        </section>

        <section className="panel ex-difficulty">
          <h2 className="card-title dt-deal-title">Сложность</h2>
          <Segmented className="ex-difficulty-control cp-difficulty-control" label="Сложность" options={difficultyOptions} value={settings.difficulty} onChange={(difficulty) => update({ difficulty })} />
          <p className="card-help ex-difficulty-copy">
            Скрытые интересы, BATNA и красные линии контрагента система создаст под ваши условия, проверит на противоречия и не покажет до разбора.
          </p>
        </section>

        <OutlineButton box={{ left: 1233.2, top: 964, width: 170, height: 58 }} onClick={() => goBack("setup")}>Назад</OutlineButton>
        <CtaButton box={{ left: 1427.2, top: 963, width: 402.8, height: 60 }} onClick={() => assembly.start(settings)} disabled={!ready}>
          Собрать ситуацию
        </CtaButton>
      </SetupLayout>
      <AssemblyFlow assembly={assembly} />
    </Stage>
  );
}
