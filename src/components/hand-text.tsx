import { HAND_GAP, HAND_UNIT, handGlyphs } from "@/lib/hand-glyphs";

interface HandTextProps {
  text: string;
  /** Height of the digit "1" in design pixels. */
  size: number;
  color?: string;
  className?: string;
  gap?: number;
  label?: string;
}

/** Renders numbers with the rounded hand-drawn numerals used across the mockups. */
export function HandText({ text, size, color = "currentColor", className, gap = HAND_GAP, label }: HandTextProps) {
  const scale = size / HAND_UNIT;
  const chars = [...text];
  let x = 0;
  let top = 0;
  const parts = chars.map((char, index) => {
    if (char === " ") {
      x += 14;
      return null;
    }
    const glyph = handGlyphs[char];
    if (!glyph) return null;
    const node = glyph.d
      ? <path key={index} d={glyph.d} transform={`translate(${x} 0)`} fill={color} />
      : (
        <path
          key={index}
          d={glyph.stroke}
          transform={`translate(${x} 0)`}
          stroke={color}
          strokeWidth={5.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    top = Math.min(top, glyph.top);
    x += glyph.w + gap;
    return node;
  });
  const width = Math.max(1, x - gap);
  const viewTop = Math.min(top, -46.8) - 0.5;
  const height = -viewTop + 1;

  return (
    <svg
      className={className}
      width={width * scale}
      height={height * scale}
      viewBox={`0 ${viewTop} ${width} ${height}`}
      role={label ? "img" : undefined}
      aria-label={label ?? text}
      style={{ display: "block", overflow: "visible" }}
    >
      {parts}
    </svg>
  );
}
