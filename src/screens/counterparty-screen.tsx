import { difficultyDescriptions, difficultyLabels, levelLabels, levelOrder, presets, profileLabels, styleLabels } from "../../shared/catalog";
import type { BehaviorProfile, Difficulty, Level } from "../../shared/types";
import { Stage } from "@/components/stage";
import { SetupLayout } from "@/components/setup-layout";
import { WarningIcon } from "@/components/icons";
import { CtaButton, OptionRow, OutlineButton, Segmented } from "@/components/ui/controls";
import { AssemblyFlow, useAssembly } from "@/components/assembly-flow";
import { goBack, navigate } from "@/lib/router";
import { useFlow } from "@/state/flow";
import { useSetupSteps } from "@/lib/use-setup-steps";

const profileKeys = Object.keys(profileLabels) as (keyof BehaviorProfile)[];
const levelOptions = levelOrder.map((value) => ({ value, label: levelLabels[value] }));
const difficultyOptions = (Object.keys(difficultyLabels) as Difficulty[]).map((value) => ({ value, label: difficultyLabels[value] }));

export function CounterpartyScreen() {
  const { settings, update, applyPreset } = useFlow();
  const preset = presets.find((item) => item.id === settings.presetId) ?? presets[0];
  const steps = useSetupSteps("counterparty");
  const assembly = useAssembly();

  function setLevel(key: keyof BehaviorProfile, value: Level) {
    const changed = new Set(settings.changedProfileKeys);
    if (value === preset.profile[key]) changed.delete(key);
    else changed.add(key);
    update({ profile: { ...settings.profile, [key]: value }, changedProfileKeys: [...changed] });
  }

  return (
    <Stage label="Новая сессия: контрагент и сложность">
      <SetupLayout
        breadcrumb="Главная/Переговоры/Новая сессия"
        steps={steps}
        note="Скрытую позицию контрагента система создаст сама и заморозит на время встречи."
        noteWidth={280}
      >
        <section className="panel cp-card">
          <h2 className="card-title">Контрагент</h2>
          <p className="card-sub" style={{ top: 73.5 }}>Готовый профиль поведения и роль по умолчанию</p>
          <ul className="option-list cp-presets" role="radiogroup" aria-label="Профиль контрагента" style={{ top: 116 }}>
            {presets.map((item) => (
              <OptionRow key={item.id} on={item.id === preset.id} title={item.label} hint={item.hint} onClick={() => applyPreset(item.id)} />
            ))}
          </ul>
          <article className="ticket cp-ticket" aria-label={`Профиль «${preset.label}»`}>
            <h3>{preset.label}</h3>
            <span className="cp-ticket-style">{styleLabels[settings.style]} стиль</span>
            <div className="perforation cp-ticket-perf" />
            <p className="cp-ticket-role">Типичная роль: {preset.typicalRole}</p>
            <p className="cp-ticket-topics">Совместим с темами: {preset.compatible}</p>
            <ul className="cp-ticket-tags">
              {preset.tags.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
            <div className="cp-ticket-warning">
              <WarningIcon />
              <p>{preset.warning}</p>
            </div>
          </article>
        </section>

        <section className="panel cp-visible">
          <h2 className="card-title">Видимые настройки</h2>
          <p className="card-sub" style={{ top: 73.5, width: 530 }}>
            Скрытые интересы, BATNA и красные линии контрагента здесь не показываются
          </p>
          {profileKeys.map((key, index) => (
            <div className="cp-level-row" key={key} style={{ top: 134 + index * 62 }}>
              <span className="cp-level-label">{profileLabels[key]}</span>
              <Segmented
                className="cp-level"
                label={profileLabels[key]}
                options={levelOptions}
                value={settings.profile[key]}
                onChange={(value) => setLevel(key, value)}
              />
            </div>
          ))}
        </section>

        <section className="panel cp-difficulty is-focus">
          <h2 className="card-title">Сложность</h2>
          <Segmented
            className="cp-difficulty-control"
            label="Сложность"
            options={difficultyOptions}
            value={settings.difficulty}
            onChange={(difficulty) => update({ difficulty })}
          />
          <p className="card-help cp-difficulty-copy">{difficultyDescriptions[settings.difficulty]}</p>
        </section>

        <OutlineButton box={{ left: 605, top: 965, width: 350, height: 56 }} fontSize={22} onClick={() => navigate("details")}>
          Настроить подробнее
        </OutlineButton>
        <OutlineButton box={{ left: 1237, top: 965, width: 168, height: 56 }} onClick={() => goBack("setup")}>Назад</OutlineButton>
        <CtaButton box={{ left: 1430, top: 963, width: 400, height: 60 }} onClick={() => assembly.start(settings)}>
          Проверить и начать
        </CtaButton>
      </SetupLayout>
      <AssemblyFlow assembly={assembly} />
    </Stage>
  );
}
