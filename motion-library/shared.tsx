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

// Warm off-white paper with a faint dotted grid. Reads as
// notebook / whiteboard. Use for definitions, instructional motifs.
export const PaperGrid: React.FC<{ theme?: Partial<Theme>; opacity?: number }> = ({
  theme = {},
  opacity = 1,
}) => {
  const t = { ...DEFAULT_THEME, ...theme };
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: "#F4EFE3" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(rgba(15,26,46,0.18) 1.6px, transparent 1.6px)`,
          backgroundSize: "44px 44px",
          opacity: 0.55,
        }}
      />
      {/* subtle vignette so center holds focus */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.16) 100%)`,
          pointerEvents: "none",
        }}
      />
      {/* warm hairline at bottom keeps the navy-gold core via accent */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 60,
          height: 4,
          background: t.accent,
          opacity: 0.5,
        }}
      />
    </AbsoluteFill>
  );
};

// Near-black with horizontal scanlines + corner status text. Reads as code/CLI.
// Use for technical, code, command-line motifs.
export const TerminalBg: React.FC<{ theme?: Partial<Theme>; opacity?: number }> = ({
  theme = {},
  opacity = 1,
}) => {
  const t = { ...DEFAULT_THEME, ...theme };
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: "#0B0E10" }}>
      {/* scanlines */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 4px)`,
          pointerEvents: "none",
        }}
      />
      {/* faint top-glow so it doesn't read as a black void */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(t.accent, 0.07)} 0%, transparent 55%)`,
          pointerEvents: "none",
        }}
      />
      {/* corner status text: prompt-style */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 60,
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontSize: 22,
          color: hexToRgba(t.white, 0.45),
          letterSpacing: 1,
        }}
      >
        ~ /skills/edit
      </div>
      <div
        style={{
          position: "absolute",
          top: 56,
          right: 60,
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontSize: 22,
          color: t.accent,
        }}
      >
        ●
      </div>
    </AbsoluteFill>
  );
};

// Deep teal-blue base + cyan/white blueprint grid. Reads as architecture / design / system.
// Use for systems, structure, planning, networks.
export const BlueprintGrid: React.FC<{ theme?: Partial<Theme>; opacity?: number }> = ({
  theme = {},
  opacity = 1,
}) => {
  const t = { ...DEFAULT_THEME, ...theme };
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: "#062A45" }}>
      {/* fine grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            `linear-gradient(to right, rgba(120,200,255,0.10) 1px, transparent 1px), ` +
            `linear-gradient(to bottom, rgba(120,200,255,0.10) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      {/* coarse grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            `linear-gradient(to right, rgba(180,230,255,0.18) 1.5px, transparent 1.5px), ` +
            `linear-gradient(to bottom, rgba(180,230,255,0.18) 1.5px, transparent 1.5px)`,
          backgroundSize: "300px 300px",
        }}
      />
      {/* radial glow keeps subject pop */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(8, 56, 92, 0) 30%, rgba(0,0,0,0.45) 95%)`,
          pointerEvents: "none",
        }}
      />
      {/* accent crosshair top-right */}
      <div
        style={{
          position: "absolute",
          top: 70,
          right: 70,
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontSize: 20,
          color: hexToRgba(t.accent, 0.85),
          letterSpacing: 2,
        }}
      >
        + 0.00, 0.00
      </div>
    </AbsoluteFill>
  );
};
