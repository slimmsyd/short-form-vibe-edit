# Asset overlays

Drop image (or short video) files into the project's `public/assets/` and
reference them in `assets.json`. The skill auto-detects when in the audio
each asset's trigger phrases are spoken and overlays them at those moments.

## Configure (assets.json)

```json
[
  {
    "path": "assets/EverythingClaudeCodeAsset.png",
    "triggers": ["everything claude code", "made this using"],
    "durationMs": 3000,
    "mode": "random"
  },
  {
    "path": "assets/AppWeBuilt.png",
    "triggers": ["app we built", "the web app"],
    "durationMs": 3000,
    "mode": "pip",
    "position": "top-right"
  }
]
```

## Fields

| Field | Required | Description |
|---|---|---|
| `path` | yes | Path relative to `<workspace>/public/`. Drop the file there manually before running. |
| `triggers` | yes | Array of phrases (case-insensitive substring match) to look for in the transcript. |
| `durationMs` | no | How long the overlay stays on screen (default 3000ms). |
| `mode` | no | `"full"` / `"pip"` / `"corner"` / `"random"` / array like `["full","pip"]`. Default `"random"`. |
| `position` | no | `"top-left"` / `"top-right"` / `"bottom-left"` / `"bottom-right"`. Ignored for `full` mode. Default: random per occurrence. |
| `entry` | no | Animation in/out: `"fade"` / `"scale-pop"` / `"slide-left"` / `"slide-right"`. Default: random per occurrence. |

## Modes

- **`full`** — asset fills the entire 1080×1920 frame, replacing whatever's underneath. Covers speaker + b-roll. Use for hero brand cards.
- **`pip`** — asset card occupies ~50-55% of the frame, anchored to one corner with margin. Speaker / b-roll still visible elsewhere. Aidan-style.
- **`corner`** — small ~25% asset card in a corner, watermark-style. Subtle.

## Randomization

`"mode": "random"` picks per occurrence. If "Everything Claude Code" is said three times, you'll get three different modes. Determinism: the random choice is seeded by the trigger's startMs, so re-renders produce identical results.

To restrict the random pool: `"mode": ["full", "pip"]` excludes corner.

## How matching works

`scripts/match-assets.mjs`:
1. Reads `assets.json` + `captions.json`
2. For each asset, builds a single concatenated lowercase string of all caption text
3. Finds every occurrence of each trigger phrase
4. Dedupes occurrences within `durationMs` of each other (so back-to-back mentions don't double-trigger)
5. Picks mode/position/entry per occurrence (deterministic seed)
6. Writes `assets.resolved.json` for the renderer to consume

## Failure modes

- **Trigger phrase not found** — match-assets logs a warning, asset is silently dropped from the render. Check the captions.json to see what whisper actually heard; add it as another trigger if needed.
- **Trigger overlaps a b-roll boundary** — asset overlay layer is rendered ABOVE b-roll motion graphics, so they're covered for the asset's duration. Captions stay on top.
- **Multiple assets fire simultaneously** — they stack in the order they appear in `assets.resolved.json`. Avoid this by spacing trigger phrases or using mode `"corner"` for one and `"pip"` for another.

## When to skip assets entirely

If `assets.json` doesn't exist, `match-assets.mjs` writes an empty `assets.resolved.json` and the renderer behaves identically to a video without assets. The asset layer is opt-in.
