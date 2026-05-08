#!/usr/bin/env node
// vet-captions.mjs — open a local web UI to fix whisper transcription errors
// in captions.json. No npm deps; stdlib only.
//
// Usage: node vet-captions.mjs <workspace>
//
// Routes:
//   GET  /              → vet-captions.html
//   GET  /captions.json → current captions
//   GET  /audio.wav     → audio for playback
//   POST /save          → write edited captions back
//   POST /shutdown      → exit server (called on Save & Close)

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

const workspace = path.resolve(process.argv[2] ?? ".");
const captionsPath = path.join(workspace, "captions.json");
const audioPath = path.join(workspace, "audio.wav");
const projectPath = path.join(workspace, "project.json");

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
      // Stream with range support so the <audio> element can seek smoothly.
      const stat = fs.statSync(audioPath);
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
        };
        stream = fs.createReadStream(audioPath, { start, end });
      } else {
        status = 200;
        headers = {
          "Content-Type": "audio/wav",
          "Accept-Ranges": "bytes",
          "Content-Length": stat.size,
        };
        stream = fs.createReadStream(audioPath);
      }
      res.writeHead(status, headers);
      stream.on("error", (e) => {
        console.error("[audio stream error]", e.message);
        res.destroy();
      });
      req.on("close", () => stream.destroy());
      stream.pipe(res);
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
  console.log(`\n   Click "Save & Close" in the UI when done.\n`);

  // Auto-open browser on macOS
  if (process.platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref();
  } else if (process.platform === "linux") {
    spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
  }

  resetIdle();
})();
