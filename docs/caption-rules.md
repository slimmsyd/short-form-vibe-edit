# Caption rules

Captions are the single most important element of short-form video — the algorithm decides whether to keep watching in <1s and most viewers watch on mute.

## Hard rules (don't violate)

1. **Position: middle-third of the frame** (top:1180 for 1080×1920). The lower 25% of phone screens is covered by app UI chrome (TikTok comment button, Reels icons, Shorts subscribe). Bottom-third captions get partially obscured.

2. **Active word must visibly pop.** Color swap alone is not enough — viewers will scan over it. Required treatment:
   - Scale the active word to 1.10–1.15x with a short ramp (~90ms)
   - Color-shift to brand accent
   - Preserve weight (don't bold-on-active — looks gimmicky)

3. **Min caption page duration: 12 frames (400ms @ 30fps).** Any shorter reads as a flicker, not a word.

4. **Use `createTikTokStyleCaptions` from `@remotion/captions`** — DO NOT hand-roll word grouping. The library splits at phrase boundaries; manual chunking breaks mid-thought.

5. **2-4 words per page max.** More than 4 = nobody reads.

6. **First caption must be on screen at frame 0.** Don't wait for the speaker. Algorithm decision is made instantly.

## Recommended treatment

```tsx
// In Vertical.tsx, inside CaptionPage:
const isActive = token.fromMs <= absoluteMs && token.toMs > absoluteMs;
const ACTIVE_RAMP_MS = 90;
let activeP = 0;
if (token.fromMs <= absoluteMs) {
  activeP = Math.min(1, (absoluteMs - token.fromMs) / ACTIVE_RAMP_MS);
}
const scale = isActive ? interpolate(activeP, [0, 1], [1.0, 1.12]) : 1.0;
const color = isActive ? ACCENT : "white";
```

## Typography

- Brand font loaded via `@remotion/google-fonts/<family>`. Inter Tight 800/900 is a strong default; Bricolage Grotesque 800 is a good lifestyle alt; JetBrains Mono if you're going for dev/hacker.
- `letterSpacing: -2` for tight headline feel
- `textTransform: "uppercase"` — improves legibility at small phone sizes
- `textShadow: "0 4px 0 #000, 0 2px 14px rgba(0,0,0,0.85), 0 0 1px #000"` — hard shadow for crispness on any background, soft glow as a halo against busy backgrounds

## Why not use `<srt>` files

Captions are first-class React components in this skill so they:
- Can animate per-token (the active-word scale-pop)
- Can position dynamically (move out of the way during certain b-roll windows if needed)
- Don't depend on player-side caption rendering (some platforms strip them)

If a downstream tool needs SRT (e.g. for accessibility), generate with `serializeSrt` from `@remotion/captions` from the same source captions.
