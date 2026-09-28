import type { CSSProperties, ReactNode } from "react";
import { ArrowIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface Box { left: number; top: number; width: number; height: number }

function boxStyle(box: Box, extra?: CSSProperties): CSSProperties {
  return { left: box.left, top: box.top, width: box.width, height: box.height, ...extra };
}

interface CtaProps {
  box: Box;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "light" | "dark" | "orange" | "orange-dark";
  fontSize?: number;
  weight?: number;
  arrowColor?: string;
  arrowWidth?: number;
  className?: string;
  center?: boolean;
  type?: "button" | "submit";
}

/** Rounded call-to-action with the orange arrow from the mockups. */
export function CtaButton({
  box, children, onClick, disabled, variant = "light", fontSize = 24, weight = 500, arrowColor, arrowWidth = 44, className, center, type = "button",
}: CtaProps) {
  const color = arrowColor ?? (variant === "orange" ? "#CDDFF8" : variant === "orange-dark" ? "#544C4C" : "#FF6547");
  return (
    <button
      type={type}
      className={cn("pill pill-cta", variant !== "light" && variant, center && "center", className)}
      style={boxStyle(box, { fontSize, fontWeight: weight })}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
      <ArrowIcon color={color} width={arrowWidth} />
    </button>
  );
}

export function OutlineButton({
  box, children, onClick, disabled, fontSize = 24, weight = 700, className,
}: { box: Box; children: ReactNode; onClick?: () => void; disabled?: boolean; fontSize?: number; weight?: number; className?: string }) {
  return (
    <button type="button" className={cn("pill pill-outline", className)} style={boxStyle(box, { fontSize, fontWeight: weight })} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Chip({ on, custom, children, onClick, disabled }: { on?: boolean; custom?: boolean; children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" className={cn("chip", on && "is-on", custom && "is-custom")} aria-pressed={on} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  options, value, onChange, style, className, label,
}: { options: { value: T; label: string }[]; value: T; onChange: (value: T) => void; style?: CSSProperties; className?: string; label?: string }) {
  return (
    <div className={cn("segmented", className)} style={style} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={cn(option.value === value && "is-on")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function OptionRow({ on, title, hint, onClick }: { on: boolean; title: string; hint: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" className={cn("option-row", on && "is-on")} role="radio" aria-checked={on} onClick={onClick}>
        <span className={cn("radio", on && "is-on")} aria-hidden="true" />
        <span className="option-copy">
          <strong>{title}</strong>
          <small>{hint}</small>
        </span>
      </button>
    </li>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={cn("toggle", on && "is-on")} onClick={() => onChange(!on)} />
  );
}
