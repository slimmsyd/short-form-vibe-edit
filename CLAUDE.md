# short-form-vibe-edit — for Claude Code agents

This file orients Claude Code when this repo is cloned as a development workspace. **End users invoking this as a skill should read `SKILL.md` instead** — that's the agent-facing recipe.

## What this is, in one paragraph

A Claude Code skill that turns a single phone-recorded talking-head video into a captioned vertical short (Reel / TikTok / Short) with motion-graphic b-roll punctuating each beat. Pipeline: ffmpeg transcode → whisper word-level transcription → scene segmentation → motion graphic matching → Remotion render. The agent (you) reads each b-roll scene's spoken words and either picks a library template or writes a bespoke motion component for that scene. Output: a 1080×1920 mp4 with TikTok-style word-pop captions, all programmatic, no AI image generation, no API costs after whisper runs locally.

## Repo layout (first principles)

```
SKILL.md                  ← agent-facing instructions when this skill is invoked
README.md                 ← human-facing intro
CLAUDE.md                 ← this file (orients Claude when working ON the skill)

motion-library/           ← reusable b-roll motion graphic templates (pure code, no assets)
  shared.tsx              ← brand palette + NavyGrid background
  ChartConvergence.tsx    ← one motion template per file
  Timeline.tsx
  …
  index.tsx               ← LIBRARY registry { name → component }
  catalog.json            ← keyword/use-when descriptions for matching

templates/                ← blueprints copied into each new project workspace
  src/Vertical.tsx.tpl    ← {{placeholders}} substituted by setup-project.mjs
  src/Root.tsx.tpl
  CLAUDE.md.tpl           ← per-project orientation (different from THIS file)
  package.json.tpl
  tsconfig.json.tpl
  remotion.config.ts

scripts/                  ← orchestration, run in this order per video:
  setup-project.mjs       ← bootstrap workspace from templates
  transcribe.mjs          ← ffmpeg transcode + whisper
  plan-scenes.mjs         ← split duration into 12 alternating scenes
  vet-captions.mjs        ← optional local web UI to fix whisper errors
  match-assets.mjs        ← scan transcript for asset trigger phrases
  render.mjs              ← generate broll-registry, run Remotion render

presets/*.json            ← brand palettes (navy-gold default)
docs/                     ← architectural lessons (transcoding, OffthreadVideo, captions)
```

## Architectural rules (each one was earned through a broken render)

1. **Source must be transcoded** with `-bf 0 -preset slow -pix_fmt yuv420p -g 30`. Other H.264 encodings glitch under Chromium frame-stepping. See `docs/transcoding.md`.

2. **Use `<OffthreadVideo>` not `<Video>`.** OffthreadVideo extracts frames via ffmpeg subprocess — frame-perfect deterministic. `<Video>` uses Chromium's HTML video element and stutters when overlays composite above. See `docs/offthreadvideo.md`.

3. **Composition fps must match source fps.** 30fps source → 30fps composition. Bumping to 60 causes 2× frame duplication that reads as judder.

4. **No per-frame CSS transforms on the video element.** Static `transform: translateZ(0)` on the wrapper is fine (forces stable GPU layer); per-frame `scale()` / `translate()` is not.

5. **Captions in middle-third.** Lower-third gets covered by phone UI chrome.

6. **Active word in captions: scale 1.12× + accent color shift.** Color-only swap is too weak.

7. **Min caption page: 12 frames (400ms).** Shorter pages flicker.

These rules live as comments in the templates and prose in `docs/`. Don't break them without earning a new lesson.

## How a project flow runs

```
USER: invokes skill with a source video path
  ↓
1. setup-project.mjs <src.mov>
   → creates <src-basename>-vibe-edit/ next to the source
   → copies templates with {{placeholder}} substitution
   → npm install Remotion deps
   → writes project.json, stubs assets.resolved.json
  ↓
2. transcribe.mjs <workspace>
   → ffmpeg transcode → public/source.mp4 (locked recipe)
   → ffmpeg audio extract → audio.wav
   → whisper base.en --word_timestamps → audio.json
  ↓
3. plan-scenes.mjs <workspace>
   → splits duration into 12 alternating broll/sydney scenes
   → snaps boundaries to word ends
   → writes scenes.json with motion=null per b-roll, captions.json
  ↓
4. (optional) vet-captions.mjs <workspace>
   → spins up localhost:7321 with audio + editable transcript
   → user fixes whisper errors, clicks Save & Close
   → writes corrected captions.json + captions.json.bak
  ↓
5. AGENT (Claude) job — TWO MODES:
   Mode A (library): read each broll scene's `words`, pick from
     motion-library/catalog.json by best-fit keyword. Set scene.motion = "Timeline".
   Mode B (unique customs): write a bespoke component at
     workspace/src/broll-custom/SceneNN_X.tsx. Set scene.motion = "custom:SceneNN_X".
  ↓
6. (optional) write workspace/assets.json + drop image files in public/assets/
  ↓
7. render.mjs <workspace>
   → match-assets.mjs auto-fires if assets.json exists
   → mirrors motion-library/ → workspace/src/.broll-library/
   → generates workspace/src/broll-registry.tsx (library + customs imports)
   → npx remotion render
   → copies output → ~/Desktop/<project-name>.mp4
```

## When working ON the skill (this file's audience)

- **Library is curated.** Don't auto-promote per-project customs into `motion-library/`. Manual review only. Keep the library as the high-quality stock set.
- **Templates use `{{placeholder}}` substitution.** Adding a new placeholder requires updating `setup-project.mjs`'s `subs` table.
- **Scripts have no shared lib.** Each script in `scripts/` is self-contained, stdlib-only Node where possible. No npm deps in skill-level scripts (per-project workspace has Remotion deps via `npm install`).
- **Per-project workspace owns its `src/Vertical.tsx`** after substitution. Editing `templates/src/Vertical.tsx.tpl` only affects future `setup-project.mjs` runs, not existing projects.
- **`broll-registry.tsx` is autogenerated each render.** Don't hand-edit; it gets clobbered.

## Adding a new motion library template

1. Create `motion-library/MyTemplate.tsx` — must export `MyTemplate` matching filename, take optional `theme?: Partial<Theme>` prop, render against `useCurrentFrame()` localized to its scene window.
2. Register in `motion-library/index.tsx`: import + add to `LIBRARY`.
3. Add catalog entry in `motion-library/catalog.json` with `name`, `summary`, `use_when`, optional `props_optional`.
4. Test on a real video before committing.

## Adding a new brand preset

Drop a JSON file in `presets/` with `bg`, `accent`, `navy`, `fontFamily` (must match a `@remotion/google-fonts` package), `captionFontWeight`. The preset name is the filename. `--preset <name>` on `setup-project.mjs` selects it.

## Locked dependencies

- ffmpeg ≥ 7 (with libx264, AAC encoder, HEVC decoder)
- whisper (`pip install openai-whisper`) — base.en model is sufficient for English short-form
- node ≥ 18, npm
- macOS or Linux (the setup script's auto-browser-open uses `open` / `xdg-open`)

No global npm package — the skill scripts run via absolute path. Per-project workspaces install Remotion locally.

## Contributing

1. Find a video where the existing skill output disappoints you.
2. Trace what about it disappointed you back to a missing motion template, weak preset, or architectural rule.
3. Fix the root cause (new template / new preset / amended rule + doc).
4. Re-render against your test video.
5. PR with the test video clip in the description so reviewers can see the before/after.

Don't add features the skill won't use. Don't add config for hypothetical needs. Three similar templates is better than one over-parameterized one.
