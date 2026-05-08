# Writing custom scenes

When the motion library doesn't have a good match for what's being said in a particular b-roll window, write a bespoke component inside the project workspace.

## When to write a custom (not a library template)

- Topic is project-specific (a unique product name, a one-off concept, an in-joke)
- Visual reference is unique (a specific chart shape, a real-world object)
- You want to evolve the look for THIS video without polluting the global library

## Component contract

Customs follow the same contract as library components:

- Path: `<workspace>/src/broll-custom/SceneNN_<Name>.tsx`
- Default export OR named export — must match the filename basename without extension (e.g. `Scene07_DemoFlow.tsx` exports `Scene07_DemoFlow`)
- Accepts an optional `theme?: Partial<Theme>` prop
- `useCurrentFrame()` returns 0..(durationFrames-1), localized by parent `<Sequence>`
- No fetches, no `staticFile`, no shared mutable state
- Motion completes by frame ~110 of the 120-frame default window

## Minimal template

```tsx
// src/broll-custom/Scene07_DemoFlow.tsx
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { NavyGrid, withTheme, type Theme } from "../.broll-library/shared";

export type Scene07_DemoFlowProps = {
  theme?: Partial<Theme>;
};

export const Scene07_DemoFlow: React.FC<Scene07_DemoFlowProps> = ({ theme }) => {
  const t = withTheme(theme);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Your motion logic here
  const enter = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <NavyGrid theme={theme} />
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 900,
          color: t.accent,
          fontSize: 64,
          opacity: enter,
        }}
      >
        ✨ Your custom visual
      </div>
    </AbsoluteFill>
  );
};
```

## Wiring into scenes.json

```json
{
  "i": 7,
  "type": "broll",
  "motion": "custom:Scene07_DemoFlow",
  ...
}
```

`render.mjs` auto-discovers everything in `src/broll-custom/`, generates the registry, and routes `"custom:..."` motion names to your component.

## Tips

- Start by copying the closest library entry (e.g. `BrowserBuilds.tsx`) and modifying. Saves time vs starting from scratch.
- The `<NavyGrid theme={theme} />` background is the visual glue that makes customs look like they belong with library entries — use it unless you're going for a deliberately different aesthetic.
- All brand colors come through `withTheme(theme)` — never hardcode hex values. That way the same custom works across brand presets.
- Test with `npx remotion preview` and scrub through the relevant scene's window. Way faster iteration than full render.

## Promoting to library (if it earns it)

If a custom template proves useful across multiple videos, manually:
1. Copy to `~/.claude/skills/short-form-vibe-edit/motion-library/<Name>.tsx`
2. Strip `Scene07_` prefix to make it general (e.g. just `DemoFlow.tsx`)
3. Register in `motion-library/index.tsx`
4. Add catalog entry in `motion-library/catalog.json`

Don't auto-promote. Curation matters.
