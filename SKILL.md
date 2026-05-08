---
name: short-form-vibe-edit
description: |
  Edit a single talking-head video (or screen recording) into a polished
  vertical short-form cut for Reels / TikTok / Shorts. Pipeline: transcode →
  whisper transcribe → segment into 12 scenes alternating speaker/b-roll →
  match each b-roll window to a motion graphic from the library (or write a
  custom one) → render captioned 1080×1920 mp4 via Remotion. Captions are
  TikTok-style word-pop, middle-third, brand font. Use when user says "edit
  this video", "make a reel", "vertical short", "captions and b-roll", or
  references a .mov/.mp4 file as the source. Adapted from AI Aidan's
  "vibe editing" workflow with battle-tested fixes for video glitch
  (OffthreadVideo, transcode recipe) and caption legibility.
---

# Short-Form Vibe Edit

Convert a single source video into a captioned vertical short with motion-graphic b-roll.

## Activation

Use this skill when:
- User says "edit this video", "make a reel/tiktok/short", "add captions"
- User references a .mov, .mp4, .mkv file as source for short-form content
- User invokes `/short-form-vibe-edit <path>`

## Hard architectural rules (locked-in lessons)

These are non-negotiable because each one was earned through a render that broke. Do not deviate:

1. **Use `<OffthreadVideo>` from `remotion`, not `<Video>`.** OffthreadVideo extracts frames via ffmpeg subprocess — frame-perfect deterministic. Plain `<Video>` uses Chromium's HTML video element and produces visible jitter when overlays composite above it.
2. **Composition fps must match source fps.** If source is 30fps, render at 30fps. Bumping to 60fps causes 2× frame duplication that reads as judder.
3. **Source must be transcoded with this exact recipe before Remotion sees it:**
   ```bash
   ffmpeg -i raw -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p \
     -profile:v high -bf 0 -g 30 -movflags +faststart \
     -c:a aac -b:a 192k public/source.mp4
   ```
   `-bf 0` (no B-frames), `-pix_fmt yuv420p`, `-preset slow` are all critical — skipping any one produces visible artifacts.
4. **Never apply per-frame CSS transform on `<OffthreadVideo>`.** Static `transform: translateZ(0)` on the wrapper IS allowed (forces stable GPU layer); per-frame `scale()` / `translate()` interpolations are NOT.
5. **Captions must be in middle-third of frame** (top: 1100–1400 for 1080×1920). Phone UI chrome (TikTok comment button, Reels icons) covers the lower 25%.
6. **Active word in captions must scale to ~1.12× and shift to brand accent color** — color-only swap is too weak.
7. **Min caption page duration: 12 frames (400ms @ 30fps).** Shorter pages flicker.

## Pipeline overview

For an input at `<src-path>` (e.g. `~/Desktop/MyVideo.mov`):

```
<src-path>
  ↓ transcode (ffmpeg, locked recipe)
<workspace>/public/source.mp4
  ↓ extract audio
<workspace>/audio.wav
  ↓ whisper base.en --word_timestamps
<workspace>/audio.json
  ↓ split into 12 scenes alternating B/S, snap to word ends
<workspace>/scenes.json   ← each broll scene has spoken words but no motion picked yet
  ↓ AGENT (you, Claude) reads each broll scene and picks motion-library template
  ↓ OR writes a custom in src/broll-custom/
<workspace>/scenes.json   ← now has "motion": "Timeline" or "motion": "custom:Foo" per scene
  ↓ resolve + render (Remotion)
<workspace>/out/<src-name>-vertical.mp4
  → copy to ~/Desktop/<src-name>-vertical.mp4
```

## Step-by-step procedure

### Step 1 — Verify dependencies

```bash
which ffmpeg ffprobe whisper node npx
```

If any are missing, instruct the user to install them. Whisper specifically: `pip install openai-whisper`. ffmpeg: `brew install ffmpeg`. Stop if anything is missing.

### Step 2 — Bootstrap workspace

```bash
node ~/.claude/skills/short-form-vibe-edit/scripts/setup-project.mjs <src-path> [--preset navy-gold]
```

This creates `<workspace>` (defaults to `<src-dir>/<src-basename>-vibe-edit/`), copies templates, runs `npm install` for Remotion deps, and writes a `project.json` with the chosen preset.

### Step 3 — Transcode + transcribe

```bash
node ~/.claude/skills/short-form-vibe-edit/scripts/transcribe.mjs <workspace>
```

Runs the locked ffmpeg recipe → `public/source.mp4` and `audio.wav`. Then runs whisper (base.en by default; configurable in project.json) → `audio.json` with word-level timestamps.

### Step 4 — Plan scenes

```bash
node ~/.claude/skills/short-form-vibe-edit/scripts/plan-scenes.mjs <workspace>
```

Splits the source duration into N scenes (default 12) alternating broll/sydney, snapping boundaries to word ends. Writes `scenes.json` with each broll scene including its spoken words but with `motion: null` (to be filled by you).

### Step 4.5 — Vet captions (optional, recommended)

Whisper makes regular transcription errors. The `vet-captions` UI lets the user fix them in a browser, with the audio embedded for listening alongside.

```bash
node ~/.claude/skills/short-form-vibe-edit/scripts/vet-captions.mjs <workspace>
```

This:
- Spins up a local web UI on `localhost:7321` (auto-opens browser on macOS)
- Shows each whisper-detected word with its audio timestamp, original text, an editable text field, and a confidence pill (red = <50%, amber = 50-85%, green = >85%)
- Lets the user replay any word's audio window with a ▶ button
- Has a Find/Replace bar for common bulk fixes ("Asian" → "AI")
- On "Save & Close": writes corrected captions back to `captions.json` (timestamps preserved; only text changes), backs up the original to `captions.json.bak`, and shuts the server down

Skip this step if the transcript already looks correct in `captions.json`. Recommend it whenever a brand-critical word might be mis-heard.

### Step 5 — Match motion (this is YOUR job, agent)

There are TWO modes. Pick based on user intent and content:

#### Mode A — Library matching (default, fast)

For each broll scene in `scenes.json`:

1. Read the `words` field — what's spoken in that 4-second window.
2. Read `~/.claude/skills/short-form-vibe-edit/motion-library/catalog.json` — the available templates.
3. Pick the best match by name (e.g. `"Timeline"`).
4. Write to scene's `motion` field. Optionally set `motionProps` to customize labels.

#### Mode B — Unique customs (every scene bespoke)

Use when user says "make every scene unique," "more variety," "I'm tired of the same templates," or it's a brand/hero video where stock-feel is unacceptable.

For each broll scene:

1. Read the `words` field.
2. Use library catalog as INSPIRATION for visual vocabulary, not as a menu.
3. Write a bespoke component at `<workspace>/src/broll-custom/SceneNN_<DescriptiveName>.tsx`. Pick a name that describes the visual motif (e.g. `Scene01_LeakyFunnel`, not `Scene01_Generic`). Use `NavyGrid` and `withTheme()` from `../.broll-library/shared` for brand cohesion. Motion completes by frame ~110.
4. Set `scene.motion = "custom:Scene01_LeakyFunnel"`.

`render.mjs` auto-discovers all `.tsx` files in `src/broll-custom/` and adds them to the per-project registry — no manual registration needed.

See `docs/unique-mode.md` for full guidance.

#### Hybrid (some library, some custom)

Mix freely. Library entry for scenes that map cleanly, custom for ones that don't. This is often the best balance.

After all broll scenes have a `motion`, the file is render-ready.

### Step 6 — Resolve + render

```bash
node ~/.claude/skills/short-form-vibe-edit/scripts/render.mjs <workspace>
```

This:
- Generates `src/broll/registry.tsx` that imports both library components AND any `src/broll-custom/*.tsx` files
- Runs `npx remotion render` with the locked CRF/bitrate/codec settings
- Copies the result to `~/Desktop/<src-name>-vertical.mp4`

### Step 7 — Report

Tell the user:
- Output path
- File size + duration
- Per-scene motion choices (so they can review which library entry was used where)
- One-liner to re-render if they edit anything: `node ~/.claude/skills/short-form-vibe-edit/scripts/render.mjs <workspace>`

## Project workspace layout (after setup)

```
<workspace>/
├── CLAUDE.md                        # auto-generated, captures the rules above
├── project.json                     # preset, paths, source metadata
├── package.json
├── tsconfig.json
├── remotion.config.ts
├── public/
│   └── source.mp4                   # transcoded, locked recipe applied
├── audio.wav
├── audio.json                       # whisper output
├── captions.json                    # word-level captions for @remotion/captions
├── scenes.json                      # source of truth: timings, motion choices
├── src/
│   ├── index.tsx                    # registerRoot
│   ├── Root.tsx                     # Composition definition (templated)
│   ├── Vertical.tsx                 # main composition (templated, uses preset palette)
│   ├── broll/
│   │   └── registry.tsx             # generated; imports library + customs
│   └── broll-custom/                # bespoke per-scene motion graphics, if any
└── out/
    └── <name>-vertical.mp4
```

## Brand presets

`~/.claude/skills/short-form-vibe-edit/presets/*.json`. Each defines:
- `accent` (gold/teal/whatever)
- `bg` (frame background)
- `navy` (gradient mid-color, set to BG to disable navy gradient)
- `font` (any `@remotion/google-fonts` family name)
- `captionFontWeight` (typically 800 or 900)

Default preset is `navy-gold`. To use another, pass `--preset high-contrast` to `setup-project.mjs`.

## Failure modes (what the user might hit)

- **"Sydney's face is jittery"** → confirm `<OffthreadVideo>` is in use (not `<Video>`); check no per-frame transform leaked onto the video element
- **"Captions out of sync"** → the source.mp4 transcode took ~20ms longer than original; small drift is expected. Re-run whisper on `audio.wav` (extracted from the transcoded file) to re-align.
- **"Render hangs / OOM"** → drop `--concurrency` from default 4 to 2
- **"Gemini quota exceeded"** → not relevant here (this skill uses Remotion motion graphics, not Nano Banana)
- **"Scene didn't match anything in the library"** → you (Claude) write a custom in `src/broll-custom/`. See `docs/custom-scenes.md` for the pattern.

## Don'ts

- Don't use `<Video>` (use `<OffthreadVideo>`)
- Don't render at 60fps from a 30fps source
- Don't apply per-frame CSS transform on the video element
- Don't put captions in the lower-third on phone-targeted exports
- Don't generate AI b-roll images (Nano Banana / fal.ai) — this skill is intentionally programmatic-only. If you want AI b-roll, that's a different skill (image-broll).
- Don't auto-promote per-project customs into the skill's motion-library — keep the library curated.
