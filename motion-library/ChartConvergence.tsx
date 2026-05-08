// ChartConvergence — two opposing market bar strips slide in from L/R, meet
// at center, gold arrow rises out of the convergence point.
//
// Use when transcript mentions: matching, arbitrage, opportunity, opposing
// forces, convergence, two sides meeting, balance, equilibrium, deal closing.

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { NavyGrid, withTheme, type Theme, W } from "./shared";

const DEFAULT_LEFT_BARS = [0.45, 0.55, 0.5, 0.7, 0.6, 0.85, 0.78, 1.0];
const DEFAULT_RIGHT_BARS = [0.3, 0.42, 0.5, 0.45, 0.6, 0.72, 0.88, 1.0];

export type ChartConvergenceProps = {
  leftBars?: number[];
  rightBars?: number[];
  theme?: Partial<Theme>;
};

export const ChartConvergence: React.FC<ChartConvergenceProps> = ({
  leftBars = DEFAULT_LEFT_BARS,
  rightBars = DEFAULT_RIGHT_BARS,
  theme,
}) => {
  const t = withTheme(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftSlide = interpolate(frame, [0, 30], [-W / 2, 0], {
    extrapolateRight: "clamp",
  });
  const rightSlide = interpolate(frame, [0, 30], [W / 2, 0], {
    extrapolateRight: "clamp",
  });
  const settleP = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const arrowSpring = spring({
    frame: Math.max(0, frame - 38),
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 90 },
  });
  const arrowYOffset = interpolate(arrowSpring, [0, 1], [120, -260]);
  const arrowScale = interpolate(arrowSpring, [0, 1], [0.6, 1]);

  return (
    <AbsoluteFill>
      <NavyGrid theme={theme} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 980,
          height: 280,
          display: "flex",
        }}
      >
        <div
          style={{
            width: W / 2,
            height: "100%",
            transform: `translateX(${leftSlide}px)`,
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            padding: "0 30px 0 60px",
          }}
        >
          {leftBars.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h * 100}%`,
                background: t.red,
                opacity: 0.9 - settleP * 0.15,
                borderRadius: 6,
                boxShadow: "0 6px 18px rgba(224,69,69,0.35)",
              }}
            />
          ))}
        </div>
        <div
          style={{
            width: W / 2,
            height: "100%",
            transform: `translateX(${rightSlide}px)`,
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            padding: "0 60px 0 30px",
          }}
        >
          {rightBars.map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h * 100}%`,
                background: t.green,
                opacity: 0.9 - settleP * 0.15,
                borderRadius: 6,
                boxShadow: "0 6px 18px rgba(61,214,140,0.35)",
              }}
            />
          ))}
        </div>
      </div>
      <svg
        width={260}
        height={700}
        style={{
          position: "absolute",
          left: W / 2 - 130,
          top: 540,
          opacity: arrowSpring,
          transform: `translateY(${arrowYOffset}px) scale(${arrowScale})`,
          transformOrigin: "center bottom",
        }}
      >
        <defs>
          <linearGradient id="ccGrad" x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor={t.accent} stopOpacity="0.2" />
            <stop offset="100%" stopColor={t.accent} stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          d="M 130 700 L 130 80 M 130 80 L 70 150 M 130 80 L 190 150"
          stroke="url(#ccGrad)"
          strokeWidth={18}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: W / 2 - 20,
          top: 1230,
          width: 40,
          height: 40,
          borderRadius: 20,
          background: t.accent,
          opacity: settleP,
          boxShadow: `0 0 ${30 * settleP}px ${t.accent}`,
        }}
      />
    </AbsoluteFill>
  );
};
