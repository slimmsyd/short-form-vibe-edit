// Short-form vibe edit composition.
// Hard rules (locked-in via the skill):
// - <OffthreadVideo> not <Video>
// - No per-frame transform on the video element (static translateZ(0) is OK)
// - Captions in middle-third (top:1180); active word: scale 1.12 + accent
// - Min caption page: 12 frames (400ms @ 30fps)

import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { useMemo } from "react";
import {
  createTikTokStyleCaptions,
  type Caption,
  type TikTokPage,
} from "@remotion/captions";
import { loadFont } from "@remotion/google-fonts/{{fontFamily}}";
import { LIBRARY, type Theme } from "./broll-registry";

const { fontFamily } = loadFont("normal", {
  weights: ["{{captionFontWeight}}", "900"],
  subsets: ["latin"],
});

// Brand palette (from preset {{presetName}})
export const THEME: Theme = {
  bg: "{{bg}}",
  accent: "{{accent}}",
  navy: "{{navy}}",
  white: "#FFFFFF",
  red: "#E04545",
  green: "#3DD68C",
  soft: "rgba(255,255,255,0.85)",
};

const ACCENT = THEME.accent;
const BG = THEME.bg;
const COMBINE_MS = 1100;
const MIN_PAGE_FRAMES = 12;

export type ResolvedScene = {
  i: number;
  startMs: number;
  endMs: number;
  type: "broll";
  theme: string;
  keyword?: string;
  motion: string;
  motionProps?: Record<string, unknown>;
  coverDurationMs?: number;
};

export type ResolvedAsset = {
  id: string;
  path: string;
  startMs: number;
  endMs: number;
  mode: "full" | "pip" | "corner";
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  entry: "fade" | "scale-pop" | "slide-left" | "slide-right";
};

export type VerticalProps = {
  videoSrc: string;
  captions: Caption[];
  brollScenes: ResolvedScene[];
  assets: ResolvedAsset[];
};

export const Vertical: React.FC<VerticalProps> = ({
  videoSrc,
  captions,
  brollScenes,
  assets,
}) => {
  const { fps } = useVideoConfig();

  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions,
        combineTokensWithinMilliseconds: COMBINE_MS,
      }),
    [captions]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <VideoLayer src={videoSrc} />

      {/* B-roll covers (motion graphics) */}
      {brollScenes.map((s) => {
        const startFrame = Math.round((s.startMs / 1000) * fps);
        const fullWindowMs = s.endMs - s.startMs;
        const coverMs = Math.min(s.coverDurationMs ?? fullWindowMs, fullWindowMs);
        const durationFrames = Math.round((coverMs / 1000) * fps);
        if (durationFrames <= 0) return null;
        return (
          <Sequence
            key={`broll-${s.i}`}
            from={startFrame}
            durationInFrames={durationFrames}
            premountFor={fps}
            layout="none"
          >
            <BRollScene
              motion={s.motion}
              motionProps={s.motionProps}
              keyword={s.keyword}
            />
          </Sequence>
        );
      })}

      {/* Asset overlays — above b-roll, below captions */}
      {assets.map((a) => {
        const startFrame = Math.round((a.startMs / 1000) * fps);
        const durationFrames = Math.round(((a.endMs - a.startMs) / 1000) * fps);
        if (durationFrames <= 0) return null;
        return (
          <Sequence
            key={a.id}
            from={startFrame}
            durationInFrames={durationFrames}
            premountFor={fps}
            layout="none"
          >
            <AssetSlot asset={a} />
          </Sequence>
        );
      })}

      {/* Captions */}
      {pages.map((page, i) => {
        const startFrame = Math.round((page.startMs / 1000) * fps);
        const nextStartFrame = pages[i + 1]
          ? Math.round((pages[i + 1].startMs / 1000) * fps)
          : Number.POSITIVE_INFINITY;
        const naturalEnd =
          startFrame + Math.round((page.durationMs / 1000) * fps);
        const endFrame = Math.min(nextStartFrame, naturalEnd);
        const durationFrames = Math.max(MIN_PAGE_FRAMES, endFrame - startFrame);
        if (durationFrames <= 0) return null;
        return (
          <Sequence
            key={`p-${i}`}
            from={startFrame}
            durationInFrames={durationFrames}
            premountFor={fps}
            layout="none"
          >
            <CaptionPage page={page} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const BRollScene: React.FC<{
  motion: string;
  motionProps?: Record<string, unknown>;
  keyword?: string;
}> = ({ motion, motionProps, keyword }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const FADE = 6;
  const fadeIn = interpolate(frame, [0, FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - FADE, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = fadeIn * fadeOut;

  const tagEnter = spring({
    frame,
    fps,
    config: { damping: 16, mass: 0.6, stiffness: 200 },
  });
  const tagScale = interpolate(tagEnter, [0, 1], [0.85, 1]);
  const tagOpacity = interpolate(tagEnter, [0, 1], [0, 1]) * fadeOut;

  const Component = LIBRARY[motion];
  if (!Component) {
    return (
      <AbsoluteFill style={{ backgroundColor: BG, opacity }}>
        <div
          style={{
            color: "#FF5F57",
            fontFamily,
            padding: 40,
            fontSize: 36,
          }}
        >
          Unknown motion: {motion}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity }}>
      <Component theme={THEME} {...(motionProps ?? {})} />
      {keyword ? (
        <div
          style={{
            position: "absolute",
            top: 240,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: tagOpacity,
            transform: `scale(${tagScale})`,
            transformOrigin: "center center",
          }}
        >
          <span
            style={{
              display: "inline-block",
              padding: "14px 28px",
              background: ACCENT,
              color: BG,
              fontFamily,
              fontWeight: 900,
              fontSize: 64,
              letterSpacing: -1.4,
              borderRadius: 16,
              boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
              textTransform: "uppercase",
            }}
          >
            {keyword}
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const VideoLayer: React.FC<{ src: string }> = ({ src }) => {
  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        transform: "translateZ(0)",
        isolation: "isolate",
        backfaceVisibility: "hidden",
      }}
    >
      <OffthreadVideo
        src={src}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

const CaptionPage: React.FC<{ page: TikTokPage }> = ({ page }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame,
    fps,
    config: { damping: 22, mass: 0.5, stiffness: 220 },
  });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const y = interpolate(enter, [0, 1], [28, 0]);
  const localMs = (frame / fps) * 1000;
  const absoluteMs = page.startMs + localMs;

  return (
    <div
      style={{
        position: "absolute",
        top: 1180,
        left: 60,
        right: 60,
        textAlign: "center",
        opacity,
        transform: `translateY(${y}px)`,
        fontFamily,
        fontWeight: 900,
        fontSize: 96,
        lineHeight: 1.02,
        letterSpacing: -2,
        color: "white",
        textShadow:
          "0 4px 0 #000, 0 2px 14px rgba(0,0,0,0.85), 0 0 1px #000",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        textTransform: "uppercase",
      }}
    >
      {page.tokens.map((t, i) => (
        <Token key={i} token={t} absoluteMs={absoluteMs} />
      ))}
    </div>
  );
};

const Token: React.FC<{
  token: { text: string; fromMs: number; toMs: number };
  absoluteMs: number;
}> = ({ token, absoluteMs }) => {
  const isActive = token.fromMs <= absoluteMs && token.toMs > absoluteMs;
  const ACTIVE_RAMP_MS = 90;
  let activeP = 0;
  if (token.fromMs <= absoluteMs) {
    activeP = Math.min(1, (absoluteMs - token.fromMs) / ACTIVE_RAMP_MS);
  }
  const scale = isActive ? interpolate(activeP, [0, 1], [1.0, 1.12]) : 1.0;
  const color = isActive ? ACCENT : "white";
  return (
    <span
      style={{
        color,
        display: "inline-block",
        transform: `scale(${scale})`,
        transformOrigin: "center 60%",
        transition: "color 60ms linear",
      }}
    >
      {token.text}
    </span>
  );
};

// ===== Asset overlay =====

const AssetSlot: React.FC<{ asset: ResolvedAsset }> = ({ asset }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const FADE = 6;
  const fadeIn = interpolate(frame, [0, FADE], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - FADE, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Entry animation
  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 180 },
  });
  let entryStyle: React.CSSProperties = {};
  if (asset.entry === "scale-pop") {
    entryStyle = { transform: `scale(${interpolate(enterSpring, [0, 1], [0.7, 1])})` };
  } else if (asset.entry === "slide-left") {
    entryStyle = { transform: `translateX(${interpolate(enterSpring, [0, 1], [120, 0])}%)` };
  } else if (asset.entry === "slide-right") {
    entryStyle = { transform: `translateX(${interpolate(enterSpring, [0, 1], [-120, 0])}%)` };
  }

  const opacity = fadeIn * fadeOut * (asset.entry === "fade" ? enterSpring : 1);

  // Layout per mode
  const PAD = 60;
  let cardStyle: React.CSSProperties;
  if (asset.mode === "full") {
    cardStyle = { position: "absolute", inset: 0 };
  } else if (asset.mode === "pip") {
    // ~55% sized card, anchored to position
    const W = 600, H = 600;
    const top = asset.position.startsWith("top") ? PAD + 220 : 1920 - H - PAD - 100;
    const left = asset.position.endsWith("left") ? PAD : 1080 - W - PAD;
    cardStyle = { position: "absolute", top, left, width: W, height: H };
  } else {
    // corner — small badge
    const W = 360, H = 360;
    const top = asset.position.startsWith("top") ? PAD + 220 : 1920 - H - PAD - 80;
    const left = asset.position.endsWith("left") ? PAD : 1080 - W - PAD;
    cardStyle = { position: "absolute", top, left, width: W, height: H };
  }

  return (
    <div style={{ ...cardStyle, opacity, ...entryStyle, transformOrigin: "center center" }}>
      <Img
        src={staticFile(asset.path)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: asset.mode === "full" ? "cover" : "contain",
          borderRadius: asset.mode === "full" ? 0 : 24,
          boxShadow: asset.mode === "full" ? "none" : "0 30px 80px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
};
