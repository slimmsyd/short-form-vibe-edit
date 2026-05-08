// ProblemSolution — chaos on the left fades into clarity on the right.
// Tangled scribble morphs to a clean target arrow. Gold "→" bridges them.
//
// Use when transcript mentions: define the problem, find a solution, before/
// after, chaos to clarity, fix, breakthrough, solve, untangle, debug.

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { NavyGrid, withTheme, type Theme, W } from "./shared";

export type ProblemSolutionProps = {
  problemLabel?: string;
  solutionLabel?: string;
  theme?: Partial<Theme>;
};

export const ProblemSolution: React.FC<ProblemSolutionProps> = ({
  problemLabel = "PROBLEM",
  solutionLabel = "SOLUTION",
  theme,
}) => {
  const t = withTheme(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tangleOpacity = interpolate(frame, [0, 18, 45, 70], [0, 1, 1, 0.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cleanEnter = spring({
    frame: Math.max(0, frame - 30),
    fps,
    config: { damping: 16, mass: 0.6 },
  });
  const cleanScale = interpolate(cleanEnter, [0, 1], [0.65, 1]);

  const bridgeEnter = spring({
    frame: Math.max(0, frame - 50),
    fps,
    config: { damping: 14, mass: 0.5, stiffness: 200 },
  });

  return (
    <AbsoluteFill>
      <NavyGrid theme={theme} />
      <svg
        width={420}
        height={420}
        style={{ position: "absolute", left: 50, top: 800, opacity: tangleOpacity }}
        viewBox="0 0 420 420"
      >
        <path
          d="M 60 60 C 200 30, 320 110, 280 200 S 80 230, 140 320 S 360 360, 320 240 S 100 180, 200 100 S 380 200, 250 280"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 100 130 C 240 100, 290 250, 200 280 S 80 200, 180 240 S 320 200, 240 160"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
        />
        <text
          x="210"
          y="395"
          textAnchor="middle"
          fill={t.soft}
          fontSize="28"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="600"
          letterSpacing="2"
        >
          {problemLabel}
        </text>
      </svg>
      <svg
        width={420}
        height={420}
        style={{
          position: "absolute",
          right: 50,
          top: 800,
          opacity: cleanEnter,
          transform: `scale(${cleanScale})`,
          transformOrigin: "center center",
        }}
        viewBox="0 0 420 420"
      >
        <defs>
          <linearGradient id="psGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={t.accent} stopOpacity="0.5" />
            <stop offset="100%" stopColor={t.accent} stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle cx="280" cy="140" r="100" stroke={t.accent} strokeWidth="2.5" fill="none" opacity="0.35" />
        <circle cx="280" cy="140" r="65" stroke={t.accent} strokeWidth="2.5" fill="none" opacity="0.55" />
        <circle cx="280" cy="140" r="32" stroke={t.accent} strokeWidth="2.5" fill="none" opacity="0.85" />
        <circle cx="280" cy="140" r="10" fill={t.accent} />
        <path
          d="M 60 320 L 270 145"
          stroke="url(#psGrad)"
          strokeWidth={12}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 270 145 L 240 145 M 270 145 L 270 175"
          stroke="url(#psGrad)"
          strokeWidth={12}
          strokeLinecap="round"
          fill="none"
        />
        <text
          x="210"
          y="395"
          textAnchor="middle"
          fill={t.white}
          fontSize="28"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="700"
          letterSpacing="2"
        >
          {solutionLabel}
        </text>
      </svg>
      <div
        style={{
          position: "absolute",
          left: W / 2 - 60,
          top: 990,
          opacity: bridgeEnter,
          transform: `translateX(${interpolate(bridgeEnter, [0, 1], [-30, 0])}px)`,
        }}
      >
        <svg width={120} height={60}>
          <path
            d="M 6 30 L 100 30 M 100 30 L 75 12 M 100 30 L 75 48"
            stroke={t.accent}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
