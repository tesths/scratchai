import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const REQUIRED_SERVER_FILES = [
  "../../../apps/server-api/README.md",
  "../../../apps/server-api/pyproject.toml",
  "../../../apps/server-web/README.md",
  "../../../apps/server-web/package.json"
];

test("server api and web apps are checked into the main workspace", async () => {
  await Promise.all(REQUIRED_SERVER_FILES.map((relativePath) => access(new URL(relativePath, import.meta.url))));
});

test("workspace scripts expose server api and web entrypoints", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../../../package.json", import.meta.url), "utf8"));

  assert(packageJson.workspaces.includes("apps/server-web"));
  assert.equal(typeof packageJson.scripts["server:api:test"], "string");
  assert.equal(typeof packageJson.scripts["server:web:test"], "string");
  assert.equal(typeof packageJson.scripts["server:dev"], "string");
});

test("core docs describe the new FastAPI and Vue server track", async () => {
  const [rootReadmeZh, rootReadmeEn, structureZh, structureEn] = await Promise.all([
    readFile(new URL("../../../README.zh-CN.md", import.meta.url), "utf8"),
    readFile(new URL("../../../README.en.md", import.meta.url), "utf8"),
    readFile(new URL("../../../docs/project-structure.zh-CN.md", import.meta.url), "utf8"),
    readFile(new URL("../../../docs/project-structure.en.md", import.meta.url), "utf8")
  ]);

  assert.match(rootReadmeZh, /FastAPI/);
  assert.match(rootReadmeZh, /Vue/);
  assert.match(rootReadmeEn, /FastAPI/);
  assert.match(rootReadmeEn, /Vue/);
  assert.match(structureZh, /apps\/server-api/);
  assert.match(structureZh, /apps\/server-web/);
  assert.match(structureEn, /apps\/server-web/);
});
