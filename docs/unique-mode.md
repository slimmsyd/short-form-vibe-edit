# Unique mode — every scene gets a bespoke motion graphic

The default workflow matches each b-roll scene to a motion-library template. That's fast and reusable, but every video that lands on `Timeline` gets the same Timeline animation.

**Unique mode** flips this: instead of matching to library templates, the agent (Claude) writes a bespoke motion graphic component per b-roll scene, specific to what's said in that window. No two videos share the same motion graphic.

## When to use it

- Brand or hero videos where every visual should feel custom-made
- Topics that don't map cleanly to library categories (cooking demo, art tutorial, sports content)
- Iteration content where you want each video to feel evolved from the last
- Anywhere "stock" feel is unacceptable

## When NOT to use it

- Bulk video pipelines where consistency matters more than novelty (5+ videos a week)
- First pass / draft reviews — library is faster
- Topics that map cleanly to a library entry (e.g. a literal timeline scene → just use `Timeline`)

## Workflow change

In default mode, after `plan-scenes.mjs` writes `scenes.json`:
```
motion: null  →  motion: "Timeline"
```

In unique mode, after `plan-scenes.mjs`:
```
motion: null  →  motion: "custom:Scene01_PipelineLeak"
                 + new file at src/broll-custom/Scene01_PipelineLeak.tsx
```

The agent writes the component file with motion specific to that scene's words, then sets `scene.motion = "custom:Scene01_PipelineLeak"`. `render.mjs` auto-discovers the file and registers it.

## How the agent (Claude) decides what to write

For each b-roll scene:
1. Read scene's `words` field — what's said in this window
2. Read the **library** entries (motion-library/catalog.json) for inspiration on visual vocabulary, but DO NOT copy
3. Decide on a concrete visual motif tied to the literal subject — not the abstract theme
4. Write the component:
   - Naming: `SceneNN_<DescriptiveName>.tsx` where `<DescriptiveName>` describes the visual motif (e.g. `Scene01_PipelineLeak`, not `Scene01_Generic`)
   - Use `withTheme()` and `NavyGrid` from `../.broll-library/shared` for brand cohesion
   - Component completes its motion by frame 110 of the 120-frame default window
   - All the same architectural rules from `docs/architecture.md` apply
5. Set `scene.motion = "custom:<DescriptiveName>"` in scenes.json

## Concrete example

Scene's spoken words: *"my sales costs for the last couple months have not been that effective because I haven't been tracking on the..."*

| Mode | Choice | What you see |
|---|---|---|
| Default | `motion: "ProblemSolution"` | Tangled scribble → clean target. Generic. |
| Unique | `motion: "custom:Scene01_LeakyFunnel"` | Sales pipeline funnel where each stage leaks dollar signs out the side. Specific to "sales costs not tracked." |

## Cost

Each custom is ~60–100 lines of TSX. For a 12-scene video that's 6 customs, ~500 lines added to the project. Slightly larger render workspace; render time unchanged.

The skill stays unchanged — these are project-local files. The motion library does not grow.

## Promoting a winner back to the library

If a custom turns out to be visually strong AND generally reusable (you'd want to use it on future videos), you can manually:
1. Move + rename: `src/broll-custom/Scene05_X.tsx` → `~/.claude/skills/short-form-vibe-edit/motion-library/X.tsx`
2. Strip the `Scene05_` prefix and any video-specific labels
3. Register in `motion-library/index.tsx`
4. Add a catalog entry

Don't auto-promote. Curation is a feature.
