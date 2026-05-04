import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyFileWithRetry } from './copy-with-retry.mjs';
import {
  PACKAGED_KEY_MODE_ENV_NAME,
  getPackageVariantMeta,
  resolvePackagedDeepSeekConfig,
  runBuildForVariant
} from './package-variant.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const bundleRootDir = path.join(appDir, 'release-bundles');
const rootInstallersDir = path.resolve(appDir, '..', '..', 'installers');

function formatTimestampPart(value) {
  return String(value).padStart(2, '0');
}

function getBundleTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = formatTimestampPart(now.getMonth() + 1);
  const day = formatTimestampPart(now.getDate());
  const hour = formatTimestampPart(now.getHours());
  const minute = formatTimestampPart(now.getMinutes());
  const second = formatTimestampPart(now.getSeconds());
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function getArtifactBuildInfo(kind, variant) {
  const variantMeta = getPackageVariantMeta(variant);
  const outputDirName = kind === 'installer'
    ? `release-installer${variantMeta.outputDirSuffix}`
    : `release-single${variantMeta.outputDirSuffix}`;
  const artifactFileName = kind === 'installer'
    ? `${variantMeta.artifactBaseName}-setup.exe`
    : `${variantMeta.artifactBaseName}-portable.exe`;
  const bundleFileName = variant === 'no-key'
    ? (kind === 'installer' ? 'ScratchDesktopCompanion-setup.exe' : 'ScratchDesktopCompanion-portable.exe')
    : artifactFileName;
  const scriptFileName = kind === 'installer' ? 'package-win-installer.mjs' : 'package-win-single.mjs';

  return {
    kind,
    variant,
    artifactFileName,
    bundleFileName,
    outputDir: path.join(appDir, outputDirName),
    outputPath: path.join(appDir, outputDirName, artifactFileName),
    scriptPath: path.join(__dirname, scriptFileName)
  };
}

function ensureWithKeyVariantCanBuild(sourceConfig) {
  resolvePackagedDeepSeekConfig(sourceConfig, {
    ...process.env,
    [PACKAGED_KEY_MODE_ENV_NAME]: 'with-key'
  });
}

async function getSha256(filePath) {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

function getReleaseSummaryLines({generatedAt, bundleDir, artifacts}) {
  return [
    '# Scratch Desktop Companion Release Notes',
    '',
    `- Generated at: ${generatedAt}`,
    `- Bundle directory: \`${bundleDir}\``,
    `- Classroom flow: 选择 Scratch 软件 -> 打开已选 Scratch -> 填入教师 sb3 地址 -> 编写程序，学生跟着做`,
    '',
    '## Included artifacts',
    ...artifacts.map((artifact) => `- \`${artifact.bundleFileName}\` (${artifact.variant}, ${artifact.kind})`)
  ];
}

const sourceConfig = JSON.parse(
  await readFile(path.join(appDir, 'src', 'deepseek.config.json'), 'utf8')
);

ensureWithKeyVariantCanBuild(sourceConfig);

const bundleTimestamp = getBundleTimestamp();
const bundleDir = path.join(bundleRootDir, bundleTimestamp);

await mkdir(bundleDir, {recursive: true});

const buildPlan = [
  {kind: 'installer', variant: 'no-key'},
  {kind: 'portable', variant: 'no-key'},
  {kind: 'installer', variant: 'with-key'},
  {kind: 'portable', variant: 'with-key'}
];

const artifacts = [];

for (const variant of ['no-key', 'with-key']) {
  runBuildForVariant(appDir, variant);

  for (const kind of ['installer', 'portable']) {
    const buildInfo = getArtifactBuildInfo(kind, variant);
    const commandArgs = [buildInfo.scriptPath, `--variant=${variant}`, '--skip-build'];

    execFileSync(process.execPath, commandArgs, {
      cwd: appDir,
      stdio: 'inherit',
      env: process.env
    });

    const bundleArtifactPath = path.join(bundleDir, buildInfo.bundleFileName);
    await copyFileWithRetry(buildInfo.outputPath, bundleArtifactPath);
    const rootInstallerPath = path.join(rootInstallersDir, buildInfo.bundleFileName);
    const sha256 = await getSha256(bundleArtifactPath);

    artifacts.push({
      kind,
      variant,
      sourceFileName: buildInfo.artifactFileName,
      bundleFileName: buildInfo.bundleFileName,
      buildOutputDir: buildInfo.outputDir,
      bundlePath: bundleArtifactPath,
      rootInstallerPath,
      sha256
    });
  }
}

const generatedAt = new Date().toISOString();

await writeFile(
  path.join(bundleDir, 'manifest.json'),
  `${JSON.stringify(
    {
      generatedAt,
      bundleDir,
      rootInstallersDir,
      buildPlan,
      artifacts
    },
    null,
    2
  )}\n`
);

const sha256Lines = artifacts.map((artifact) => `${artifact.sha256} *${artifact.bundleFileName}`);
const releaseNotes = `${getReleaseSummaryLines({generatedAt, bundleDir, artifacts}).join('\n')}\n`;

await writeFile(path.join(bundleDir, 'SHA256SUMS.txt'), `${sha256Lines.join('\n')}\n`);
await writeFile(path.join(bundleDir, 'RELEASE-NOTES.md'), releaseNotes);
await writeFile(path.join(rootInstallersDir, 'SHA256SUMS.txt'), `${sha256Lines.join('\n')}\n`);
await writeFile(path.join(rootInstallersDir, 'RELEASE-NOTES.md'), releaseNotes);

process.stdout.write(`Bundle written to ${bundleDir}\n`);
process.stdout.write(`Latest distributables copied to ${rootInstallersDir}\n`);
