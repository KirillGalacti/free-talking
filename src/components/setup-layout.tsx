import type { ReactNode } from "react";
import { HandText } from "@/components/hand-text";
import { AppRail } from "@/components/app-rail";
import { cn } from "@/lib/utils";

export interface StepItem {
  label: string;
  sub?: string;
  state: "done" | "current" | "open" | "later";
}

interface SetupLayoutProps {
  title?: string;
  breadcrumb: string;
  steps?: StepItem[];
  stepsTitleAccent?: boolean;
  note?: ReactNode;
  noteWidth?: number;
  children: ReactNode;
}

const STEP_COLORS: Record<StepItem["state"], string> = {
  done: "#CDDFF8",
  current: "#FF6547",
  open: "#CDDFF8",
  later: "#8B8484",
};

// Baselines measured on the mockup (panel-relative, panel top = 172).
const NUMBER_BASELINE = [183, 290, 390, 490, 590, 690];
const LINE_TOP = [198.2, 298.2, 398.2, 498.2, 598.2];
const LABEL_TOP = [137.4, 243.2, 343.2, 443.2, 543.2, 643.2];
const SUB_TOP = [169, 275.2, 375.2, 475.2, 575.2, 675.2];

export function PageHeader({ title, breadcrumb }: { title: string; breadcrumb: string }) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <p className="page-breadcrumb">{breadcrumb}</p>
      <label className="page-search">
        <img src="/assets/search.svg" alt="" width="31" height="29" />
        <input type="search" placeholder="Поиск" aria-label="Поиск" />
      </label>
      <button type="button" className="page-profile" title="Профиль" aria-label="Профиль">
        <img src="/assets/profile.svg" alt="" width="49" height="49" />
      </button>
    </>
  );
}

export function SetupStepper({ steps, accentTitle, note, noteWidth }: { steps: StepItem[]; accentTitle?: boolean; note?: ReactNode; noteWidth?: number }) {
  return (
    <aside className="setup-steps panel" aria-label="Шаги новой сессии">
      <h2 className={cn("setup-steps-title", accentTitle && "is-accent")}>Новая<br />сессия</h2>
      <ol>
        {steps.map((step, index) => {
          const color = STEP_COLORS[step.state];
          const next = steps[index + 1];
          const lineColor = next && next.state !== "later" ? "#CDDFF8" : "#8B8484";
          const digit = String(index + 1);
          return (
            <li key={step.label} className={cn("setup-step", `is-${step.state}`)} aria-current={step.state === "current" ? "step" : undefined}>
              <span className="setup-step-number" style={{ top: NUMBER_BASELINE[index] - 47.5, left: digit === "1" ? 29.4 : 36 }}>
                <HandText text={digit} size={44.8} color={color} />
              </span>
              <span className="setup-step-label" style={{ color, top: LABEL_TOP[index] }}>{step.label}</span>
              {step.sub && <span className="setup-step-sub" style={{ top: SUB_TOP[index] }}>{step.sub}</span>}
              {next && <i className="setup-step-line" style={{ background: lineColor, top: LINE_TOP[index] }} />}
            </li>
          );
        })}
      </ol>
      {note && <p className="setup-steps-note" style={noteWidth ? { width: noteWidth } : undefined}>{note}</p>}
    </aside>
  );
}

export function SetupLayout({ title = "Свободные переговоры", breadcrumb, steps, stepsTitleAccent, note, noteWidth, children }: SetupLayoutProps) {
  return (
    <>
      <AppRail />
      <PageHeader title={title} breadcrumb={breadcrumb} />
      {steps && <SetupStepper steps={steps} accentTitle={stepsTitleAccent} note={note} noteWidth={noteWidth} />}
      {children}
    </>
  );
}
