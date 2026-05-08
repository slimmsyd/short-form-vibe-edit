// ClockProgress — analog clock face with sweeping second hand, progress bar
// stuck at 95%, pulsing notification dot. Deliberately calm pacing.
//
// Use when transcript mentions: waiting, paused, anticipation, time passing,
// almost done, pending, in-progress, queued, slow, deliberate.

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { NavyGrid, withTheme, type Theme, W } from "./shared";

const CLOCK_CX = W / 2;
const CLOCK_CY = 940;
const CLOCK_R = 220;

export type ClockProgressProps = {
  caption?: string;
  finalPercent?: number;
  theme?: Partial<Theme>;
};

export const ClockProgress: React.FC<ClockProgressProps> = ({
  caption = "PENDING REVIEW",
  finalPercent = 0.95,
  theme,
}) => {
  const t = withTheme(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const clockEnter = spring({
    frame,
    fps,
    config: { damping: 20, mass: 0.7, stiffness: 90 },
  });

  const handAngle = interpolate(frame, [0, 120], [-90, 270]);
  const minuteAngle = interpolate(frame, [0, 120], [-30, 0]);
  const progressP = interpolate(frame, [8, 44], [0, finalPercent], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dotPulse = 0.55 + Math.abs(Math.sin(frame / 7)) * 0.45;

  return (
    <AbsoluteFill>
      <NavyGrid theme={theme} />
      <svg
        width={CLOCK_R * 2 + 40}
        height={CLOCK_R * 2 + 40}
        style={{
          position: "absolute",
          left: CLOCK_CX - CLOCK_R - 20,
          top: CLOCK_CY - CLOCK_R - 20,
          opacity: clockEnter,
          transform: `scale(${interpolate(clockEnter, [0, 1], [0.85, 1])})`,
          transformOrigin: "center center",
        }}
      >
        <g transform={`translate(${CLOCK_R + 20}, ${CLOCK_R + 20})`}>
          <circle r={CLOCK_R} fill="rgba(15,26,46,0.6)" stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30 - 90) * (Math.PI / 180);
            return (
              <line
                key={i}
                x1={Math.cos(a) * (CLOCK_R - 18)}
                y1={Math.sin(a) * (CLOCK_R - 18)}
                x2={Math.cos(a) * (CLOCK_R - 6)}
                y2={Math.sin(a) * (CLOCK_R - 6)}
                stroke={i % 3 === 0 ? t.white : "rgba(255,255,255,0.45)"}
                strokeWidth={i % 3 === 0 ? 4 : 2}
                strokeLinecap="round"
              />
            );
          })}
          <line
            x1={0}
            y1={0}
            x2={Math.cos((minuteAngle * Math.PI) / 180) * (CLOCK_R - 60)}
            y2={Math.sin((minuteAngle * Math.PI) / 180) * (CLOCK_R - 60)}
            stroke={t.white}
            strokeWidth={6}
            strokeLinecap="round"
          />
          <line
            x1={0}
            y1={0}
            x2={Math.cos((handAngle * Math.PI) / 180) * (CLOCK_R - 30)}
            y2={Math.sin((handAngle * Math.PI) / 180) * (CLOCK_R - 30)}
            stroke={t.accent}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.9}
          />
          <circle r={9} fill={t.accent} />
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 1290,
          height: 8,
          background: "rgba(255,255,255,0.12)",
          borderRadius: 4,
          opacity: clockEnter,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressP * 100}%`,
            background: t.accent,
            borderRadius: 4,
            boxShadow: `0 0 18px ${t.accent}`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1310,
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 22,
          fontWeight: 600,
          color: t.soft,
          letterSpacing: 2,
          textTransform: "uppercase",
          opacity: clockEnter,
        }}
      >
        {Math.round(progressP * 100)}%  ·  {caption}
      </div>
      <div
        style={{
          position: "absolute",
          left: CLOCK_CX + CLOCK_R - 20,
          top: CLOCK_CY - CLOCK_R - 10,
          width: 28,
          height: 28,
          borderRadius: 14,
          background: t.accent,
          opacity: dotPulse * clockEnter,
          boxShadow: `0 0 ${30 * dotPulse}px ${t.accent}`,
        }}
      />
    </AbsoluteFill>
  );
};
