import test from "node:test";
import assert from "node:assert/strict";

import {
  MAC_SIGN_IDENTITY_ENV_NAME,
  buildMacBuilderConfig,
  getMacPackageArtifactInfo,
  parseMacPackageTargetArg
} from "../scripts/package-mac.mjs";

test("parseMacPackageTargetArg defaults to dir", () => {
  assert.equal(parseMacPackageTargetArg(["node", "package-mac.mjs"]), "dir");
});

test("getMacPackageArtifactInfo builds dmg names without colliding with Windows artifacts", () => {
  assert.deepEqual(getMacPackageArtifactInfo("no-key", "dmg"), {
    target: "dmg",
    outputDirName: "release-dmg-no-key",
    artifactFileName: "ScratchDesktopCompanion-no-key.dmg",
    distributionFileName: "ScratchDesktopCompanion-mac.dmg",
    bundleFileName: "ScratchDesktopCompanion.app"
  });
});

test("getMacPackageArtifactInfo keeps with-key variants explicit", () => {
  assert.deepEqual(getMacPackageArtifactInfo("with-key", "dmg"), {
    target: "dmg",
    outputDirName: "release-dmg-with-key",
    artifactFileName: "ScratchDesktopCompanion-with-key.dmg",
    distributionFileName: "ScratchDesktopCompanion-with-key-mac.dmg",
    bundleFileName: "ScratchDesktopCompanion.app"
  });
});

test("buildMacBuilderConfig disables signing by default for internal macOS builds", () => {
  const config = buildMacBuilderConfig({
    appDir: "/tmp/scratchai/apps/desktop-companion",
    outputDir: "/tmp/scratchai/apps/desktop-companion/release-mac-no-key",
    target: "dir",
    env: {}
  });

  assert.equal(config.mac.identity, null);
  assert.equal(
    config.mac.icon,
    "/tmp/scratchai/apps/desktop-companion/buildResources/ScratchDesktop.icns"
  );
});

test("buildMacBuilderConfig allows explicit signing identity overrides", () => {
  const config = buildMacBuilderConfig({
    appDir: "/tmp/scratchai/apps/desktop-companion",
    outputDir: "/tmp/scratchai/apps/desktop-companion/release-dmg-with-key",
    target: "dmg",
    env: {
      [MAC_SIGN_IDENTITY_ENV_NAME]: "Apple Development: Example (ABCDE12345)"
    }
  });

  assert.equal(config.mac.identity, "Apple Development: Example (ABCDE12345)");
});
