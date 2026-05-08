# Why OffthreadVideo, not Video

`<Video>` from `remotion` uses Chromium's HTML `<video>` element to play and capture frames. `<OffthreadVideo>` uses an ffmpeg subprocess to extract specific frames directly from the source mp4.

For deterministic, glitch-free rendering, **always use `<OffthreadVideo>`** in this skill.

## Symptoms of using `<Video>` (bad)

- Sydney's face stutters / jitters during certain windows
- Subtle frame jumps that feel "uncanny" but you can't isolate
- Glitch worsens when other animated layers (motion graphics, overlays) composite above the video
- Glitch comes and goes between renders even with the same input — non-deterministic

## Why `<Video>` glitches

Per-frame, Remotion has to:
1. Seek the HTML `<video>` element to the exact timestamp
2. Wait for Chromium to decode and paint the frame
3. Screenshot

This pipeline:
- Depends on Chromium's compositor scheduling (non-deterministic)
- Can be disturbed by other layer changes (overlays composite ➜ video re-promotes/demotes)
- Frame-accurate seeking depends on source GOP structure (B-frames make it slow/imprecise)

## Why `<OffthreadVideo>` works

Per-frame, Remotion shells out to ffmpeg:
1. `ffmpeg -ss <exact-timestamp> -frames:v 1 -f image2pipe ...`
2. Receives a single rasterized frame back
3. Composites it as a regular `<img>` element

This pipeline is:
- Deterministic (ffmpeg always extracts the same frame for the same timestamp)
- Independent of Chromium's video pipeline
- Unaffected by what other layers do above it

## Performance

OffthreadVideo is 2-3x slower than `<Video>` per frame because of the ffmpeg subprocess overhead. For a 90s video at 30fps that's ~9 minutes vs ~3 minutes. Worth it — the time saved chasing render glitches dwarfs the extra render time.

## Drop-in replacement

Same API. Just swap the import:

```tsx
// Before (don't use):
import { Video } from "remotion";
<Video src={src} style={{ width: "100%", height: "100%" }} />

// After (do use):
import { OffthreadVideo } from "remotion";
<OffthreadVideo src={src} style={{ width: "100%", height: "100%" }} />
```

All other props (`muted`, `volume`, `playbackRate`, `trimBefore`, `trimAfter`) work identically.

## Edge cases

- **No `loop` prop on OffthreadVideo.** If you need to loop the source, use `trimBefore` / `trimAfter` and place inside multiple `<Sequence>`s.
- **Audio is still extracted**, so you don't need a separate `<Audio>` element — same as `<Video>`.
