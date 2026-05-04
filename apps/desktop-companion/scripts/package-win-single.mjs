import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {build} from 'electron-builder';
import {copyFileWithRetry} from './copy-with-retry.mjs';
import {getPackageVariantMeta, hasCliFlag, parsePackageVariantArg, runBuildForVariant} from './package-variant.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const iconPath = path.join(appDir, 'buildResources', 'ScratchDesktop.ico');
const variant = parsePackageVariantArg(process.argv);
const variantMeta = getPackageVariantMeta(variant);
const outputDir = path.join(appDir, `release-single${variantMeta.outputDirSuffix}`);
const portableFileName = `${variantMeta.artifactBaseName}-portable.exe`;
const distributionPortableFileName = variant === 'no-key'
    ? 'ScratchDesktopCompanion-portable.exe'
    : portableFileName;
const rootInstallersDir = path.resolve(appDir, '..', '..', 'installers');
const rootPortablePath = path.join(rootInstallersDir, distributionPortableFileName);

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
                    target: 'portable',
                    arch: ['x64']
                }
            ]
        },
        artifactName: `${variantMeta.artifactBaseName}-portable.\${ext}`
    }
});

if (!hasCliFlag(process.argv, '--skip-installers-copy')) {
    await mkdir(rootInstallersDir, {recursive: true});
    await copyFileWithRetry(path.join(outputDir, portableFileName), rootPortablePath);
}

process.stdout.write(`Portable build (${variantMeta.displayName}) written to ${outputDir}\n`);
if (!hasCliFlag(process.argv, '--skip-installers-copy')) {
    process.stdout.write(`Portable copied to root installers folder: ${rootPortablePath}\n`);
}
