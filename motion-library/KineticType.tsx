// KineticType — full-bleed kinetic typography. Words pop in stagger, each
// with its own rotation/scale jitter. No surrounding card, no NavyGrid by
// default — punchline aesthetic.
//
// Use when transcript hits an emphatic line: declarations, mantras, "the
// truth is...", payoffs, "saves you mad time" punchlines.

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { NavyGrid, PaperGrid, withTheme, hexToRgba, type Theme } from "./shared";

export type KineticTypeProps = {
  text?: string;
  bg?: "navy" | "paper" | "none";
  // index of the word to color in accent — defaults to last
  highlightIndex?: number;
  theme?: Partial<Theme>;
};

// approximation of easeOutBack for word entry overshoot
function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export const KineticType: React.FC<KineticTypeProps> = ({
  text = "SAVES YOU MAD TIME",
  bg = "navy",
  highlightIndex,
  theme,
}) => {
  const t = withTheme(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = text.trim().split(/\s+/);
  const accentIdx = highlightIndex ?? words.length - 1;

  // Each word enters at 6-frame intervals.
  const startDelay = 4;
  const perWord = 7;
  const enterFrames = 14; // how long the entry lerp lasts

  return (
    <AbsoluteFill>
      {bg === "navy" && <NavyGrid theme={theme} />}
      {bg === "paper" && <PaperGrid theme={theme} />}

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: "0 60px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          {words.map((w, i) => {
            const t0 = startDelay + i * perWord;
            const localT = Math.min(1, Math.max(0, (frame - t0) / enterFrames));
            const eased = easeOutBack(localT);
            const yOffset = (1 - eased) * 80;
            // mild rotation alternating per word
            const rotMax = i % 2 === 0 ? -3 : 3;
            const rot = (1 - eased) * rotMax;
            const scale = 0.7 + 0.3 * eased;

            // breathing pulse after settle
            const settled = Math.max(0, frame - (t0 + enterFrames));
            const pulse = Math.sin(settled * 0.12) * 0.012;

            const isAccent = i === accentIdx;
            const color =
              bg === "paper" ? (isAccent ? t.accent : "#0F1A2E") : isAccent ? t.accent : t.white;

            const glow =
              isAccent && bg !== "paper"
                ? `0 0 60px ${hexToRgba(t.accent, 0.35)}`
                : "none";

            return (
              <div
                key={i}
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 900,
                  fontSize: words.length > 4 ? 132 : 168,
                  lineHeight: 0.95,
                  letterSpacing: -2,
                  color,
                  opacity: localT,
                  transform: `translateY(${yOffset}px) rotate(${rot}deg) scale(${scale + pulse})`,
                  textTransform: "uppercase",
                  textShadow: glow,
                  whiteSpace: "nowrap",
                }}
              >
                {w}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* underscore mark that sweeps in after final word */}
      {(() => {
        const t0 = startDelay + words.length * perWord + 8;
        const w = interpolate(frame - t0, [0, 16], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 360,
              width: 280 * w,
              height: 8,
              background: t.accent,
              transform: "translateX(-50%)",
              borderRadius: 4,
            }}
          />
        );
      })()}
    </AbsoluteFill>
  );
};

export default KineticType;
