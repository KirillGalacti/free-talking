import {
  counterpartyRoles, dealParamOptions, durations, industries, levelLabels, levelOrder, presetById, profileLabels,
  relationshipLong, styleTitles, tacticsLabels,
} from "../../shared/catalog";
import type { BehaviorProfile, InputMode, Level, RelationshipId, StyleId, TacticsId } from "../../shared/types";
import { Stage } from "@/components/stage";
import { SetupLayout } from "@/components/setup-layout";
import { Chip, CtaButton, OutlineButton, Segmented } from "@/components/ui/controls";
import { SelectField } from "@/components/ui/select-field";
import { navigate } from "@/lib/router";
import { useSetupSteps } from "@/lib/use-setup-steps";
import { useFlow } from "@/state/flow";

const profileKeys = Object.keys(profileLabels) as (keyof BehaviorProfile)[];
const levelOptions = levelOrder.map((value) => ({ value, label: levelLabels[value] }));
const tacticsOptions = (Object.keys(tacticsLabels) as TacticsId[]).map((value) => ({ value, label: tacticsLabels[value] }));
const inputOptions: { value: InputMode; label: string }[] = [{ value: "voice", label: "Голос" }, { value: "text", label: "Текст" }];

function withCurrent(list: string[], current: string) {
  return (list.includes(current) ? list : [current, ...list]).map((value) => ({ value, label: value }));
}

export function DetailsScreen() {
  const { settings, update, applyPreset } = useFlow();
  const preset = presetById(settings.presetId);
  const steps = useSetupSteps("details");
  const changed = settings.changedProfileKeys.length
    + (settings.style !== preset.style ? 1 : 0)
    + (settings.tactics !== preset.tactics ? 1 : 0);

  function setLevel(key: keyof BehaviorProfile, value: Level) {
    const keys = new Set(settings.changedProfileKeys);
    if (value === preset.profile[key]) keys.delete(key);
    else keys.add(key);
    update({ profile: { ...settings.profile, [key]: value }, changedProfileKeys: [...keys] });
  }

  function toggleParam(param: string) {
    const has = settings.dealParams.includes(param);
    if (has && settings.dealParams.length === 1) return;
    update({ dealParams: has ? settings.dealParams.filter((item) => item !== param) : dealParamOptions.filter((item) => item === param || settings.dealParams.includes(item)) });
  }

  return (
    <Stage label="Новая сессия: подробные настройки">
      <SetupLayout
        breadcrumb="Главная/Переговоры/Новая сессия/Подробнее"
        steps={steps}
        note="Подробные настройки необязательны: пустые поля заполнит пресет."
        noteWidth={285}
      >
        <section className="panel dt-behavior">
          <h2 className="card-title">Поведение</h2>
          <p className="card-sub" style={{ top: 74.3 }}>Значения пресета «{preset.label}» · изменено: {changed}</p>
          <div className="chip-wrap" style={{ left: 36, top: 118, width: 470, rowGap: 12 }} role="radiogroup" aria-label="Стиль">
            {(Object.keys(styleTitles) as StyleId[]).map((style) => (
              <Chip key={style} on={settings.style === style} onClick={() => update({ style })}>{styleTitles[style]}</Chip>
            ))}
          </div>
          {profileKeys.map((key, index) => (
            <div className="dt-level-row" key={key} style={{ top: 252 + index * 62 }}>
              <span className="cp-level-label">
                {profileLabels[key]}
                {settings.changedProfileKeys.includes(key) && <em className="dt-changed">изменено</em>}
              </span>
              <Segmented className="dt-level" label={profileLabels[key]} options={levelOptions} value={settings.profile[key]} onChange={(value) => setLevel(key, value)} />
            </div>
          ))}
          <p className="card-label dt-tactics-label">Тактики</p>
          <Segmented className="dt-tactics" label="Тактики" options={tacticsOptions} value={settings.tactics} onChange={(tactics) => update({ tactics })} />
          <p className="card-help dt-tactics-help">Сложность и тактики — разные настройки: высокая сложность не делает контрагента грубее.</p>
        </section>

        <section className="panel dt-context">
          <h2 className="card-title">Контекст</h2>
          <p className="card-label dt-label" style={{ left: 36, top: 81 }}>Отрасль</p>
          <SelectField label="Отрасль" style={{ left: 36, top: 110, width: 214.5 }} value={settings.industry} options={withCurrent(industries, settings.industry)} onChange={(industry) => update({ industry })} />
          <p className="card-label dt-label" style={{ left: 271, top: 81 }}>Роль контрагента</p>
          <SelectField label="Роль контрагента" style={{ left: 270.5, top: 110, width: 294.5 }} value={settings.counterpartyRole} options={withCurrent(counterpartyRoles, settings.counterpartyRole)} onChange={(counterpartyRole) => update({ counterpartyRole })} />
          <p className="card-label dt-label" style={{ left: 36, top: 179 }}>Отношения сторон</p>
          <SelectField
            label="Отношения сторон"
            style={{ left: 36, top: 208, width: 254.5 }}
            value={settings.relationship}
            options={(Object.keys(relationshipLong) as RelationshipId[]).map((value) => ({ value, label: relationshipLong[value] }))}
            onChange={(relationship) => update({ relationship })}
          />
          <p className="card-label dt-label" style={{ left: 310, top: 179 }}>Длительность</p>
          <SelectField label="Длительность" style={{ left: 310.5, top: 208, width: 254.5 }} value={settings.durationMin} options={durations.map((value) => ({ value, label: `${value} минут` }))} onChange={(durationMin) => update({ durationMin })} />
          <p className="card-label dt-label" style={{ left: 37, top: 277 }}>Известный контекст</p>
          <textarea
            className="field dt-known"
            value={settings.knownContext}
            onChange={(event) => update({ knownContext: event.target.value })}
            aria-label="Известный контекст"
            placeholder="Что знают обе стороны"
            maxLength={400}
          />
          <p className="card-help" style={{ left: 36, top: 412.4 }}>Только публичные сведения — без реальных имён и персональных данных</p>
        </section>

        <section className="panel dt-deal">
          <h2 className="card-title dt-deal-title">Параметры сделки</h2>
          <div className="chip-wrap dt-params" role="group" aria-label="Параметры сделки">
            {dealParamOptions.map((param) => (
              <Chip key={param} on={settings.dealParams.includes(param)} onClick={() => toggleParam(param)}>{param}</Chip>
            ))}
          </div>
          <div className="dt-input-row">
            <span className="cp-level-label">Способ ввода</span>
            <Segmented className="dt-input" label="Способ ввода" options={inputOptions} value={settings.inputMode} onChange={(inputMode) => update({ inputMode })} />
          </div>
          <p className="card-help" style={{ left: 36, top: 222 }}>Ваша BATNA и красные линии — на экране проверки</p>
        </section>

        <p className="setup-actions-note dt-note">Изменение видимой настройки пересобирает скрытую позицию контрагента до старта.</p>
        <OutlineButton box={{ left: 1224, top: 965, width: 321, height: 56 }} fontSize={22} onClick={() => applyPreset(preset.id)}>Сбросить к пресету</OutlineButton>
        <CtaButton box={{ left: 1571, top: 963, width: 259, height: 60 }} onClick={() => navigate("counterparty")}>Готово</CtaButton>
      </SetupLayout>
    </Stage>
  );
}
