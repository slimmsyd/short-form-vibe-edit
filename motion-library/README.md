# Motion Library

Reusable b-roll motion graphics for the `short-form-vibe-edit` skill. Each template is a self-contained Remotion React component that animates over its 4-second scene window.

## Available templates

| Name | When to use | Mood |
|---|---|---|
| `ChartConvergence` | matching, arbitrage, opportunity, two sides meeting | active, decisive |
| `Timeline` | experience, history, journey, year-by-year | confident, rooted |
| `ProblemSolution` | define problem → provide solution, before/after | clarifying |
| `BrowserBuilds` | building a web app, shipping product, MVP | productive |
| `ClockProgress` | waiting, paused, anticipation, almost done | calm, deliberate |
| `TierStack` | scope of capability, levels/tiers, scale | aspirational |

See `catalog.json` for the structured matching rules and prop docs.

## Component contract

Every library component follows the same contract so the registry can dispatch by name:

- Accepts `theme?: Partial<Theme>` to override brand colors
- Accepts component-specific optional props for content overrides (e.g. milestone labels)
- Renders against `useCurrentFrame()` returning 0..(durationFrames-1) — the parent `<Sequence>` localizes time
- Completes its motion by frame ~110 of its 120-frame default window so the 6-frame fade-out doesn't cut a moving element
- Never imports `staticFile`, never reads from disk, never makes network calls — pure deterministic React

## Adding a new template

1. Create `motion-library/MyNewTemplate.tsx` following the contract above.
2. Register it in `motion-library/index.tsx`:
   ```tsx
   import { MyNewTemplate } from "./MyNewTemplate";
   export const LIBRARY = { ..., MyNewTemplate };
   export { MyNewTemplate };
   ```
3. Add an entry to `catalog.json` with `name`, `summary`, `use_when`, and `props_optional`.
4. Test it on a real video scene before committing.

## When library doesn't fit — write a custom

If a video has a topic no template captures (e.g. "cooking demonstration", "musical composition"), don't force-fit a library entry. Instead:

- Write a bespoke component at `<workspace>/src/broll-custom/SceneNN_YourName.tsx`
- Reference it in `scenes.json` as `"motion": "custom:SceneNN_YourName"`
- Skill's `render.mjs` auto-discovers files in `src/broll-custom/` and adds them to the per-project registry

Customs stay project-local. They do NOT auto-promote into the global library — that keeps the library curated.
