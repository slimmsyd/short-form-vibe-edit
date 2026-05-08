// Shared primitives + themable palette for short-form-vibe-edit motion library.
//
// Each motion graphic in the library accepts an optional `theme` prop. If
// omitted, it falls back to the DEFAULT_THEME (navy + gold). The Vertical
// composition typically passes a project-level theme down via props or context.

import { AbsoluteFill } from "remotion";

export type Theme = {
  bg: string;
  accent: string;
  navy: string;
  white: string;
  red: string;
  green: string;
  soft: string;
};

export const DEFAULT_THEME: Theme = {
  bg: "#0A0A0A",
  accent: "#F8E16C",
  navy: "#0F1A2E",
  white: "#FFFFFF",
  red: "#E04545",
  green: "#3DD68C",
  soft: "rgba(255,255,255,0.85)",
};

// 1080×1920 layout constants (default)
export const W = 1080;
export const H = 1920;

// Navy gradient + grid background. Used by every library scene to establish
// a coherent visual frame.
export const NavyGrid: React.FC<{ theme?: Partial<Theme>; opacity?: number }> = ({
  theme = {},
  opacity = 1,
}) => {
  const t = { ...DEFAULT_THEME, ...theme };
  return (
    <AbsoluteFill
      style={{
        opacity,
        background: `radial-gradient(ellipse at 50% 42%, ${t.navy} 0%, ${t.bg} 78%)`,
        backgroundColor: t.bg,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            `linear-gradient(to right, ${hexToRgba(t.accent, 0.06)} 1px, transparent 1px), ` +
            `linear-gradient(to bottom, ${hexToRgba(t.accent, 0.06)} 1px, transparent 1px)`,
          backgroundSize: "90px 90px",
        }}
      />
    </AbsoluteFill>
  );
};

// Helper: #RRGGBB → rgba(r,g,b,alpha)
export function hexToRgba(hex: string, a: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function withTheme(override?: Partial<Theme>): Theme {
  return { ...DEFAULT_THEME, ...(override ?? {}) };
}
