import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Stroke numerals of the stage track, traced from the mockup (viewBox of each digit).
const NUMERALS = [
  { box: "740 75 24 38", d: "M742.707 101.632C750.795 100.855 757.442 94.9543 759.134 87.0522L760.146 82.3279C760.209 82.0294 760.652 82.0813 760.644 82.3864L759.956 110.06" },
  { box: "880 78 24 36", d: "M882.781 90.5091L883.595 88.366C885.06 84.5083 889.069 82.2236 893.157 82.9161C900.255 84.1183 902.868 92.9032 897.57 97.7509L884.259 109.931C883.846 110.309 884.293 110.966 884.798 110.726L891.158 107.704C894.428 106.15 898.349 107.263 900.301 110.298" },
  { box: "1014 76 26 36", d: "M1017.27 86.586C1017.23 82.9973 1020.02 80.005 1023.63 79.768L1026.07 79.6068C1031.6 79.2434 1036.24 83.6796 1036.09 89.1809L1036.08 89.5725C1035.95 94.3064 1032.41 98.2575 1027.69 98.9206L1018.49 100.215L1031.63 100.004C1033.97 99.9662 1035.88 101.872 1035.83 104.204C1035.79 106.297 1034.17 108.023 1032.06 108.212L1022 109.117C1020.06 109.291 1018.26 108.123 1017.64 106.293" },
  { box: "1136 74 28 40", d: "M1161.07 77.0508C1160.07 84.7804 1155.77 91.7044 1149.25 96.037L1139.86 102.286C1139.4 102.592 1139.68 103.306 1140.22 103.226L1157.64 100.702C1159.49 100.434 1161.13 101.898 1161.05 103.75L1160.79 110.254" },
];
const CENTERS = [760.5, 893, 1026, 1158];
const LABELS = ["Теория", "Бриф", "Встреча", "Разбор"];

export function StageTrack({ active, offsetY = 0 }: { active: 2 | 3 | 4; offsetY?: number }) {
  return (
    <ol className="stage-track" style={{ transform: `translateY(${offsetY}px)` }} aria-label="Этапы сессии">
      <i className="stage-track-line" aria-hidden="true" />
      {NUMERALS.map((numeral, index) => {
        const step = index + 1;
        const state = step < active ? "done" : step === active ? "active" : "todo";
        const [x, y, w, h] = numeral.box.split(" ").map(Number);
        return (
          <li key={step} className={cn("stage-step", `is-${state}`)} aria-current={state === "active" ? "step" : undefined}>
            <svg className="stage-numeral" style={{ left: x, top: y }} width={w} height={h} viewBox={numeral.box} fill="none" aria-hidden="true">
              <path d={numeral.d} stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="stage-dot" style={{ left: CENTERS[index] }} />
            <span className="stage-label" style={{ left: CENTERS[index] }}>{LABELS[index]}</span>
          </li>
        );
      })}
    </ol>
  );
}

interface SessionHeaderProps {
  subtitle: string;
  active: 2 | 3 | 4;
  trackOffset?: number;
  actions: ReactNode;
}

export function SessionHeader({ subtitle, active, trackOffset, actions }: SessionHeaderProps) {
  return (
    <header className="session-header">
      <img className="session-logo" src="/assets/logo-glow.svg" alt="" width="104" height="104" draggable={false} />
      <h1 className="session-title">Свободные переговоры</h1>
      <p className="session-subtitle">{subtitle}</p>
      <StageTrack active={active} offsetY={trackOffset} />
      {actions}
    </header>
  );
}
