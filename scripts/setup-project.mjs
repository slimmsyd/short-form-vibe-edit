#!/usr/bin/env node
// setup-project.mjs — bootstrap a new short-form-vibe-edit project workspace.
//
// Usage:
//   node ~/.claude/skills/short-form-vibe-edit/scripts/setup-project.mjs <source-path> [--preset <name>] [--workspace <path>]
//
// Examples:
//   node setup-project.mjs ~/Desktop/MyVideo.mov
//   node setup-project.mjs ~/Videos/talk.mp4 --preset high-contrast
//   node setup-project.mjs ./input.mov --workspace ~/edits/talk-edit
//
// What it does:
// 1. Validates the source file exists
// 2. Probes source duration via ffprobe (used by template substitution)
// 3. Creates workspace dir
// 4. Copies templates (with {{placeholder}} substitution)
// 5. Runs npm install for Remotion deps
// 6. Writes project.json with metadata + preset info

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync, spawnSync } from "node:child_process";

const SKILL_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  ".."
);

function expandHome(p) {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const sourcePathRaw = process.argv[2];
if (!sourcePathRaw || sourcePathRaw.startsWith("--")) {
  console.error(
    "Usage: setup-project.mjs <source-path> [--preset <name>] [--workspace <path>]"
  );
  process.exit(1);
}
const sourcePath = path.resolve(expandHome(sourcePathRaw));
if (!fs.existsSync(sourcePath)) {
  console.error(`Source file not found: ${sourcePath}`);
  process.exit(1);
}

const presetName = arg("preset", "navy-gold");
const presetPath = path.join(SKILL_DIR, "presets", `${presetName}.json`);
if (!fs.existsSync(presetPath)) {
  console.error(`Preset not found: ${presetPath}`);
  console.error(
    `Available: ${fs.readdirSync(path.join(SKILL_DIR, "presets")).join(", ")}`
  );
  process.exit(1);
}
const preset = JSON.parse(fs.readFileSync(presetPath, "utf8"));

const sourceBasename = path.basename(sourcePath, path.extname(sourcePath));
const projectName = `${sourceBasename}-vibe-edit`;
const workspaceRaw = arg(
  "workspace",
  path.join(path.dirname(sourcePath), projectName)
);
const workspace = path.resolve(expandHome(workspaceRaw));

console.log(`\n🎬 Setting up short-form vibe edit project`);
console.log(`   source:    ${sourcePath}`);
console.log(`   workspace: ${workspace}`);
console.log(`   preset:    ${presetName}\n`);

// Probe source duration
let durationS = 90;
try {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${sourcePath}"`
  )
    .toString()
    .trim();
  durationS = parseFloat(out);
  if (!Number.isFinite(durationS) || durationS <= 0) {
    throw new Error(`got: ${out}`);
  }
} catch (e) {
  console.error(`Could not probe source duration: ${e.message}`);
  console.error(`Make sure ffprobe is installed: brew install ffmpeg`);
  process.exit(1);
}
console.log(`   duration:  ${durationS.toFixed(2)}s`);

// Create workspace
fs.mkdirSync(workspace, { recursive: true });
fs.mkdirSync(path.join(workspace, "public"), { recursive: true });
fs.mkdirSync(path.join(workspace, "public", "assets"), { recursive: true });
fs.mkdirSync(path.join(workspace, "src"), { recursive: true });
fs.mkdirSync(path.join(workspace, "src", "broll-custom"), { recursive: true });
// Stub assets.resolved.json so the static import in Root.tsx resolves on
// the very first render (gets overwritten by render.mjs / match-assets.mjs).
fs.writeFileSync(path.join(workspace, "assets.resolved.json"), "[]\n");
fs.mkdirSync(path.join(workspace, "scripts"), { recursive: true });
fs.mkdirSync(path.join(workspace, "out"), { recursive: true });

// Substitution table for templates
const subs = {
  projectName,
  sourceBasename,
  sourcePath,
  workspacePath: workspace,
  presetName,
  durationS: durationS.toFixed(4),
  fps: "30",
  width: "1080",
  height: "1920",
  fontFamily: preset.fontFamily ?? "InterTight",
  captionFontWeight: preset.captionFontWeight ?? "800",
  bg: preset.bg,
  accent: preset.accent,
  navy: preset.navy,
};

function substitute(content) {
  return content.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in subs)) {
      console.warn(`  ⚠ unresolved placeholder: {{${k}}}`);
      return `{{${k}}}`;
    }
    return String(subs[k]);
  });
}

// Copy templates
const templates = [
  ["templates/package.json.tpl", "package.json"],
  ["templates/tsconfig.json.tpl", "tsconfig.json"],
  ["templates/remotion.config.ts", "remotion.config.ts"],
  ["templates/CLAUDE.md.tpl", "CLAUDE.md"],
  ["templates/src/index.tsx", "src/index.tsx"],
  ["templates/src/Root.tsx.tpl", "src/Root.tsx"],
  ["templates/src/Vertical.tsx.tpl", "src/Vertical.tsx"],
];

for (const [src, dst] of templates) {
  const fromPath = path.join(SKILL_DIR, src);
  const toPath = path.join(workspace, dst);
  fs.mkdirSync(path.dirname(toPath), { recursive: true });
  const raw = fs.readFileSync(fromPath, "utf8");
  fs.writeFileSync(toPath, substitute(raw));
  console.log(`   ✓ ${dst}`);
}

// Copy the per-project worker scripts (transcribe + plan + render are skill-level,
// but we drop a thin "render-here" shim so users can `npm run render` inside the project)
fs.writeFileSync(
  path.join(workspace, "scripts", "render.mjs"),
  `#!/usr/bin/env node
// Thin shim — delegates to the skill's render.mjs against this workspace.
import { spawnSync } from "node:child_process";
import path from "node:path";
const r = spawnSync("node", [
  ${JSON.stringify(path.join(SKILL_DIR, "scripts", "render.mjs"))},
  ${JSON.stringify(workspace)},
], { stdio: "inherit" });
process.exit(r.status ?? 1);
`
);

// Write project.json metadata
const projectMeta = {
  projectName,
  sourcePath,
  sourceBasename,
  workspace,
  presetName,
  durationS,
  fps: 30,
  width: 1080,
  height: 1920,
  createdAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(workspace, "project.json"),
  JSON.stringify(projectMeta, null, 2)
);

console.log(`\n📦 Installing Remotion deps (this may take ~1 min)...`);
const npm = spawnSync(
  "npm",
  ["install", "--silent", "--no-audit", "--no-fund"],
  {
    cwd: workspace,
    stdio: "inherit",
  }
);
if (npm.status !== 0) {
  console.error(`\nnpm install failed. You can re-run manually:`);
  console.error(`  cd ${workspace} && npm install`);
  process.exit(1);
}

console.log(`\n✅ Workspace ready at ${workspace}`);
console.log(`\nNext steps:`);
console.log(
  `  1. node ${path.join(SKILL_DIR, "scripts", "transcribe.mjs")} ${workspace}`
);
console.log(
  `  2. node ${path.join(SKILL_DIR, "scripts", "plan-scenes.mjs")} ${workspace}`
);
console.log(
  `  3. (Claude) read scenes.json + motion-library/catalog.json, fill in motion fields`
);
console.log(`  4. node ${path.join(workspace, "scripts", "render.mjs")}`);
