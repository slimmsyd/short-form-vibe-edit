// NetworkNodes — asymmetric scattered nodes drift via deterministic
// pseudo-noise; edges draw on between them via stroke-dashoffset.
// Layout is intentionally off-center to break the centered-card pattern.
// Uses BlueprintGrid background, not NavyGrid.
//
// Use when transcript hits connections, ecosystem, network, "everyone using
// it", "all of this is connected", users.

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { BlueprintGrid, withTheme, hexToRgba, type Theme } from "./shared";

export type NetworkNodesProps = {
  label?: string;
  caption?: string;
  theme?: Partial<Theme>;
};

// deterministic pseudo-noise: cheap, no external deps
function pnoise(seed: number, frame: number): number {
  const a = Math.sin(seed * 12.9898 + frame * 0.06) * 43758.5453;
  return a - Math.floor(a); // 0..1
}
function drift(seed: number, frame: number, amp: number): number {
  return (pnoise(seed, frame) - 0.5) * 2 * amp;
}

type Node = {
  id: number;
  x: number;
  y: number;
  r: number;
  popAt: number;
  driftSeed: number;
  hot?: boolean;
};

const NODES: Node[] = [
  { id: 1, x: 220, y: 760, r: 48, popAt: 4, driftSeed: 11 },
  { id: 2, x: 480, y: 660, r: 64, popAt: 10, driftSeed: 23, hot: true },
  { id: 3, x: 760, y: 800, r: 50, popAt: 16, driftSeed: 31 },
  { id: 4, x: 320, y: 980, r: 44, popAt: 22, driftSeed: 43 },
  { id: 5, x: 620, y: 1080, r: 56, popAt: 28, driftSeed: 51 },
  { id: 6, x: 880, y: 1100, r: 40, popAt: 34, driftSeed: 67 },
  { id: 7, x: 180, y: 1140, r: 38, popAt: 40, driftSeed: 79 },
];

// edges: pairs of node ids, with a draw-start frame
const EDGES: Array<[number, number, number]> = [
  [2, 1, 36],
  [2, 3, 44],
  [2, 4, 52],
  [2, 5, 60],
  [5, 6, 68],
  [4, 7, 76],
  [1, 4, 80],
];

export const NetworkNodes: React.FC<NetworkNodesProps> = ({
  label = "CONNECTED",
  caption = "everyone is using it",
  theme,
}) => {
  const t = withTheme(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOpacity = Math.min(1, Math.max(0, (frame - 0) / 14));

  // Compute live (drifted) positions
  const positions: Record<number, { x: number; y: number }> = {};
  for (const n of NODES) {
    positions[n.id] = {
      x: n.x + drift(n.driftSeed, frame, 6),
      y: n.y + drift(n.driftSeed + 100, frame, 6),
    };
  }

  return (
    <AbsoluteFill>
      <BlueprintGrid theme={theme} />

      {/* small label, top-left aligned (asymmetric) */}
      <div
        style={{
          position: "absolute",
          top: 510,
          left: 90,
          fontFamily: "Inter, sans-serif",
          fontWeight: 800,
          fontSize: 64,
          letterSpacing: 6,
          color: t.accent,
          opacity: labelOpacity,
          transform: `translateY(${(1 - labelOpacity) * 18}px)`,
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: "absolute",
          top: 600,
          left: 90,
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontSize: 26,
          color: hexToRgba(t.white, 0.65),
          opacity: labelOpacity,
        }}
      >
        // {caption}
      </div>

      {/* SVG layer for edges + nodes */}
      <svg
        style={{ position: "absolute", inset: 0 }}
        width="1080"
        height="1920"
        viewBox="0 0 1080 1920"
      >
        {/* edges */}
        {EDGES.map(([a, b, startAt], i) => {
          const pa = positions[a];
          const pb = positions[b];
          if (!pa || !pb) return null;
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          // draw-on via stroke-dashoffset
          const drawT = Math.min(
            1,
            Math.max(0, (frame - startAt) / 14)
          );
          return (
            <line
              key={i}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={hexToRgba(t.accent, 0.7)}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={len}
              strokeDashoffset={(1 - drawT) * len}
            />
          );
        })}

        {/* nodes */}
        {NODES.map((n) => {
          const p = positions[n.id];
          const enter = Math.min(1, Math.max(0, (frame - n.popAt) / 12));
          const eased = enter < 1 ? 1 - Math.pow(1 - enter, 3) : 1; // easeOutCubic
          const r = n.r * eased;
          const pulseR =
            r + (n.hot ? Math.sin(frame * 0.15) * 4 : 0);
          return (
            <g key={n.id} opacity={eased}>
              {/* outer glow ring */}
              {n.hot && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={pulseR + 22}
                  fill="none"
                  stroke={t.accent}
                  strokeWidth={1.5}
                  opacity={0.35 + Math.sin(frame * 0.15) * 0.1}
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={pulseR}
                fill={n.hot ? t.accent : "#0F1A2E"}
                stroke={n.hot ? t.accent : t.accent}
                strokeWidth={n.hot ? 0 : 3}
              />
              {/* inner dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={pulseR * 0.32}
                fill={n.hot ? "#0A0A0A" : t.accent}
              />
            </g>
          );
        })}
      </svg>

      {/* count badge in lower-right */}
      <div
        style={{
          position: "absolute",
          bottom: 380,
          right: 90,
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontSize: 28,
          color: hexToRgba(t.white, 0.85),
          opacity: Math.min(1, Math.max(0, (frame - 70) / 16)),
          textAlign: "right",
        }}
      >
        nodes: {NODES.length}
        <br />
        edges: {EDGES.length}
      </div>
    </AbsoluteFill>
  );
};

export default NetworkNodes;
