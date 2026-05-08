# Transcoding recipe

Every source video must be transcoded with this exact recipe before Remotion renders against it. Skipping any of these flags causes visible glitches in the output mp4.

```bash
ffmpeg -i raw.mov \
  -c:v libx264 \
  -preset slow \
  -crf 16 \
  -pix_fmt yuv420p \
  -profile:v high \
  -bf 0 \
  -g 30 \
  -movflags +faststart \
  -c:a aac \
  -b:a 192k \
  public/source.mp4
```

## Why each flag

- `-c:v libx264` — H.264 video. Most compatible, hardware-accelerated everywhere.
- `-preset slow` — better compression efficiency at same CRF. `veryfast` introduces visible block artifacts in flat scenes.
- `-crf 16` — visually lossless quality. Output ~3x larger than CRF 23 but still small enough for Remotion ingest.
- `-pix_fmt yuv420p` — most-compatible chroma sampling. Some Chromium configurations can't decode yuv422/444.
- `-profile:v high` — explicitly the high profile, max compatibility.
- `-bf 0` — **CRITICAL**. Disables B-frames. B-frames require Chromium to seek backward to decode, which causes stutter when Remotion frame-steps. This flag alone kills the most common "rendered video stutters" bug.
- `-g 30` — keyframe every 30 frames (1 second at 30fps). Fast seeking with reasonable file size. Going to `-g 1` (every frame is a keyframe) is overkill once you're using OffthreadVideo.
- `-movflags +faststart` — moves moov atom to the start so QuickTime / web players can begin streaming before full download.
- `-c:a aac -b:a 192k` — sane audio defaults.

## What used to break

| Flag missing | Symptom |
|---|---|
| `-bf 0` | Underlying video judders during b-roll fade transitions (the "v2 glitch") |
| `-pix_fmt yuv420p` | Some Chromium versions render only the Y channel (greyscale or wrong colors) |
| `-preset slow` (using veryfast instead) | Block artifacts visible in flat / dark scenes |
| `-c:v libx264` (using HEVC) | Chromium can't decode HEVC at all in headless rendering |

## Why do this even though we use OffthreadVideo

`<OffthreadVideo>` uses ffmpeg subprocess to extract frames, so it's far more tolerant than `<Video>`. But:
- The output mp4 is still the cleanest form to work with downstream
- Whisper transcribes a clean WAV extracted from this transcode → tighter word timing
- Re-encoding the source once eliminates an entire category of "weird source file" bugs
