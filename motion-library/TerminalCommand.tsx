// TerminalCommand — left-aligned monospace block on a dark scanline bg.
// A `$` prompt, a typed-in command (char by char), then output streams below
// with a blinking cursor. No NavyGrid, deliberately a different aesthetic.
//
// Use when transcript mentions code, commands, "run this", technical or
// CLI flavor, or to break a streak of NavyGrid-card scenes.

import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { TerminalBg, withTheme, hexToRgba, type Theme } from "./shared";

export type TerminalCommandProps = {
  command?: string;
  output?: string[];
  theme?: Partial<Theme>;
};

export const TerminalCommand: React.FC<TerminalCommandProps> = ({
  command = "claude.skill('edit')",
  output = ["▶ loading skill…", "✓ skill loaded", "→ output ready"],
  theme,
}) => {
  const t = withTheme(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // typing the command, char by char
  const charPerFrame = 1; // pretty fast
  const typeStart = 12;
  const typedChars = Math.max(
    0,
    Math.min(command.length, Math.floor((frame - typeStart) * charPerFrame))
  );
  const typed = command.slice(0, typedChars);
  const typingDone = typedChars >= command.length;
  const finishFrame = typeStart + Math.ceil(command.length / charPerFrame);

  // each output line streams in after typing completes
  const outputStartGap = 8;
  const outputLineGap = 12;
  const outputStart = finishFrame + outputStartGap;

  const cursorOn = Math.floor(frame / 14) % 2 === 0;

  return (
    <AbsoluteFill>
      <TerminalBg theme={theme} />

      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          top: 720,
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontSize: 56,
          fontWeight: 600,
          color: t.white,
          lineHeight: 1.4,
        }}
      >
        {/* prompt + command line */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <span style={{ color: t.accent }}>$</span>
          <span>
            {typed}
            {!typingDone && (
              <span
                style={{
                  display: "inline-block",
                  width: 24,
                  height: 56,
                  background: cursorOn ? t.accent : "transparent",
                  marginLeft: 2,
                  verticalAlign: "-8px",
                }}
              />
            )}
          </span>
        </div>

        {/* output lines stream in */}
        <div style={{ marginTop: 50, fontSize: 44, color: hexToRgba(t.white, 0.78) }}>
          {output.map((line, i) => {
            const t0 = outputStart + i * outputLineGap;
            const localT = Math.min(
              1,
              Math.max(0, interpolate(frame - t0, [0, 10], [0, 1]))
            );
            return (
              <div
                key={i}
                style={{
                  opacity: localT,
                  transform: `translateY(${(1 - localT) * 14}px)`,
                  marginTop: i === 0 ? 0 : 16,
                  color:
                    line.startsWith("✓")
                      ? "#3DD68C"
                      : line.startsWith("✗")
                      ? "#E04545"
                      : line.startsWith("→")
                      ? t.accent
                      : hexToRgba(t.white, 0.78),
                }}
              >
                {line}
              </div>
            );
          })}

          {/* trailing prompt cursor after all output lines */}
          {(() => {
            const tailStart = outputStart + output.length * outputLineGap + 8;
            if (frame < tailStart) return null;
            return (
              <div
                style={{
                  marginTop: 28,
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  color: t.white,
                }}
              >
                <span style={{ color: t.accent }}>$</span>
                <span
                  style={{
                    display: "inline-block",
                    width: 24,
                    height: 56,
                    background: cursorOn ? t.accent : "transparent",
                  }}
                />
              </div>
            );
          })()}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default TerminalCommand;
