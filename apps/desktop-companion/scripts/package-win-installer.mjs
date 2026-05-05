import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {build} from 'electron-builder';
import {copyFileWithRetry} from './copy-with-retry.mjs';
import {getWindowsDistributionArtifactInfo} from './package-artifact-layout.mjs';
import {getPackageVariantMeta, hasCliFlag, parsePackageVariantArg, runBuildForVariant} from './package-variant.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const iconPath = path.join(appDir, 'buildResources', 'ScratchDesktop.ico');
const variant = parsePackageVariantArg(process.argv);
const variantMeta = getPackageVariantMeta(variant);
const distributionInfo = getWindowsDistributionArtifactInfo(variant);
const outputDir = path.join(appDir, `release-installer${variantMeta.outputDirSuffix}`);
const installerFileName = `${variantMeta.artifactBaseName}-setup.exe`;
const rootInstallersDir = path.resolve(appDir, '..', '..', 'installers');
const rootInstallerPath = path.join(rootInstallersDir, distributionInfo.installerFileName);

if (!hasCliFlag(process.argv, '--skip-build')) {
    runBuildForVariant(appDir, variant);
}

await build({
    projectDir: appDir,
    targets: undefined,
    config: {
        appId: 'com.scratchai.desktopcompanion',
        productName: 'ScratchDesktopCompanion',
        compression: 'maximum',
        electronLanguages: ['zh-CN', 'en-US'],
        directories: {
            output: outputDir
        },
        files: [
            'dist/**/*',
            'node_modules/**/*',
            'package.json'
        ],
        extraMetadata: {
            main: 'dist/main.js'
        },
        asar: true,
        win: {
            icon: iconPath,
            target: [
                {
                    target: 'nsis',
                    arch: ['x64']
                }
            ]
        },
        nsis: {
            oneClick: false,
            perMachine: false,
            allowToChangeInstallationDirectory: true,
            installerIcon: iconPath,
            uninstallerIcon: iconPath,
            installerHeaderIcon: iconPath
        },
        artifactName: `${variantMeta.artifactBaseName}-setup.\${ext}`
    }
});

if (!hasCliFlag(process.argv, '--skip-installers-copy') && !hasCliFlag(process.argv, '--skip-root-copy')) {
    await mkdir(rootInstallersDir, {recursive: true});
    await copyFileWithRetry(path.join(outputDir, installerFileName), rootInstallerPath);
}

process.stdout.write(`Installer build (${variantMeta.displayName}) written to ${outputDir}\n`);
if (!hasCliFlag(process.argv, '--skip-installers-copy') && !hasCliFlag(process.argv, '--skip-root-copy')) {
    process.stdout.write(`Installer copied to root installers folder: ${rootInstallerPath}\n`);
}
