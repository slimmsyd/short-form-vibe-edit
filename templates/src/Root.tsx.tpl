import { Composition, staticFile } from "remotion";
import {
  Vertical,
  type VerticalProps,
  type ResolvedScene,
  type ResolvedAsset,
} from "./Vertical";
import captions from "../captions.json";
import brollScenes from "../scenes.resolved.json";
import assets from "../assets.resolved.json";
import type { Caption } from "@remotion/captions";

// fps must match source fps. Bumping causes underlying video to judder.
const FPS = {{fps}};
const SOURCE_DURATION_S = {{durationS}};
const DURATION_IN_FRAMES = Math.ceil(SOURCE_DURATION_S * FPS);

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Vertical"
      component={Vertical}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={{{width}}}
      height={{{height}}}
      defaultProps={{
        videoSrc: staticFile("source.mp4"),
        captions: captions as Caption[],
        brollScenes: brollScenes as ResolvedScene[],
        assets: assets as ResolvedAsset[],
      } satisfies VerticalProps}
    />
  );
};
