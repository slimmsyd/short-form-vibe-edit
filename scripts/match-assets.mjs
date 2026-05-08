#!/usr/bin/env node
// match-assets.mjs — scan captions.json for each asset's trigger phrases,
// resolve into timed overlay windows, randomize mode/position/entry per
// occurrence (deterministic seed = startMs).
//
// Usage: node match-assets.mjs <workspace>
//
// Reads:  <workspace>/assets.json (user config), <workspace>/captions.json
// Writes: <workspace>/assets.resolved.json

import fs from "node:fs";
import path from "node:path";

const workspace = path.resolve(process.argv[2] ?? ".");
const ASSETS_IN = path.join(workspace, "assets.json");
const CAPTIONS = path.join(workspace, "captions.json");
const ASSETS_OUT = path.join(workspace, "assets.resolved.json");

if (!fs.existsSync(ASSETS_IN)) {
  // No assets configured — write an empty resolved list and exit cleanly.
  fs.writeFileSync(ASSETS_OUT, "[]\n");
  console.log("No assets.json — writing empty assets.resolved.json.");
  process.exit(0);
}
if (!fs.existsSync(CAPTIONS)) {
  console.error(`Missing captions.json — run plan-scenes.mjs first.`);
  process.exit(1);
}

const assets = JSON.parse(fs.readFileSync(ASSETS_IN, "utf8"));
const captions = JSON.parse(fs.readFileSync(CAPTIONS, "utf8"));

// Deterministic mulberry32 PRNG seeded by startMs
function rng(seed) {
  let a = (seed | 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

const ALL_MODES = ["full", "pip", "corner"];
const POSITIONS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const ENTRIES = ["fade", "scale-pop", "slide-left", "slide-right"];

// Build a single string of caption text with word-index → timestamp mapping
const concat = captions.map((c) => (c.text || "").trim()).join(" ");
const concatLower = concat.toLowerCase();

// To find the start timestamp of a phrase: walk forward through caption text,
// matching characters to the concatenated lowercase string until we find the
// match index, then map back to which caption that character started in.
function findOccurrences(phrase) {
  const p = phrase.toLowerCase().trim();
  if (!p) return [];
  const occurrences = [];
  let from = 0;
  while (true) {
    const idx = concatLower.indexOf(p, from);
    if (idx < 0) break;
    // Walk through captions to find which one contains character idx
    let charCursor = 0;
    let matchedCaptionIdx = 0;
    for (let i = 0; i < captions.length; i++) {
      const t = (captions[i].text || "").trim();
      const len = t.length + 1; // +1 for the space between
      if (charCursor + len > idx) {
        matchedCaptionIdx = i;
        break;
      }
      charCursor += len;
    }
    occurrences.push({
      startMs: captions[matchedCaptionIdx].startMs,
      matchedCaption: captions[matchedCaptionIdx].text,
    });
    from = idx + p.length;
  }
  return occurrences;
}

const resolved = [];
let id = 0;

for (const a of assets) {
  const triggers = a.triggers ?? [];
  const durationMs = a.durationMs ?? 3000;
  const modeSpec = a.mode ?? "random";

  // Collect all occurrences from all triggers (dedupe by close timestamps)
  const allHits = [];
  for (const trig of triggers) {
    for (const hit of findOccurrences(trig)) {
      allHits.push({ ...hit, trigger: trig });
    }
  }
  // Dedupe overlaps within 1s of each other
  allHits.sort((x, y) => x.startMs - y.startMs);
  const deduped = [];
  let lastEnd = -Infinity;
  for (const h of allHits) {
    if (h.startMs >= lastEnd) {
      deduped.push(h);
      lastEnd = h.startMs + durationMs;
    }
  }

  if (deduped.length === 0) {
    console.log(`  ⚠ ${a.path}: no trigger matches found in transcript`);
    continue;
  }

  for (const hit of deduped) {
    const rand = rng(hit.startMs);
    let mode;
    if (modeSpec === "random" || modeSpec == null) {
      mode = pick(rand, ALL_MODES);
    } else if (Array.isArray(modeSpec)) {
      mode = pick(rand, modeSpec);
    } else {
      mode = modeSpec;
    }
    const position = a.position ?? pick(rand, POSITIONS);
    const entry = a.entry ?? pick(rand, ENTRIES);

    resolved.push({
      id: `asset-${id++}`,
      path: a.path,
      startMs: hit.startMs,
      endMs: hit.startMs + durationMs,
      mode,
      position,
      entry,
      trigger: hit.trigger,
      matchedCaption: hit.matchedCaption,
    });
  }
}

fs.writeFileSync(ASSETS_OUT, JSON.stringify(resolved, null, 2));
console.log(
  `\nResolved ${resolved.length} asset overlay${resolved.length === 1 ? "" : "s"}:\n`
);
for (const r of resolved) {
  const sec = (ms) => (ms / 1000).toFixed(2);
  console.log(
    `  [${sec(r.startMs)}-${sec(r.endMs)}s]  ${r.mode.padEnd(7)}  ${r.position.padEnd(13)}  ${r.entry.padEnd(12)}  ${path.basename(r.path)}`
  );
  console.log(
    `      trigger: "${r.trigger}"  in: "${(r.matchedCaption || "").trim()}"`
  );
}
