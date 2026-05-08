#!/usr/bin/env node
// plan-scenes.mjs — split source duration into N scenes alternating B/S,
// snap boundaries to word ends. Writes scenes.json (motion field empty for
// Claude to fill) and captions.json (flat Caption[] for @remotion/captions).
//
// Usage: node plan-scenes.mjs <workspace> [--scenes 12] [--cover-ms 4000]

import fs from "node:fs";
import path from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const workspace = path.resolve(process.argv[2] ?? ".");
if (!fs.existsSync(path.join(workspace, "project.json"))) {
  console.error(`Not a vibe-edit workspace: ${workspace}`);
  process.exit(1);
}

const N_SCENES = parseInt(arg("scenes", "12"), 10);
const COVER_MS = parseInt(arg("cover-ms", "4000"), 10);
const AUDIO_JSON = path.join(workspace, "audio.json");
const SCENES_JSON = path.join(workspace, "scenes.json");
const CAPTIONS_JSON = path.join(workspace, "captions.json");

if (!fs.existsSync(AUDIO_JSON)) {
  console.error(`Missing audio.json — run transcribe.mjs first.`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(AUDIO_JSON, "utf8"));
const allWords = data.segments.flatMap((s) =>
  (s.words ?? []).map((w) => ({
    text: w.word,
    raw: w.word.trim().replace(/[.,!?;:"'()]+/g, ""),
    startMs: Math.round(w.start * 1000),
    endMs: Math.round(w.end * 1000),
    probability: w.probability ?? null,
  }))
);
const totalMs = Math.round(
  ((data.segments.at(-1)?.end ?? 0)) * 1000
);
console.log(
  `Read ${allWords.length} words, total duration ${(totalMs / 1000).toFixed(2)}s`
);

// Caption[] format for @remotion/captions
const captions = allWords.map((w) => ({
  text: w.text,
  startMs: w.startMs,
  endMs: w.endMs,
  timestampMs: Math.round((w.startMs + w.endMs) / 2),
  confidence: w.probability,
}));
fs.writeFileSync(CAPTIONS_JSON, JSON.stringify(captions, null, 2));
console.log(`Wrote captions.json (${captions.length} word-level captions)`);

// Split into N scenes, snap boundaries to nearest word end
const targetSliceMs = totalMs / N_SCENES;
const boundaries = [0];
for (let i = 1; i < N_SCENES; i++) {
  const target = i * targetSliceMs;
  let best = allWords[0]?.endMs ?? 0;
  let bestDelta = Math.abs(best - target);
  for (const w of allWords) {
    const d = Math.abs(w.endMs - target);
    if (d < bestDelta) {
      best = w.endMs;
      bestDelta = d;
    }
  }
  boundaries.push(best);
}
boundaries.push(totalMs);

const STOPWORDS = new Set(
  (
    "a an and are as at be but by for from has have he her his i in into is it its " +
    "me my of on or our she so that the their them they this to was we were what when " +
    "where which who will with you your yes no okay just like really well sort kind " +
    "thing things stuff one two three know mean would could should about now then very " +
    "much more most some all any other every right back going get got want need see " +
    "look make made take taken tell told say said come came go went here there"
  ).split(/\s+/)
);

function topicKeywords(words, n = 2) {
  const counts = new Map();
  for (const w of words) {
    if (!w.raw) continue;
    const lower = w.raw.toLowerCase();
    if (STOPWORDS.has(lower)) continue;
    if (lower.length < 5) continue;
    counts.set(lower, (counts.get(lower) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, n)
    .map(([k]) => k);
}

const scenes = [];
for (let i = 0; i < N_SCENES; i++) {
  const startMs = boundaries[i];
  const endMs = boundaries[i + 1];
  const sceneWords = allWords.filter(
    (w) => w.startMs >= startMs && w.endMs <= endMs
  );
  const isBroll = i % 2 === 0;
  const idx = i + 1;
  if (isBroll) {
    const keys = topicKeywords(sceneWords);
    const wordsText = sceneWords
      .map((w) => w.text)
      .join("")
      .trim();
    scenes.push({
      i: idx,
      startMs,
      endMs,
      type: "broll",
      coverDurationMs: COVER_MS,
      theme: keys.join(" / ") || "abstract",
      keyword: (keys[0] ?? "").toUpperCase(),
      words: wordsText,
      // motion is INTENTIONALLY null — Claude reads `words` and the
      // motion-library catalog, then fills this in.
      motion: null,
      motionProps: null,
    });
  } else {
    scenes.push({ i: idx, startMs, endMs, type: "sydney" });
  }
}

fs.writeFileSync(SCENES_JSON, JSON.stringify(scenes, null, 2));
console.log(`\nWrote ${SCENES_JSON} — ${scenes.length} scenes`);
console.log(
  `   ${scenes.filter((s) => s.type === "broll").length} b-roll (need motion picked)`
);
console.log(
  `   ${scenes.filter((s) => s.type === "sydney").length} sydney (talking head)`
);

console.log(`\n👀 NEXT (this is YOUR job, agent):`);
console.log(`   1. Read ${SCENES_JSON}`);
console.log(
  `   2. Read ~/.claude/skills/short-form-vibe-edit/motion-library/catalog.json`
);
console.log(
  `   3. For each broll scene, look at its "words" field. Pick the best motion template by name.`
);
console.log(
  `      Set scene.motion = "Timeline" (or whatever fits). Optionally set motionProps.`
);
console.log(
  `   4. If nothing in catalog fits, write a custom in src/broll-custom/SceneNN_X.tsx and set motion = "custom:SceneNN_X".`
);
console.log(`   5. Then: node scripts/render.mjs (from inside the workspace)`);
