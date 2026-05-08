# {{projectName}}

Short-form vertical edit of `{{sourceBasename}}`. Created by the `short-form-vibe-edit` skill.

## Source

- Original file: `{{sourcePath}}`
- Transcoded copy: `public/source.mp4` (locked H.264 recipe — do not regenerate from the original; re-run `node scripts/transcribe.mjs` if needed)
- Duration: {{durationS}}s @ 30fps

## Brand preset: {{presetName}}

Loaded into `src/Vertical.tsx`. Edit the constants at the top of that file (or pick a different preset and re-run setup) to change palette / font.

## Hard rules (do not break — each was earned through a broken render)

1. `<OffthreadVideo>` not `<Video>` for the source talking head
2. fps = source fps (currently 30)
3. No per-frame transform on `<OffthreadVideo>`. Static `transform: translateZ(0)` on the wrapper is OK
4. Captions in middle-third (top: 1180), not lower-third
5. Active word in caption: scale 1.12 + accent color
6. Min caption page duration: 12 frames (400ms)

## Workflow

```
1. Edit scenes.json — pick motion library entry per b-roll scene
   (or write a custom in src/broll-custom/)
2. node scripts/render.mjs
3. Output lands at out/{{projectName}}.mp4 + ~/Desktop/{{projectName}}.mp4
```

## Re-render

```
cd {{workspacePath}}
node scripts/render.mjs
```

## Re-cut entirely (e.g. after editing source)

```
node scripts/transcribe.mjs   # re-transcode + re-transcribe
node scripts/plan-scenes.mjs  # WARNING: overwrites scenes.json
node scripts/render.mjs
```

## Files

- `scenes.json` — source of truth for scene timings + motion choices. Hand-edit to swap motion templates.
- `audio.json` — whisper output. Don't edit.
- `captions.json` — derived from audio.json. Regenerate via plan-scenes.mjs.
- `src/Vertical.tsx` — main composition. Brand colors + font live at top.
- `src/broll-custom/` — bespoke motion graphics specific to this video. Files here are auto-discovered by render.mjs.

## Reference: motion library

`~/.claude/skills/short-form-vibe-edit/motion-library/catalog.json` lists all available templates and when to use which.
