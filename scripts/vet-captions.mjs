#!/usr/bin/env node
// vet-captions.mjs — open a local web UI to fix whisper transcription errors
// in captions.json. No npm deps; stdlib only.
//
// Usage: node vet-captions.mjs <workspace>
//
// Routes:
//   GET  /                       → vet-captions.html
//   GET  /captions.json          → current captions
//   GET  /audio.wav              → original audio for playback
//   GET  /audio-enhanced.wav?mix=N → preview audio with RNNoise wet/dry mix
//   GET  /enhancement-status     → { available, reason? }
//   POST /save                   → write edited captions back
//   POST /shutdown               → exit server (called on Save & Close)

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";

// Don't crash the whole server on a single bad request (e.g. browser
// disconnects mid-stream and we try to write headers post-pipe).
process.on("uncaughtException", (err) => {
  if (err && err.code === "ERR_HTTP_HEADERS_SENT") {
    console.error("[vet-captions] swallowed late writeHead:", err.message);
    return;
  }
  console.error("[vet-captions] uncaught:", err);
});

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const HTML_PATH = path.join(SCRIPT_DIR, "vet-captions.html");
const RNNOISE_MODEL = path.resolve(SCRIPT_DIR, "..", "assets", "rnnoise", "mp.rnnn");

const workspace = path.resolve(process.argv[2] ?? ".");
const captionsPath = path.join(workspace, "captions.json");
const audioPath = path.join(workspace, "audio.wav");
const projectPath = path.join(workspace, "project.json");
const enhanceCacheDir = path.join(workspace, ".cache", "audio-enhanced");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!fs.existsSync(captionsPath))
  fail(`captions.json not found in ${workspace}\nRun plan-scenes.mjs first.`);
if (!fs.existsSync(audioPath))
  fail(`audio.wav not found in ${workspace}\nRun transcribe.mjs first.`);

const projectName = fs.existsSync(projectPath)
  ? JSON.parse(fs.readFileSync(projectPath, "utf8")).projectName ?? "workspace"
  : path.basename(workspace);

// Voice-enhancement (preview only) — bundled RNNoise model.
const enhancementAvailable = fs.existsSync(RNNOISE_MODEL);
const enhancementReason = enhancementAvailable
  ? null
  : `RNNoise model not found at ${RNNOISE_MODEL}`;

// Reset preview cache on every server start: audio.wav may have been
// re-transcribed since last run, so old cached mixes would be stale.
try {
  fs.rmSync(enhanceCacheDir, { recursive: true, force: true });
} catch {}
if (enhancementAvailable) {
  fs.mkdirSync(enhanceCacheDir, { recursive: true });
}

// One in-flight ffmpeg job per mix level, so a fast slider drag doesn't
// race the same target file from two requests.
const enhanceLocks = new Map(); // mix(int) -> Promise<string cachedPath>

function buildEnhancedWav(mix) {
  // mix: 0..100 — 0 = bypass (returns audioPath), 100 = pure denoised.
  if (mix === 0) return Promise.resolve(audioPath);
  const cached = path.join(enhanceCacheDir, `mix-${mix}.wav`);
  if (fs.existsSync(cached)) return Promise.resolve(cached);
  if (enhanceLocks.has(mix)) return enhanceLocks.get(mix);

  const dry = ((100 - mix) / 100).toFixed(4);
  const wet = (mix / 100).toFixed(4);
  const filter =
    `[0:a]asplit=2[dry][wet1];` +
    `[wet1]arnndn=m=${RNNOISE_MODEL}[wet];` +
    `[dry][wet]amix=inputs=2:weights=${dry} ${wet}:normalize=0[out]`;

  const job = new Promise((resolve, reject) => {
    const args = [
      "-y", "-loglevel", "error",
      "-i", audioPath,
      "-filter_complex", filter,
      "-map", "[out]",
      "-ar", "16000", "-ac", "1",
      "-c:a", "pcm_s16le",
      cached,
    ];
    const t0 = Date.now();
    const p = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    p.stderr.on("data", (c) => { stderr += c.toString(); });
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) {
        console.log(`[enhance] mix=${mix} → ${path.relative(workspace, cached)} (${Date.now() - t0}ms)`);
        resolve(cached);
      } else {
        try { fs.rmSync(cached, { force: true }); } catch {}
        reject(new Error(`ffmpeg exited ${code}: ${stderr.trim()}`));
      }
    });
  }).finally(() => enhanceLocks.delete(mix));

  enhanceLocks.set(mix, job);
  return job;
}

function streamWav(req, res, filePath) {
  // Shared range-aware streamer used by both /audio.wav and /audio-enhanced.wav.
  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  let stream, status, headers;
  if (range) {
    const m = /bytes=(\d+)-(\d*)/.exec(range);
    const start = m ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
    status = 206;
    headers = {
      "Content-Type": "audio/wav",
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Content-Length": end - start + 1,
      "Cache-Control": "no-store",
    };
    stream = fs.createReadStream(filePath, { start, end });
  } else {
    status = 200;
    headers = {
      "Content-Type": "audio/wav",
      "Accept-Ranges": "bytes",
      "Content-Length": stat.size,
      "Cache-Control": "no-store",
    };
    stream = fs.createReadStream(filePath);
  }
  res.writeHead(status, headers);
  stream.on("error", (e) => {
    console.error("[audio stream error]", e.message);
    res.destroy();
  });
  req.on("close", () => stream.destroy());
  stream.pipe(res);
}

const PORTS = [7321, 7322, 7323, 7324, 7325];
let server = null;
let chosenPort = null;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
let idleTimer = null;
function resetIdle() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    console.error(
      "\n[vet-captions] idle for 30 min, exiting without saving anything new."
    );
    process.exit(0);
  }, IDLE_TIMEOUT_MS);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function send(res, status, body, headers = {}) {
  if (res.headersSent || res.writableEnded) return;
  const isJson = !(body instanceof Buffer || typeof body === "string" || body == null);
  res.writeHead(status, {
    "Cache-Control": "no-store",
    ...(isJson ? { "Content-Type": "application/json" } : {}),
    ...headers,
  });
  if (isJson) res.end(JSON.stringify(body));
  else if (body == null) res.end();
  else res.end(body);
}

const app = async (req, res) => {
  resetIdle();
  const url = new URL(req.url, `http://localhost:${chosenPort}`);
  const p = url.pathname;

  try {
    if (req.method === "GET" && (p === "/" || p === "/index.html")) {
      const html = fs.readFileSync(HTML_PATH, "utf8")
        .replace("{{PROJECT_NAME}}", projectName);
      return send(res, 200, html, { "Content-Type": "text/html; charset=utf-8" });
    }
    if (req.method === "GET" && p === "/captions.json") {
      const buf = fs.readFileSync(captionsPath);
      return send(res, 200, buf, { "Content-Type": "application/json" });
    }
    if (req.method === "GET" && p === "/audio.wav") {
      streamWav(req, res, audioPath);
      return;
    }
    if (req.method === "GET" && p === "/enhancement-status") {
      return send(res, 200, {
        available: enhancementAvailable,
        reason: enhancementReason,
      });
    }
    if (req.method === "GET" && p === "/audio-enhanced.wav") {
      if (!enhancementAvailable)
        return send(res, 503, { error: enhancementReason });
      const raw = url.searchParams.get("mix");
      let mix = parseInt(raw ?? "0", 10);
      if (!Number.isFinite(mix)) mix = 0;
      mix = Math.max(0, Math.min(100, Math.round(mix)));
      try {
        const filePath = await buildEnhancedWav(mix);
        streamWav(req, res, filePath);
      } catch (e) {
        console.error("[enhance] failed:", e.message);
        send(res, 500, { error: String(e.message || e) });
      }
      return;
    }
    if (req.method === "POST" && p === "/save") {
      const raw = await readBody(req);
      const incoming = JSON.parse(raw.toString("utf8"));
      if (!Array.isArray(incoming))
        return send(res, 400, { error: "expected an array of captions" });
      // Preserve everything except `text`. We only change the displayed words.
      const original = JSON.parse(fs.readFileSync(captionsPath, "utf8"));
      if (incoming.length !== original.length)
        return send(res, 400, {
          error: `length mismatch: original ${original.length}, incoming ${incoming.length}`,
        });
      const merged = original.map((o, i) => ({ ...o, text: incoming[i].text }));
      // Backup once per session (suffix with ISO timestamp on first save)
      const backupPath = captionsPath + ".bak";
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(captionsPath, backupPath);
      }
      fs.writeFileSync(captionsPath, JSON.stringify(merged, null, 2));
      console.log(
        `[vet-captions] saved ${merged.length} captions → captions.json`
      );
      return send(res, 200, { ok: true, count: merged.length });
    }
    if (req.method === "POST" && p === "/shutdown") {
      send(res, 200, { ok: true });
      console.log("[vet-captions] shutting down");
      setTimeout(() => process.exit(0), 200);
      return;
    }
    send(res, 404, { error: "not found", path: p });
  } catch (e) {
    console.error("[vet-captions] error", e);
    send(res, 500, { error: String(e) });
  }
};

async function tryListen(port) {
  return new Promise((resolve) => {
    const s = http.createServer(app);
    s.once("error", (err) => {
      if (err.code === "EADDRINUSE") resolve(null);
      else throw err;
    });
    s.listen(port, "127.0.0.1", () => resolve(s));
  });
}

(async () => {
  for (const port of PORTS) {
    server = await tryListen(port);
    if (server) {
      chosenPort = port;
      break;
    }
  }
  if (!server) fail(`No free port in ${PORTS.join(", ")}`);

  const url = `http://localhost:${chosenPort}/`;
  console.log(`\n📝 Vet captions UI ready at ${url}`);
  console.log(`   workspace: ${workspace}`);
  console.log(`   captions:  ${captionsPath}`);
  console.log(`   backup will be written to ${captionsPath}.bak on first save`);
  console.log(`   idle timeout: 30 min`);
  console.log(
    `   voice enhancement: ${enhancementAvailable ? "ON (RNNoise)" : `OFF — ${enhancementReason}`}`
  );
  console.log(`\n   Click "Save & Close" in the UI when done.\n`);

  // Auto-open browser on macOS
  if (process.platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref();
  } else if (process.platform === "linux") {
    spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
  }

  resetIdle();
})();
