import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const enableSourceMaps = false;

const buildConfigs = [
  {
    entryPoints: [path.join(__dirname, "src/main.ts")],
    outfile: path.join(distDir, "main.js"),
    platform: "node",
    format: "esm",
    external: ["electron"]
  },
  {
    entryPoints: [path.join(__dirname, "src/preload.ts")],
    outfile: path.join(distDir, "preload.cjs"),
    platform: "node",
    format: "cjs",
    external: ["electron"]
  },
  {
    entryPoints: [path.join(__dirname, "src/renderer.ts")],
    outfile: path.join(distDir, "renderer.js"),
    platform: "browser",
    format: "esm"
  },
  {
    entryPoints: [path.join(__dirname, "src/settings-renderer.ts")],
    outfile: path.join(distDir, "settings-renderer.js"),
    platform: "browser",
    format: "esm"
  },
  {
    entryPoints: [path.join(__dirname, "src/renderer-view.ts")],
    outfile: path.join(distDir, "renderer-view.js"),
    platform: "browser",
    format: "esm"
  },
  {
    entryPoints: [path.join(__dirname, "src/coach-service.ts")],
    outfile: path.join(distDir, "coach-service.js"),
    platform: "node",
    format: "esm"
  },
  {
    entryPoints: [path.join(__dirname, "src/deepseek-config.ts")],
    outfile: path.join(distDir, "deepseek-config.js"),
    platform: "node",
    format: "esm"
  },
  {
    entryPoints: [path.join(__dirname, "src/state-store.ts")],
    outfile: path.join(distDir, "state-store.js"),
    platform: "node",
    format: "esm"
  },
  {
    entryPoints: [path.join(__dirname, "src/session-manager.ts")],
    outfile: path.join(distDir, "session-manager.js"),
    platform: "node",
    format: "esm",
    external: ["electron"]
  },
  {
    entryPoints: [path.join(__dirname, "src/scratch-remote-debugger.ts")],
    outfile: path.join(distDir, "scratch-remote-debugger.js"),
    platform: "node",
    format: "esm"
  },
  {
    entryPoints: [path.join(__dirname, "src/scratch-executable-finder.ts")],
    outfile: path.join(distDir, "scratch-executable-finder.js"),
    platform: "node",
    format: "esm"
  }
];

async function copyStatic() {
  const html = await readFile(path.join(__dirname, "src/index.html"), "utf8");
  const settingsHtml = await readFile(path.join(__dirname, "src/settings.html"), "utf8");
  const deepSeekConfig = await readFile(path.join(__dirname, "src/deepseek.config.json"), "utf8");
  await writeFile(path.join(distDir, "index.html"), html);
  await writeFile(path.join(distDir, "settings.html"), settingsHtml);
  await writeFile(path.join(distDir, "deepseek.config.json"), deepSeekConfig);
  await cp(path.join(__dirname, "src/assets"), path.join(distDir, "assets"), { recursive: true });
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await Promise.all(
  buildConfigs.map((config) =>
    build({
      bundle: true,
      sourcemap: enableSourceMaps,
      target: "es2022",
      ...config
    })
  )
);
await copyStatic();
