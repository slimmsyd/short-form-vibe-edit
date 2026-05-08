#!/usr/bin/env node
// transcribe.mjs — transcode source to clean H.264 + run whisper to get
// word-level timestamps. Usage: node transcribe.mjs <workspace>
//
// Locked transcode recipe (do not modify):
//   -bf 0 -preset slow -crf 16 -pix_fmt yuv420p -profile:v high
//   -g 30 -movflags +faststart
// (Each flag was verified necessary through prior render glitches.)

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workspace = path.resolve(process.argv[2] ?? ".");
if (!fs.existsSync(path.join(workspace, "project.json"))) {
  console.error(`Not a vibe-edit workspace (missing project.json): ${workspace}`);
  process.exit(1);
}
const proj = JSON.parse(
  fs.readFileSync(path.join(workspace, "project.json"), "utf8")
);

const SOURCE_MP4 = path.join(workspace, "public", "source.mp4");
const AUDIO_WAV = path.join(workspace, "audio.wav");
const AUDIO_JSON = path.join(workspace, "audio.json");
const WHISPER_MODEL = proj.whisperModel ?? "base.en";

console.log(`\n🎞  Transcoding source with locked recipe...`);
const ff = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-loglevel",
    "error",
    "-i",
    proj.sourcePath,
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "16",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-bf",
    "0",
    "-g",
    "30",
    "-movflags",
    "+faststart",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    SOURCE_MP4,
  ],
  { stdio: "inherit" }
);
if (ff.status !== 0) {
  console.error(`ffmpeg transcode failed`);
  process.exit(1);
}
console.log(`   ✓ ${SOURCE_MP4}`);

console.log(`\n🎙  Extracting audio for whisper...`);
const ff2 = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-loglevel",
    "error",
    "-i",
    SOURCE_MP4,
    "-vn",
    "-acodec",
    "pcm_s16le",
    "-ar",
    "16000",
    "-ac",
    "1",
    AUDIO_WAV,
  ],
  { stdio: "inherit" }
);
if (ff2.status !== 0) {
  console.error(`audio extract failed`);
  process.exit(1);
}
console.log(`   ✓ ${AUDIO_WAV}`);

console.log(
  `\n📝 Running whisper (${WHISPER_MODEL}) — this can take a few minutes...`
);
const wh = spawnSync(
  "whisper",
  [
    AUDIO_WAV,
    "--model",
    WHISPER_MODEL,
    "--word_timestamps",
    "True",
    "--output_format",
    "json",
    "--output_dir",
    workspace,
    "--language",
    "en",
    "--verbose",
    "False",
  ],
  { stdio: "inherit" }
);
if (wh.status !== 0) {
  console.error(`whisper failed`);
  process.exit(1);
}
if (!fs.existsSync(AUDIO_JSON)) {
  console.error(
    `whisper did not produce audio.json — check that the model name is supported`
  );
  process.exit(1);
}
console.log(`   ✓ ${AUDIO_JSON}`);

console.log(`\n✅ Transcribe complete.`);
console.log(`Next: node ${path.dirname(new URL(import.meta.url).pathname)}/plan-scenes.mjs ${workspace}`);
