// SplitWipe — true split-screen with a hard vertical divider that wipes from
// the center outward. Left half = "before", right half = "after". Each side
// gets its own background tint + label + glyph. Replaces ProblemSolution for
// strict before/after comparisons. Motion grammar = wipe interpolation, not
// spring.
//
// Use when transcript hits before/after, vs, then/now, A/B, two paths.

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { withTheme, hexToRgba, type Theme, W, H } from "./shared";

export type SplitWipeProps = {
  leftLabel?: string;
  rightLabel?: string;
  leftGlyph?: string;
  rightGlyph?: string;
  theme?: Partial<Theme>;
};

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export const SplitWipe: React.FC<SplitWipeProps> = ({
  leftLabel = "BEFORE",
  rightLabel = "AFTER",
  leftGlyph = "✕",
  rightGlyph = "✓",
  theme,
}) => {
  const t = withTheme(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stage 1 (frames 0-30): left half slides in from left, right half from right.
  // Stage 2 (frames 30-60): the hairline divider widens to a glowing strip.
  // Stage 3 (frames 60+): labels and glyphs settle in with a slight overshoot.

  const leftEnter = easeInOutCubic(
    Math.min(1, Math.max(0, (frame - 0) / 26))
  );
  const rightEnter = easeInOutCubic(
    Math.min(1, Math.max(0, (frame - 6) / 26))
  );

  const dividerWidth = interpolate(frame - 28, [0, 18], [2, 14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dividerGlow = interpolate(frame - 28, [0, 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelsT = Math.min(1, Math.max(0, (frame - 50) / 18));
  const labelsEased = easeInOutCubic(labelsT);

  // Glyph kickback: scales above 1 then settles
  const glyphKick = (delay: number) => {
    const x = Math.min(1, Math.max(0, (frame - delay) / 22));
    if (x <= 0) return 0;
    if (x >= 1) return 1 + Math.sin((frame - delay - 22) * 0.2) * 0.012;
    // overshoot
    return 1 + 0.3 * Math.sin(x * Math.PI);
  };

  const leftBg = "#1A0E14"; // muted maroon — failure side
  const rightBg = "#0A1F18"; // deep teal — success side

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* LEFT HALF */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W / 2,
          height: H,
          background: leftBg,
          transform: `translateX(${(1 - leftEnter) * -W * 0.5}px)`,
        }}
      >
        {/* failure-side hatching */}
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(135deg, rgba(255,90,90,0.06) 0 14px, transparent 14px 28px)`,
            opacity: leftEnter,
          }}
        />
        {/* label */}
        <div
          style={{
            position: "absolute",
            top: 600,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            fontSize: 36,
            letterSpacing: 8,
            color: hexToRgba("#FF8A8A", 0.85),
            opacity: labelsEased,
            transform: `translateY(${(1 - labelsEased) * 12}px)`,
          }}
        >
          {leftLabel}
        </div>
        {/* glyph */}
        <div
          style={{
            position: "absolute",
            top: 720,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            fontWeight: 900,
            fontSize: 320,
            color: "#E04545",
            transform: `scale(${glyphKick(58)})`,
            opacity: Math.min(1, glyphKick(58)),
            lineHeight: 1,
            textShadow: `0 0 60px rgba(224,69,69,0.45)`,
          }}
        >
          {leftGlyph}
        </div>
      </div>

      {/* RIGHT HALF */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: W / 2,
          height: H,
          background: rightBg,
          transform: `translateX(${(1 - rightEnter) * W * 0.5}px)`,
        }}
      >
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, rgba(61,214,140,0.07) 0 14px, transparent 14px 28px)`,
            opacity: rightEnter,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 600,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            fontSize: 36,
            letterSpacing: 8,
            color: t.accent,
            opacity: labelsEased,
            transform: `translateY(${(1 - labelsEased) * 12}px)`,
          }}
        >
          {rightLabel}
        </div>
        <div
          style={{
            position: "absolute",
            top: 720,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            fontWeight: 900,
            fontSize: 320,
            color: "#3DD68C",
            transform: `scale(${glyphKick(64)})`,
            opacity: Math.min(1, glyphKick(64)),
            lineHeight: 1,
            textShadow: `0 0 70px rgba(61,214,140,0.5)`,
          }}
        >
          {rightGlyph}
        </div>
      </div>

      {/* DIVIDER */}
      <div
        style={{
          position: "absolute",
          left: W / 2 - dividerWidth / 2,
          top: 0,
          width: dividerWidth,
          height: H,
          background: t.accent,
          boxShadow: `0 0 ${40 * dividerGlow}px ${hexToRgba(t.accent, 0.6 * dividerGlow)}`,
        }}
      />

      {/* center "→" badge that rides the divider */}
      <div
        style={{
          position: "absolute",
          left: W / 2,
          top: 1200,
          transform: `translate(-50%, -50%) scale(${labelsEased})`,
          opacity: labelsEased,
          width: 140,
          height: 140,
          borderRadius: 70,
          background: t.accent,
          color: "#0A0A0A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
          fontWeight: 900,
          fontSize: 96,
          boxShadow: `0 0 60px ${hexToRgba(t.accent, 0.45)}`,
        }}
      >
        →
      </div>
    </AbsoluteFill>
  );
};

export default SplitWipe;
