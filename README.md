# short-form-vibe-edit

Convert any single talking-head video into a polished captioned vertical short, with motion-graphic b-roll punches that match what's being said.

## Quick start

```bash
# 1. Bootstrap a workspace
node ~/.claude/skills/short-form-vibe-edit/scripts/setup-project.mjs ~/Desktop/MyVideo.mov

# 2. Transcode + transcribe
node ~/.claude/skills/short-form-vibe-edit/scripts/transcribe.mjs ~/Desktop/MyVideo-vibe-edit/

# 3. Plan scenes
node ~/.claude/skills/short-form-vibe-edit/scripts/plan-scenes.mjs ~/Desktop/MyVideo-vibe-edit/

# 4. (Claude reads scenes.json and motion-library/catalog.json, fills in motion choices)

# 5. Render
node ~/Desktop/MyVideo-vibe-edit/scripts/render.mjs
```

Output lands at `~/Desktop/MyVideo-vibe-edit.mp4` plus inside the project's `out/`.

When invoked through Claude Code (the skill is auto-loaded), Claude orchestrates all steps.

## What you get

- 1080×1920 @ 30fps, H.264, AAC stereo
- TikTok/Reels-style word-pop captions in the middle-third
- 12 alternating speaker/b-roll scenes, ~7.5s each, with 4-second b-roll punches
- Each b-roll moment is a Remotion-coded motion graphic (no AI image generation)
- Brand palette / font driven by JSON preset

## Library of motion graphics

Six built-in templates that cover most common short-form b-roll needs:

- **ChartConvergence** — opportunity / arbitrage / matching
- **Timeline** — experience / history / journey
- **ProblemSolution** — before-after / chaos to clarity
- **BrowserBuilds** — building software / shipping product
- **ClockProgress** — waiting / pending / anticipation
- **TierStack** — scope / capability tiers / scale

When none fit, write a custom in your project's `src/broll-custom/`. See `docs/custom-scenes.md`.

## Brand presets

- `navy-gold` (default) — editorial, financial, premium
- `high-contrast` — pure black + electric green, dev/hacker
- `pastel` — soft cream + dusty pink, lifestyle/wellness

Switch via `--preset <name>` flag on `setup-project.mjs`. Add new presets by dropping a JSON file in `presets/`.

## Locked-in rules (each was earned through a broken render)

- Source must be transcoded with the recipe in `docs/transcoding.md` (`-bf 0`, `-preset slow`, `-pix_fmt yuv420p` are all critical)
- Use `<OffthreadVideo>` not `<Video>` (see `docs/offthreadvideo.md`)
- Composition fps = source fps (don't bump to 60)
- No per-frame transform on `<OffthreadVideo>` (static `translateZ(0)` on wrapper is OK)
- Captions in middle-third with active-word scale-pop (see `docs/caption-rules.md`)

## Dependencies

- `ffmpeg` (install: `brew install ffmpeg`)
- `whisper` (install: `pip install openai-whisper`)
- `node` 18+ and `npm`

## Status

Built from a real Sydney-brand-video edit (8 render iterations to find the locked-in rules). Tested on a 540×960 source transcoded to 1080×1920 vertical. Should generalize to any 9:16-targetable source between ~30s and ~3min.
