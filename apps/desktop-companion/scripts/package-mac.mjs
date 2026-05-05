import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "electron-builder";

import { copyFileWithRetry } from "./copy-with-retry.mjs";
import {
  getPackageVariantMeta,
  hasCliFlag,
  parsePackageVariantArg,
  runBuildForVariant
} from "./package-variant.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const thisFilePath = fileURLToPath(import.meta.url);
const appDir = path.resolve(__dirname, "..");
const rootInstallersDir = path.resolve(appDir, "..", "..", "installers");
const currentArch = process.arch === "arm64" ? "arm64" : "x64";

const VALID_MAC_PACKAGE_TARGETS = new Set(["dir", "dmg"]);
export const MAC_SIGN_IDENTITY_ENV_NAME = "SCRATCH_AI_MAC_SIGN_IDENTITY";

export function parseMacPackageTargetArg(argv, defaultTarget = "dir") {
  const rawArg = argv.find((arg) => arg.startsWith("--target="));
  const target = rawArg ? rawArg.slice("--target=".length).trim() : defaultTarget;

  if (!VALID_MAC_PACKAGE_TARGETS.has(target)) {
    throw new Error(`Unsupported macOS package target "${target}". Expected one of: dir, dmg.`);
  }

  return target;
}

export function getMacPackageArtifactInfo(variant, target) {
  const variantMeta = getPackageVariantMeta(variant);
  if (target === "dir") {
    return {
      target,
      outputDirName: `release-mac${variantMeta.outputDirSuffix}`,
      bundleFileName: "ScratchDesktopCompanion.app"
    };
  }

  return {
    target,
    outputDirName: `release-dmg${variantMeta.outputDirSuffix}`,
    artifactFileName: `${variantMeta.artifactBaseName}.dmg`,
    distributionFileName:
      variant === "no-key"
        ? "ScratchDesktopCompanion-mac.dmg"
        : `${variantMeta.artifactBaseName}-mac.dmg`,
    bundleFileName: "ScratchDesktopCompanion.app"
  };
}

export function buildMacBuilderConfig({
  appDir,
  outputDir,
  target,
  env = process.env,
  arch = currentArch
}) {
  const signingIdentity = typeof env[MAC_SIGN_IDENTITY_ENV_NAME] === "string"
    ? env[MAC_SIGN_IDENTITY_ENV_NAME].trim()
    : "";
  const config = {
    appId: "com.scratchai.desktopcompanion",
    productName: "ScratchDesktopCompanion",
    compression: "maximum",
    electronLanguages: ["zh-CN", "en-US"],
    directories: {
      output: outputDir
    },
    files: ["dist/**/*", "node_modules/**/*", "package.json"],
    extraMetadata: {
      main: "dist/main.js"
    },
    asar: true,
    mac: {
      category: "public.app-category.education",
      icon: path.join(appDir, "buildResources", "ScratchDesktop.icns"),
      identity: signingIdentity || null,
      target: [
        {
          target,
          arch: [arch]
        }
      ]
    }
  };

  return config;
}

async function main() {
  const target = parseMacPackageTargetArg(process.argv);
  const variant = parsePackageVariantArg(process.argv);
  const variantMeta = getPackageVariantMeta(variant);
  const artifactInfo = getMacPackageArtifactInfo(variant, target);
  const outputDir = path.join(appDir, artifactInfo.outputDirName);

  if (!hasCliFlag(process.argv, "--skip-build")) {
    runBuildForVariant(appDir, variant);
  }

  const config = buildMacBuilderConfig({
    appDir,
    outputDir,
    target,
    env: process.env
  });

  if (target === "dmg") {
    config.mac.artifactName = `${variantMeta.artifactBaseName}.\${ext}`;
  }

  await build({
    projectDir: appDir,
    targets: undefined,
    config
  });

  if (target === "dmg" && !hasCliFlag(process.argv, "--skip-installers-copy")) {
    await mkdir(rootInstallersDir, { recursive: true });
    await copyFileWithRetry(
      path.join(outputDir, artifactInfo.artifactFileName),
      path.join(rootInstallersDir, artifactInfo.distributionFileName)
    );
  }

  process.stdout.write(`macOS ${target} build (${variantMeta.displayName}) written to ${outputDir}\n`);
  if (target === "dmg" && !hasCliFlag(process.argv, "--skip-installers-copy")) {
    process.stdout.write(
      `macOS dmg copied to root installers folder: ${path.join(rootInstallersDir, artifactInfo.distributionFileName)}\n`
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === thisFilePath) {
  await main();
}
