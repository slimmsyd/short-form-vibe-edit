// Timeline — horizontal track draws from left to right, milestone markers
// pop in staggered. A glowing dot rides the leading edge.
//
// Use when transcript mentions: experience, history, journey, evolution,
// before/after, year-by-year, track record, growth over time, milestones.

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { NavyGrid, withTheme, type Theme } from "./shared";

const DEFAULT_MILESTONES = [
  { x: 140, popFrame: 12, label: "2020", sub: "shipped" },
  { x: 420, popFrame: 28, label: "2022", sub: "shipped" },
  { x: 700, popFrame: 44, label: "2024", sub: "shipped" },
  { x: 940, popFrame: 60, label: "NOW", sub: "shipped" },
];

const TIMELINE_Y = 1020;

export type TimelineProps = {
  milestones?: { x: number; popFrame: number; label: string; sub?: string }[];
  theme?: Partial<Theme>;
};

export const Timeline: React.FC<TimelineProps> = ({
  milestones = DEFAULT_MILESTONES,
  theme,
}) => {
  const t = withTheme(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineP = interpolate(frame, [0, 70], [0, 1], { extrapolateRight: "clamp" });
  const lineWidth = lineP * 920;
  const dotX = 80 + lineWidth;
  const dotPulse = 1 + Math.sin(frame / 6) * 0.15;

  return (
    <AbsoluteFill>
      <NavyGrid theme={theme} />
      <div
        style={{
          position: "absolute",
          left: 80,
          top: TIMELINE_Y - 2,
          width: 920,
          height: 4,
          background: "rgba(255,255,255,0.12)",
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 80,
          top: TIMELINE_Y - 3,
          width: lineWidth,
          height: 6,
          background: t.accent,
          borderRadius: 3,
          boxShadow: `0 0 18px ${t.accent}`,
        }}
      />
      {lineP < 1 && (
        <div
          style={{
            position: "absolute",
            left: dotX - 14,
            top: TIMELINE_Y - 14,
            width: 28,
            height: 28,
            borderRadius: 14,
            background: t.accent,
            transform: `scale(${dotPulse})`,
            boxShadow: `0 0 30px ${t.accent}`,
          }}
        />
      )}
      {milestones.map((m, i) => {
        const localF = Math.max(0, frame - m.popFrame);
        const enter = spring({
          frame: localF,
          fps,
          config: { damping: 12, mass: 0.5, stiffness: 180 },
        });
        const opacity = enter;
        const scale = interpolate(enter, [0, 1], [0.6, 1]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: m.x - 60,
              top: TIMELINE_Y - 90,
              width: 120,
              textAlign: "center",
              opacity,
              transform: `scale(${scale})`,
              transformOrigin: "center bottom",
            }}
          >
            <div style={{ width: 4, height: 28, background: t.accent, margin: "0 auto", borderRadius: 2 }} />
            <div
              style={{
                marginTop: 12,
                fontFamily: "system-ui, -apple-system, 'SF Pro Display', sans-serif",
                fontSize: 36,
                fontWeight: 800,
                color: t.white,
                letterSpacing: -0.5,
              }}
            >
              {m.label}
            </div>
            {m.sub && (
              <div style={{ marginTop: 4, fontSize: 20, color: t.soft, letterSpacing: 1.5, textTransform: "uppercase" }}>
                {m.sub}
              </div>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
