import test from "node:test";
import assert from "node:assert/strict";

import { probeElectronBinarySupport, probeMacDmgSupport } from "../scripts/runtime-support.mjs";

test("probeElectronBinarySupport reports support when Electron exits cleanly", () => {
  const result = probeElectronBinarySupport("/tmp/Electron", {
    spawnSyncImpl: () => ({
      status: 0,
      signal: null
    })
  });

  assert.deepEqual(result, { supported: true });
});

test("probeElectronBinarySupport reports SIGABRT environments as unsupported", () => {
  const result = probeElectronBinarySupport("/tmp/Electron", {
    spawnSyncImpl: () => ({
      status: null,
      signal: "SIGABRT"
    })
  });

  assert.equal(result.supported, false);
  assert.equal(result.signal, "SIGABRT");
  assert.equal(result.reason.includes("aborts before startup"), true);
});

test("probeMacDmgSupport reports support when hdiutil succeeds", () => {
  const result = probeMacDmgSupport({
    platform: "darwin",
    tempDir: "/private/tmp",
    spawnSyncImpl: () => ({
      status: 0,
      signal: null,
      stdout: "",
      stderr: ""
    })
  });

  assert.deepEqual(result, { supported: true });
});

test("probeMacDmgSupport recognizes Device not configured failures", () => {
  const result = probeMacDmgSupport({
    platform: "darwin",
    tempDir: "/private/tmp",
    spawnSyncImpl: () => ({
      status: 1,
      signal: null,
      stdout: "",
      stderr: "hdiutil: create failed - Device not configured"
    })
  });

  assert.equal(result.supported, false);
  assert.equal(result.reason.includes("Device not configured"), true);
});
