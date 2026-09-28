import { useEffect, useRef, useState } from "react";
import { difficultyLower, presetById } from "../../shared/catalog";
import type { PublicBrief, SessionSettings } from "../../shared/types";
import { CheckCircleIcon } from "@/components/icons";
import { CtaButton, OutlineButton } from "@/components/ui/controls";
import { navigate } from "@/lib/router";
import { cn } from "@/lib/utils";
import { assembleScenario, loadPresetScenario } from "@/services/api";
import { useFlow } from "@/state/flow";

const ITEMS = [
  "Роль и полномочия",
  "Цель и интересы",
  "BATNA и красные линии",
  "Диапазоны и целевой пакет",
  "Факты и условия их раскрытия",
  "Возражения и правила уступок",
  "Проверка связности",
  "Публичный бриф",
];
const DOTS = 24;
const EXPECTED_MS = 9000;

type Phase = "idle" | "running" | "failed";

export interface Assembly {
  phase: Phase;
  progress: number;
  settings: SessionSettings | null;
  start: (settings: SessionSettings) => void;
  retry: () => void;
  startPreset: () => void;
  close: () => void;
}

/** Runs the server-side counterparty assembly and drives the progress modal. */
export function useAssembly(onReady?: (brief: PublicBrief) => void): Assembly {
  const { setBrief } = useFlow();
  const demo = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("demoModal") : null;
  const [phase, setPhase] = useState<Phase>(demo === "running" || demo === "failed" ? demo : "idle");
  const [progress, setProgress] = useState(demo === "running" ? 0.62 : 0);
  const [settings, setSettings] = useState<SessionSettings | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  function tick(startedAt: number) {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      // Eases towards 92% while the generator works; the rest completes when the answer arrives.
      setProgress(Math.min(0.92, 1 - Math.exp(-elapsed / (EXPECTED_MS / 2.2))));
    }, 120);
  }

  function finish(brief: PublicBrief) {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setProgress(1);
    window.setTimeout(() => {
      setBrief(brief);
      setPhase("idle");
      if (onReady) onReady(brief);
      else navigate("brief");
    }, 450);
  }

  async function run(request: (signal: AbortSignal) => Promise<{ brief: PublicBrief }>) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("running");
    setProgress(0);
    tick(Date.now());
    try {
      const { brief } = await request(controller.signal);
      if (controller.signal.aborted) return;
      finish(brief);
    } catch {
      if (controller.signal.aborted) return;
      if (timerRef.current) window.clearInterval(timerRef.current);
      setPhase("failed");
    }
  }

  return {
    phase,
    progress,
    settings,
    start(next) {
      setSettings(next);
      void run((signal) => assembleScenario(next, signal));
    },
    retry() {
      if (settings) void run((signal) => assembleScenario(settings, signal));
    },
    startPreset() {
      void run((signal) => loadPresetScenario(signal));
    },
    close() {
      abortRef.current?.abort();
      if (timerRef.current) window.clearInterval(timerRef.current);
      setPhase("idle");
    },
  };
}

function itemState(index: number, progress: number) {
  const position = progress * ITEMS.length;
  if (progress >= 1 || index < Math.floor(position)) return "done";
  if (index === Math.floor(position)) return "active";
  return "pending";
}

export function AssemblyFlow({ assembly }: { assembly: Assembly }) {
  if (assembly.phase === "idle") return null;
  const settings = assembly.settings;
  const label = settings ? presetById(settings.presetId).label : "Жёсткий закупщик";
  const meta = settings
    ? `${label} · ${difficultyLower[settings.difficulty]} сложность · ${settings.durationMin} минут`
    : "Жёсткий закупщик · средняя сложность · 15 минут";

  return (
    <div className="modal-layer" role="presentation">
      {assembly.phase === "running" ? (
        <section className="modal assembly-modal" role="dialog" aria-modal="true" aria-labelledby="assembly-title">
          <h2 id="assembly-title" className="modal-title" style={{ left: 47, top: 44 }}>Собираем контрагента</h2>
          <p className="assembly-meta">{meta}</p>
          <ul className="assembly-items" aria-live="polite">
            {ITEMS.map((item, index) => {
              const state = itemState(index, assembly.progress);
              return (
                <li key={item} className={cn("assembly-item", `is-${state}`)} style={{ left: index < 4 ? 49 : 459, top: 177 + (index % 4) * 56 }}>
                  {state === "done" ? <CheckCircleIcon size={26} /> : <span className="assembly-status" aria-hidden="true" />}
                  <span>{item}</span>
                </li>
              );
            })}
          </ul>
          <div className="assembly-dots" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(assembly.progress * 100)}>
            {Array.from({ length: DOTS }, (_, index) => (
              <i key={index} className={cn(index < Math.round(assembly.progress * DOTS) && "is-on")} />
            ))}
          </div>
          <p className="assembly-note">Скрытую часть вы не увидите — только публичный бриф. После старта карточка замораживается.</p>
          <p className="assembly-eta">Обычно 5–10 секунд</p>
        </section>
      ) : (
        <section className="modal assembly-modal" role="alertdialog" aria-modal="true" aria-labelledby="failure-title">
          <h2 id="failure-title" className="modal-title" style={{ left: 49, top: 44 }}>Не удалось собрать ситуацию</h2>
          <p className="failure-copy">
            Генератор сейчас недоступен. Частично собранную ситуацию мы не используем: противоречий в переговорах быть не должно.
          </p>
          <div className="failure-offer">
            <span>Можно начать сразу</span>
            <strong>Жёсткий закупщик · готовый сценарий</strong>
            <small>Проверен заранее · средняя сложность · 15 минут</small>
          </div>
          <OutlineButton box={{ left: 54, top: 492, width: 280, height: 60 }} weight={400} onClick={assembly.retry}>Повторить</OutlineButton>
          <CtaButton box={{ left: 360, top: 492, width: 420, height: 60 }} weight={500} onClick={assembly.startPreset}>Начать с пресета</CtaButton>
          <button type="button" className="modal-close" onClick={assembly.close} aria-label="Закрыть">×</button>
        </section>
      )}
    </div>
  );
}
