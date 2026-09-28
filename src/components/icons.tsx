// Small icons redrawn 1:1 from the mockup geometry.
interface IconProps { className?: string; color?: string; size?: number }

export function ArrowIcon({ className, color = "#FF6547", width = 44 }: IconProps & { width?: number }) {
  return (
    <svg className={`arrow-icon ${className ?? ""}`} width={width} height="20" viewBox={`0 0 ${width} 20`} fill="none" aria-hidden="true">
      <path d={`M1 10H${width - 1}`} stroke={color} strokeWidth="2.5" />
      <path d={`M${width - 11} 1L${width - 1.5} 10L${width - 11} 19`} stroke={color} strokeWidth="2.5" />
    </svg>
  );
}

export function LockIcon({ className, color = "#8B8484" }: IconProps) {
  return (
    <svg className={className} width="18" height="23" viewBox="0 0 18 23" fill="none" aria-hidden="true">
      <path d="M4 9V6C4 3.24 6.24 1.25 9 1.25C11.76 1.25 14 3.24 14 6V9" stroke={color} strokeWidth="2.5" />
      <rect y="9" width="18" height="14" rx="3" fill={color} />
    </svg>
  );
}

export function DiceIcon({ className, color = "#CDDFF8", size = 22 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="1.25" y="1.25" width="19.5" height="19.5" rx="4.75" stroke={color} strokeWidth="2.5" />
      <circle cx="6.3" cy="6.3" r="2.3" fill={color} />
      <circle cx="11" cy="11" r="2.3" fill={color} />
      <circle cx="15.7" cy="15.7" r="2.3" fill={color} />
    </svg>
  );
}

export function CheckCircleIcon({ className, color = "#FF6547", size = 28 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="12.75" stroke={color} strokeWidth="2.5" />
      <path d="M8.5 14.3L12.4 17.7L19.8 9.8" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function QuestionCircleIcon({ className, color = "#CDDFF8", size = 36 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="16.5" stroke={color} strokeWidth="2" strokeDasharray="3 3.4" />
      <path d="M13.8 14.2C13.8 11.8 15.7 10.2 18 10.2C20.3 10.2 22.2 11.8 22.2 14C22.2 17.4 18 17.2 18 20.8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="18" cy="25.4" r="1.5" fill={color} />
    </svg>
  );
}

export function WarningIcon({ className, color = "#FF6547" }: IconProps) {
  return (
    <svg className={className} width="31" height="31" viewBox="0 0 31 31" fill="none" aria-hidden="true">
      <circle cx="15.5" cy="15.5" r="14" stroke={color} strokeWidth="2.5" strokeDasharray="4 2.2" />
      <path d="M15.5 8.5V17.5" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="15.5" cy="22.3" r="1.6" fill={color} />
    </svg>
  );
}

export function ChevronIcon({ className, color = "#E8F1FC", up = false, width = 16 }: IconProps & { up?: boolean; width?: number }) {
  return (
    <svg className={className} width={width + 3} height={width / 2 + 3} viewBox={`-1.5 -1.5 ${width + 3} ${width / 2 + 3}`} fill="none" aria-hidden="true"
      style={up ? { transform: "rotate(180deg)" } : undefined}>
      <path d={`M0 0L${width / 2} ${width / 2}L${width} 0`} stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon({ className, color = "#FF6547" }: IconProps) {
  return (
    <svg className={className} width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <path d="M3 3L27 27M27 3L3 27" stroke={color} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
