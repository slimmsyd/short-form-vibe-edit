// TierStack — chat-bubble cards stacked at ascending Y positions, each more
// elaborate than the one below. Conveys altitude / tiers of capability.
//
// Use when transcript mentions: scope, capability, levels, tiers, scale,
// altitude, what's possible, ranges, sophistication, depth, ladder.

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { NavyGrid, withTheme, type Theme } from "./shared";

type Tier = {
  popFrame: number;
  y: number;
  lines: number;
  hasChart?: boolean;
  hasCode?: boolean;
};

const DEFAULT_TIERS: Tier[] = [
  { popFrame: 0, y: 1380, lines: 1 },
  { popFrame: 16, y: 1180, lines: 3 },
  { popFrame: 34, y: 980, lines: 2, hasChart: true },
  { popFrame: 54, y: 760, lines: 2, hasCode: true },
];

export type TierStackProps = {
  tiers?: Tier[];
  scopeLabel?: string;
  codeSnippet?: string;
  theme?: Partial<Theme>;
};

export const TierStack: React.FC<TierStackProps> = ({
  tiers = DEFAULT_TIERS,
  scopeLabel = "↑ scope",
  codeSnippet = "const result = await llm.run({",
  theme,
}) => {
  const t = withTheme(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineP = interpolate(frame, [0, 90], [0, 1], { extrapolateRight: "clamp" });
  const accentSoft = `rgba(${parseInt(t.accent.slice(1, 3), 16)},${parseInt(
    t.accent.slice(3, 5),
    16
  )},${parseInt(t.accent.slice(5, 7), 16)},0.10)`;
  const accentBorder = `rgba(${parseInt(t.accent.slice(1, 3), 16)},${parseInt(
    t.accent.slice(3, 5),
    16
  )},${parseInt(t.accent.slice(5, 7), 16)},0.5)`;

  return (
    <AbsoluteFill>
      <NavyGrid theme={theme} />
      <div
        style={{
          position: "absolute",
          right: 60,
          top: 720,
          width: 4,
          height: 720,
          background: `linear-gradient(to top, transparent 0%, ${t.accent} ${lineP * 100}%, transparent ${lineP * 100 + 1}%)`,
          opacity: 0.6,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 90,
          top: 700,
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: 3,
          color: t.accent,
          opacity: lineP,
          textTransform: "uppercase",
        }}
      >
        {scopeLabel}
      </div>
      {tiers.map((tier, i) => {
        const localF = Math.max(0, frame - tier.popFrame);
        const enter = spring({
          frame: localF,
          fps,
          config: { damping: 16, mass: 0.55, stiffness: 170 },
        });
        const opacity = enter;
        const ty = interpolate(enter, [0, 1], [40, 0]);
        const isTop = i === tiers.length - 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 90,
              top: tier.y,
              width: 720,
              padding: "20px 26px",
              borderRadius: 18,
              background: isTop ? accentSoft : "rgba(255,255,255,0.05)",
              border: `1.5px solid ${isTop ? accentBorder : "rgba(255,255,255,0.12)"}`,
              opacity,
              transform: `translateY(${ty}px)`,
              boxShadow: isTop ? `0 14px 50px ${accentSoft}` : "none",
            }}
          >
            <div
              style={{
                display: "inline-block",
                verticalAlign: "top",
                width: 32,
                height: 32,
                borderRadius: 16,
                background: isTop ? t.accent : "rgba(255,255,255,0.6)",
                marginRight: 14,
                marginTop: 2,
              }}
            />
            <div style={{ display: "inline-block", verticalAlign: "top", width: 640 }}>
              {Array.from({ length: tier.lines }, (_, li) => (
                <div
                  key={li}
                  style={{
                    height: 14,
                    width: li === 0 ? "70%" : "92%",
                    background: isTop ? t.accent : t.soft,
                    borderRadius: 5,
                    marginBottom: 8,
                    opacity: isTop ? 0.85 : 1,
                  }}
                />
              ))}
              {tier.hasChart && (
                <svg width="100%" height={70} viewBox="0 0 600 70" style={{ marginTop: 8 }}>
                  <polyline
                    points="0,55 80,45 160,40 240,28 320,22 400,12 480,8 560,4"
                    fill="none"
                    stroke={t.accent}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {tier.hasCode && (
                <pre
                  style={{
                    margin: "10px 0 0 0",
                    padding: "10px 14px",
                    background: "rgba(0,0,0,0.45)",
                    borderRadius: 8,
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    fontSize: 18,
                    color: t.accent,
                    letterSpacing: -0.2,
                  }}
                >
                  {codeSnippet}
                </pre>
              )}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
