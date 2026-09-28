import { useMemo, useState } from "react";
import { difficultyLower } from "../../shared/catalog";
import { presetBrief } from "../../shared/preset-scenario";
import type { PublicBrief } from "../../shared/types";
import { Stage } from "@/components/stage";
import { SetupLayout } from "@/components/setup-layout";
import { CheckCircleIcon } from "@/components/icons";
import { CtaButton, OutlineButton } from "@/components/ui/controls";
import { formatDay, outcomeChip, skillsSummary } from "@/lib/outcome";
import { goBack, navigate } from "@/lib/router";
import { useSetupSteps } from "@/lib/use-setup-steps";
import { cn } from "@/lib/utils";
import { loadScenarioBySeed } from "@/services/api";
import { recentFinishedSessions } from "@/services/session-store";
import { useFlow } from "@/state/flow";

interface Entry {
  key: string;
  seed: string;
  date: string;
  title: string;
  chip: string;
  kicker: string;
  outcome: string;
  details: string;
  skills: string;
  brief: PublicBrief;
}

function buildEntries(): Entry[] {
  const sessions = recentFinishedSessions().slice(0, 4).map((session): Entry => ({
    key: session.id,
    seed: session.seed,
    date: formatDay(session.startedAt),
    title: `${session.brief.counterparty.presetLabel} · ${difficultyLower[session.brief.difficulty]}`,
    chip: outcomeChip(session),
    kicker: `Прошлая попытка · ${formatDay(session.startedAt)}`,
    outcome: session.analysis?.outcomeTitle ?? (session.dealStatus === "agreed" ? "Сделка заключена" : "Без сделки"),
    details: session.analysis?.outcomeBullets.slice(0, 2).join(" · ") ?? "Разбор этой попытки ещё не готов",
    skills: skillsSummary(session),
    brief: session.brief,
  }));
  if (sessions.length) return sessions;
  return [{
    key: "preset",
    seed: presetBrief.seed,
    date: formatDay(new Date().toISOString()),
    title: `${presetBrief.counterparty.presetLabel} · ${difficultyLower[presetBrief.difficulty]}`,
    chip: "Готовый сценарий",
    kicker: "Готовый сценарий · проверен заранее",
    outcome: presetBrief.title,
    details: "Ещё не проходили — повтор начнёт ту же встречу с нуля",
    skills: "Завершённые сессии появятся здесь на 30 дней",
    brief: presetBrief,
  }];
}

export function SeedScreen() {
  const { setBrief, update } = useFlow();
  const steps = useSetupSteps("seed");
  const entries = useMemo(buildEntries, []);
  const [selected, setSelected] = useState(entries[0]?.key ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entry = entries.find((item) => item.key === selected) ?? entries[0];

  async function repeat() {
    if (!entry) return;
    setBusy(true);
    setError(null);
    try {
      const { brief } = await loadScenarioBySeed(entry.seed);
      setBrief({ ...brief, method: "seed" });
      update({ seed: entry.seed });
      navigate("brief");
    } catch (cause) {
      // The frozen card is gone from the server: fall back to the public brief saved with the session.
      if (entry.key === "preset") setError(cause instanceof Error ? cause.message : "Не удалось загрузить сессию");
      else {
        setBrief({ ...entry.brief, method: "seed" });
        navigate("brief");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stage label="Повтор по seed: выбор сессии">
      <SetupLayout
        breadcrumb="Главная/Переговоры/Новая сессия"
        steps={steps}
        note="Повтор восстанавливает те же факты, скрытую позицию и стартовое состояние."
        noteWidth={300}
      >
        <section className="panel sd-card is-focus">
          <h2 className="card-title">Прошлые сессии</h2>
          <p className="card-sub" style={{ top: 74.2 }}>Свободные переговоры · последние 30 дней</p>
          <ul className="sd-list" role="radiogroup" aria-label="Прошлые сессии">
            {entries.map((item) => {
              const on = item.key === entry?.key;
              return (
                <li key={item.key}>
                  <button type="button" role="radio" aria-checked={on} className={cn("sd-item", on && "is-on")} onClick={() => setSelected(item.key)}>
                    <span className={cn("radio", on && "is-on")} aria-hidden="true" />
                    <span className="sd-date">{item.date}</span>
                    <span className="sd-title">{item.title}</span>
                    <span className="sd-seed-label">seed</span>
                    <span className="sd-seed">{item.seed}</span>
                    <span className="sd-chip">{item.chip}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel sd-repeat">
          <h2 className="card-title">Что повторится</h2>
          <ul>
            {["те же факты и скрытая позиция контрагента", "те же диапазоны и правила уступок", "то же стартовое состояние разговора", "та же сложность и способ ввода"].map((text) => (
              <li key={text}><CheckCircleIcon size={26} /><span>{text}</span></li>
            ))}
          </ul>
          <p className="sd-muted">Реплики контрагента могут звучать иначе — смысл и условия останутся теми же.</p>
          <p className="sd-strong">Изменить настройки нельзя: любое изменение — это новая сессия с новым seed.</p>
        </section>

        {entry && (
          <section className="panel sd-last">
            <p className="sd-last-kicker">{entry.kicker}</p>
            <h2>{entry.outcome}</h2>
            <p className="sd-last-details">{entry.details}</p>
            <p className="sd-last-skills">{entry.skills}</p>
            <p className="sd-last-note">{error ?? "После повтора разбор покажет обе попытки рядом"}</p>
          </section>
        )}

        <OutlineButton box={{ left: 1239, top: 964, width: 170, height: 58 }} onClick={() => goBack("setup")}>Назад</OutlineButton>
        <CtaButton box={{ left: 1434, top: 963, width: 396, height: 60 }} onClick={repeat} disabled={busy || !entry}>
          {busy ? "Загружаем…" : "Повторить сессию"}
        </CtaButton>
      </SetupLayout>
    </Stage>
  );
}
