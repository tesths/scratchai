import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readlink, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { copyPathWithRetry } from "../scripts/copy-with-retry.mjs";

test("copyPathWithRetry preserves relative symlink targets inside copied directories", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "copy-path-with-retry-"));
  const sourceDir = path.join(rootDir, "source");
  const targetDir = path.join(rootDir, "target");

  await mkdir(path.join(sourceDir, "Versions", "A"), { recursive: true });
  await writeFile(path.join(sourceDir, "Versions", "A", "payload.txt"), "ok");
  await symlink("Versions/Current/payload.txt", path.join(sourceDir, "payload.txt"));
  await symlink("A", path.join(sourceDir, "Versions", "Current"));

  await copyPathWithRetry(sourceDir, targetDir);

  assert.equal(
    await readlink(path.join(targetDir, "payload.txt")),
    "Versions/Current/payload.txt"
  );
  assert.equal(
    await readlink(path.join(targetDir, "Versions", "Current")),
    "A"
  );
});
