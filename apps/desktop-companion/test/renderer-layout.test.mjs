import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("main window shows the selected Scratch path in a visible summary row", async () => {
  const html = await readFile(new URL("../src/renderer/index.html", import.meta.url), "utf8");

  assert.match(html, /<span>已选 Scratch<\/span>/);
  assert.match(html, /<strong id="scratch-path">还没有选择<\/strong>/);
});

test("main window no longer shows the module summary panel", async () => {
  const html = await readFile(new URL("../src/renderer/index.html", import.meta.url), "utf8");

  assert.doesNotMatch(html, /识别到的模块/);
  assert.doesNotMatch(html, /id="program-area-modules"/);
});

test("main window places current target programs and recommended blocks in one two-column row", async () => {
  const html = await readFile(new URL("../src/renderer/index.html", import.meta.url), "utf8");

  assert.match(html, /<div class="program-recommend-grid">/);
  assert.match(html, /<ul id="ai-recommended-blocks" class="list recommended-list"><\/ul>/);
});
