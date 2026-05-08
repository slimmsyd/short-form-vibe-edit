// BrowserBuilds — a browser-window chrome assembles, then UI components fade
// in inside (header, sidebar, content card with chart, action button).
// Generic shapes only — no fake brand names, no fake logos.
//
// Use when transcript mentions: build a web app, ship a product, deploy,
// dashboard, software, web interface, prototype, MVP.

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { NavyGrid, withTheme, type Theme } from "./shared";

const BROWSER_X = 90;
const BROWSER_Y = 700;
const BROWSER_W = 900;
const BROWSER_H = 560;

const componentEnter = (frame: number, fps: number, popFrame: number) =>
  spring({
    frame: Math.max(0, frame - popFrame),
    fps,
    config: { damping: 18, mass: 0.55, stiffness: 200 },
  });

export type BrowserBuildsProps = {
  buttonLabel?: string;
  theme?: Partial<Theme>;
};

export const BrowserBuilds: React.FC<BrowserBuildsProps> = ({
  buttonLabel = "Deploy",
  theme,
}) => {
  const t = withTheme(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chromeP = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const chromeScale = interpolate(chromeP, [0, 1], [0.92, 1]);
  const headerE = componentEnter(frame, fps, 22);
  const sidebar1E = componentEnter(frame, fps, 32);
  const sidebar2E = componentEnter(frame, fps, 42);
  const cardE = componentEnter(frame, fps, 54);
  const buttonE = componentEnter(frame, fps, 68);

  return (
    <AbsoluteFill>
      <NavyGrid theme={theme} />
      <div
        style={{
          position: "absolute",
          left: BROWSER_X,
          top: BROWSER_Y,
          width: BROWSER_W,
          height: BROWSER_H,
          background: "rgba(15,26,46,0.85)",
          border: "1.5px solid rgba(255,255,255,0.12)",
          borderRadius: 18,
          opacity: chromeP,
          transform: `scale(${chromeScale})`,
          transformOrigin: "center center",
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: 44,
            background: "rgba(255,255,255,0.05)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            paddingLeft: 18,
            gap: 8,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#FF5F57" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#FEBC2E" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#28C840" }} />
          <div
            style={{
              flex: 1,
              maxWidth: 320,
              marginLeft: 80,
              height: 22,
              background: "rgba(255,255,255,0.07)",
              borderRadius: 6,
            }}
          />
        </div>
        <div style={{ display: "flex", height: BROWSER_H - 44 }}>
          <div
            style={{
              width: 200,
              background: "rgba(0,0,0,0.18)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                height: 36,
                borderRadius: 8,
                background: t.accent,
                opacity: sidebar1E * 0.9,
                transform: `translateX(${interpolate(sidebar1E, [0, 1], [-20, 0])}px)`,
              }}
            />
            <div
              style={{
                height: 36,
                borderRadius: 8,
                background: "rgba(255,255,255,0.08)",
                opacity: sidebar2E * 0.7,
                transform: `translateX(${interpolate(sidebar2E, [0, 1], [-20, 0])}px)`,
              }}
            />
            <div
              style={{
                height: 36,
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                opacity: sidebar2E * 0.5,
                transform: `translateX(${interpolate(sidebar2E, [0, 1], [-20, 0])}px)`,
              }}
            />
          </div>
          <div style={{ flex: 1, padding: 24 }}>
            <div
              style={{
                height: 36,
                width: 280,
                borderRadius: 8,
                background: "rgba(255,255,255,0.85)",
                opacity: headerE,
                transform: `translateY(${interpolate(headerE, [0, 1], [-12, 0])}px)`,
              }}
            />
            <div
              style={{
                height: 14,
                width: 200,
                marginTop: 14,
                borderRadius: 6,
                background: "rgba(255,255,255,0.4)",
                opacity: headerE,
              }}
            />
            <div
              style={{
                marginTop: 28,
                padding: 22,
                borderRadius: 14,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                opacity: cardE,
                transform: `translateY(${interpolate(cardE, [0, 1], [16, 0])}px)`,
              }}
            >
              <div style={{ height: 14, width: 110, background: t.soft, borderRadius: 5, marginBottom: 16 }} />
              <svg width="100%" height={120} viewBox="0 0 460 120">
                <polyline
                  points="0,90 60,80 120,70 180,55 240,40 300,30 360,18 420,8"
                  fill="none"
                  stroke={t.accent}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={1000}
                  strokeDashoffset={1000 - cardE * 1000}
                />
                <line x1="0" y1="115" x2="460" y2="115" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
              </svg>
            </div>
            <div
              style={{
                marginTop: 24,
                display: "inline-block",
                padding: "12px 24px",
                borderRadius: 10,
                background: t.accent,
                color: t.bg,
                fontWeight: 800,
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: 18,
                opacity: buttonE,
                transform: `scale(${interpolate(buttonE, [0, 1], [0.85, 1])})`,
              }}
            >
              {buttonLabel}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
