import { type CSSProperties, type ReactNode, useLayoutEffect, useState } from "react";
import { cn } from "@/lib/utils";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

interface Box { s: number; x: number; y: number; vw: number }

function measure(height: number): Box {
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const vh = window.innerHeight;
  if (height <= DESIGN_HEIGHT) {
    const s = Math.min(vw / DESIGN_WIDTH, vh / DESIGN_HEIGHT);
    return { s, x: (vw - DESIGN_WIDTH * s) / 2, y: Math.max(0, (vh - DESIGN_HEIGHT * s) / 2), vw };
  }
  // Tall pages (the full report) keep the design width and scroll vertically.
  const s = vw / DESIGN_WIDTH;
  return { s, x: 0, y: 0, vw };
}

interface StageProps {
  children: ReactNode;
  height?: number;
  className?: string;
  label?: string;
}

/**
 * Renders a screen on the 1920×1080 reference canvas and scales it to the window,
 * so every proportion of the mockup is preserved at any resolution.
 */
export function Stage({ children, height = DESIGN_HEIGHT, className, label }: StageProps) {
  const [box, setBox] = useState<Box>(() => measure(height));

  useLayoutEffect(() => {
    const update = () => setBox(measure(height));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [height]);

  const vars = { "--s": box.s, "--x": `${box.x}px`, "--y": `${box.y}px` } as CSSProperties;

  return (
    <div className={cn("viewport", height <= DESIGN_HEIGHT && "is-fixed")} style={vars}>
      <div className="stage-spacer" style={{ height: height > DESIGN_HEIGHT ? height * box.s : "100%" }}>
        <main className={cn("stage", className)} style={{ height }} aria-label={label}>
          {children}
        </main>
      </div>
    </div>
  );
}
